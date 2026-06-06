import type {
  ComputedStats,
  HeroSaveData,
  ModType,
  PlayerSaveData,
  RefMaps,
  StatContribution,
  StatDelta,
} from '../types';
import { STAT_NAME_BY_TYPE } from '../types';

const STAT_FMT: Record<string, { scale: number; fmt: string }> = {
  AttackDamage: { scale: 1, fmt: 'int' },
  MaxHp: { scale: 1, fmt: 'int' },
  Armor: { scale: 1, fmt: 'int' },
  AttackSpeed: { scale: 100, fmt: 'spd' },
  CastSpeed: { scale: 100, fmt: 'spd' },
  MovementSpeed: { scale: 100, fmt: 'move' },
  CriticalChance: { scale: 1000, fmt: 'pct1' },
  CriticalDamage: { scale: 1000, fmt: 'pctI' },
  CooldownReduction: { scale: 1000, fmt: 'pct1' },
};

const STAT_BASE_OFFSET: Record<string, number> = {
  AreaOfEffect: 1000,
  IncreaseExpAmount: 1000,
  IncreaseGoldAmount: 1000,
};

const RUNE_STAT_MAP: Record<string, { stat: string; mod: ModType }> = {
  AllHeroAttackDamage: { stat: 'AttackDamage', mod: 'FLAT' },
  AllHeroAttackDamagePercent: { stat: 'AttackDamage', mod: 'ADDITIVE' },
  AllHeroArmor: { stat: 'Armor', mod: 'FLAT' },
  AllHeroArmorPercent: { stat: 'Armor', mod: 'ADDITIVE' },
  AllHeroAttackSpeed: { stat: 'AttackSpeed', mod: 'ADDITIVE' },
  AllHeroMoveSpeed: { stat: 'MovementSpeed', mod: 'ADDITIVE' },
};

const BASE_HERO_STATS: [string, string][] = [
  ['AttackDamage', 'AttackDamage'],
  ['AttackSpeed', 'AttackSpeed'],
  ['CriticalChance', 'CriticalChance'],
  ['CriticalDamage', 'CriticalDamage'],
  ['MaxHp', 'MaxHp'],
  ['Armor', 'Armor'],
  ['MovementSpeed', 'MovementSpeed'],
  ['CooldownReduction', 'CooldownReduction'],
  ['CastSpeed', 'CastSpeed'],
];

const TRACKED_STATS: (keyof ComputedStats)[] = [
  'AttackDamage',
  'AttackSpeed',
  'CriticalChance',
  'CriticalDamage',
  'MaxHp',
  'Armor',
  'MovementSpeed',
  'CooldownReduction',
  'CastSpeed',
];

function statScale(stat: string): number {
  return STAT_FMT[stat]?.scale ?? 1;
}

function runeLevelValue(node: { levels?: { level: number; value: number }[] }, level: number): number {
  if (!node.levels) return 0;
  const seen = new Set<number>();
  let total = 0;
  for (const row of node.levels) {
    if (row.level <= level && !seen.has(row.level)) {
      seen.add(row.level);
      total += row.value ?? 0;
    }
  }
  return total;
}

function normalizeMod(mod: unknown): ModType {
  if (mod === 'ADDITIVE' || mod === 1) return 'ADDITIVE';
  if (mod === 'MULTIPLICATIVE' || mod === 2) return 'MULTIPLICATIVE';
  return 'FLAT';
}

export function collectContributions(
  hero: HeroSaveData,
  player: PlayerSaveData,
  refs: RefMaps,
): StatContribution[] {
  const out: StatContribution[] = [];
  const heroDef = refs.heroByKey.get(hero.heroKey);

  if (heroDef) {
    for (const [stat, field] of BASE_HERO_STATS) {
      out.push({
        stat,
        mod: 'FLAT',
        raw: (heroDef as unknown as Record<string, number>)[field] ?? 0,
        src: 'base',
      });
    }
  }

  const attrLevels = new Map((player.attributeSaveDatas ?? []).map((a) => [a.Key, a.Level]));
  for (const attr of heroDef?.attributes ?? []) {
    if (attr.type !== 'PASSIVESKILL') continue;
    const level = attrLevels.get(attr.key) ?? 0;
    if (level <= 0) continue;
    const passive = refs.passiveByKey.get(attr.key);
    if (!passive || passive.STATTYPE === 'NONE') continue;
    out.push({
      stat: passive.STATTYPE,
      mod: normalizeMod(passive.MODTYPE),
      raw: (passive.Value ?? 0) * level,
      src: 'attr',
    });
  }

  for (const rune of player.RuneSaveData ?? []) {
    if (rune.Level <= 0) continue;
    const node = refs.runeNodeByKey.get(rune.RuneKey);
    const mapped = node?.stat ? RUNE_STAT_MAP[node.stat] : undefined;
    if (mapped && node) {
      out.push({
        stat: mapped.stat,
        mod: mapped.mod,
        raw: runeLevelValue(node, rune.Level),
        src: 'rune',
      });
    }
  }

  if (refs.petByKey && refs.petStatsByKey) {
    for (const pet of player.PetSaveData ?? []) {
      if (!pet.IsUnlock) continue;
      const def = refs.petByKey.get(pet.PetKey);
      const rows = refs.petStatsByKey.get(def?.StatDataKey ?? pet.PetKey) ?? [];
      for (const row of rows) {
        if (!row.STATTYPE || row.STATTYPE === 'NONE') continue;
        out.push({
          stat: row.STATTYPE,
          mod: normalizeMod(row.MODTYPE),
          raw: row.Value ?? 0,
          src: 'pet',
        });
      }
    }
  }

  const itemsById = new Map(player.itemSaveDatas.map((i) => [String(i.UniqueId), i]));
  for (const uid of hero.equippedItemIds) {
    if (!uid) continue;
    const inst = itemsById.get(String(uid));
    if (!inst) continue;

    const itemDef = refs.itemById.get(inst.ItemKey);
    const detail =
      refs.itemDetailById.get(inst.ItemKey) ?? refs.itemDetailById.get(String(inst.ItemKey));
    const stats = detail?.stats;
    const gearType = itemDef?.gear ? refs.gearTypeByName.get(itemDef.gear) : undefined;

    if (stats && gearType) {
      if (gearType.BaseStat1_STATTYPE && gearType.BaseStat1_STATTYPE !== 'NONE') {
        out.push({
          stat: gearType.BaseStat1_STATTYPE,
          mod: normalizeMod(gearType.BaseStat1_MODTYPE),
          raw: stats.BaseStat1_Value ?? 0,
          src: 'gear',
        });
      }
      if (gearType.BaseStat2_STATTYPE && gearType.BaseStat2_STATTYPE !== 'NONE') {
        out.push({
          stat: gearType.BaseStat2_STATTYPE,
          mod: normalizeMod(gearType.BaseStat2_MODTYPE),
          raw: stats.BaseStat2_Value ?? 0,
          src: 'gear',
        });
      }
    }

    if (stats) {
      for (const n of [1, 2, 3] as const) {
        const statType = stats[`InherentStat${n}_STATTYPE`];
        if (!statType || statType === 'NONE') continue;
        out.push({
          stat: statType,
          mod: normalizeMod(stats[`InherentStat${n}_MODTYPE`]),
          raw: stats[`InherentStat${n}_Value`] ?? 0,
          src: 'gear',
        });
      }
    }

    for (const ench of inst.EnchantData ?? []) {
      if (!ench.StatType) continue;
      const stat = STAT_NAME_BY_TYPE[ench.StatType];
      if (!stat) continue;
      out.push({
        stat,
        mod: ench.ModType === 1 ? 'ADDITIVE' : ench.ModType === 2 ? 'MULTIPLICATIVE' : 'FLAT',
        raw: ench.Value ?? 0,
        src: 'enchant',
      });
    }
  }

  return out;
}

export function computeFinal(stat: string, contributions: StatContribution[]): number {
  const scale = statScale(stat);
  let base = (STAT_BASE_OFFSET[stat] ?? 0) / scale;
  let additive = 0;
  let multiplicative = 1;

  for (const c of contributions) {
    if (c.stat !== stat) continue;
    if (c.mod === 'ADDITIVE') additive += c.raw / 1000;
    else if (c.mod === 'MULTIPLICATIVE') multiplicative *= 1 + c.raw / 1000;
    else base += c.raw / scale;
  }

  return (base + additive * base) * multiplicative;
}

export function computeAllStats(
  hero: HeroSaveData,
  player: PlayerSaveData,
  refs: RefMaps,
): ComputedStats {
  const contributions = collectContributions(hero, player, refs);
  const stats = {} as ComputedStats;
  for (const name of TRACKED_STATS) {
    stats[name] = computeFinal(name, contributions);
  }
  return stats;
}

export function computeBasicDps(stats: Pick<ComputedStats, 'AttackDamage' | 'AttackSpeed' | 'CriticalChance' | 'CriticalDamage'>): number {
  return (
    stats.AttackDamage *
    stats.AttackSpeed *
    (1 + stats.CriticalChance * (stats.CriticalDamage - 1))
  );
}

export function compareStats(baseline: ComputedStats, current: ComputedStats): StatDelta[] {
  return TRACKED_STATS.map((name) => {
    const b = baseline[name];
    const c = current[name];
    return {
      name,
      baseline: b,
      current: c,
      delta: c - b,
      deltaPct: b === 0 ? (c === 0 ? 0 : 100) : ((c / b) - 1) * 100,
    };
  });
}

export function formatStatValue(stat: string, value: number): string {
  const fmt = STAT_FMT[stat]?.fmt ?? 'int';
  switch (fmt) {
    case 'spd':
      return value.toFixed(2);
    case 'pct1':
      return `${(value * 100).toFixed(1)}%`;
    case 'pctI':
      return `${Math.round(value * 100)}%`;
    default:
      return Math.round(value).toLocaleString();
  }
}

export function formatDelta(delta: StatDelta): string {
  const sign = delta.delta >= 0 ? '+' : '';
  const pct = Number.isFinite(delta.deltaPct) ? ` (${sign}${delta.deltaPct.toFixed(1)}%)` : '';
  return `${sign}${formatStatValue(delta.name, Math.abs(delta.delta))}${pct}`;
}
