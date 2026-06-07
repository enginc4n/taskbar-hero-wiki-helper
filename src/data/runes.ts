import { formatStatLabel } from '../engine/stats';
import type { RuneNode } from '../types';

/** Rune stat keys that affect hero combat stats (see engine/stats.ts RUNE_STAT_MAP). */
export const HERO_COMBAT_RUNE_STATS = [
  'AllHeroAttackDamage',
  'AllHeroAttackDamagePercent',
  'AllHeroAttackSpeed',
  'AllHeroArmor',
  'AllHeroArmorPercent',
  'AllHeroMoveSpeed',
] as const;

const HERO_RUNE_STAT_SET = new Set<string>(HERO_COMBAT_RUNE_STATS);

export function isHeroCombatRune(rune: RuneNode): boolean {
  return !!rune.stat && HERO_RUNE_STAT_SET.has(rune.stat);
}

function parseRuneValue(val: string | number): { num: number; isPercent: boolean } {
  if (typeof val === 'number') return { num: val, isPercent: false };
  const s = String(val).trim();
  const isPercent = s.includes('%');
  const num = parseFloat(s.replace(/[^0-9.-]/g, '')) || 0;
  return { num, isPercent };
}

export function runeBonusTotalAtLevel(
  rune: RuneNode,
  level: number,
): { total: number; isPercent: boolean } {
  let total = 0;
  let isPercent = false;
  const seen = new Set<number>();
  for (const row of rune.levels ?? []) {
    if (row.level <= level && !seen.has(row.level)) {
      seen.add(row.level);
      const parsed = parseRuneValue(row.value);
      total += parsed.num;
      if (parsed.isPercent) isPercent = true;
    }
  }
  return { total, isPercent };
}

export interface RuneBonusSummary {
  stat: string;
  label: string;
  glyph: string;
  total: number;
  isPercent: boolean;
  level: number;
  maxLevel: number;
}

const RUNE_STAT_DISPLAY: Record<string, { label: string; glyph: string }> = {
  AllHeroAttackDamage: { label: 'Attack Damage', glyph: '⚔' },
  AllHeroAttackDamagePercent: { label: 'Attack Damage', glyph: '⚔' },
  AllHeroArmor: { label: 'Armor', glyph: '🛡' },
  AllHeroArmorPercent: { label: 'Armor', glyph: '🛡' },
  AllHeroAttackSpeed: { label: 'Attack Speed', glyph: '⚡' },
  AllHeroMoveSpeed: { label: 'Movement Speed', glyph: '👟' },
};

export function heroRuneBonusSummaries(
  runes: RuneNode[],
  getLevel: (key: number) => number,
): RuneBonusSummary[] {
  return heroCombatRunesForPanel(runes).map((rune) => {
    const level = getLevel(rune.key);
    const { total, isPercent } = runeBonusTotalAtLevel(rune, level);
    const disp = RUNE_STAT_DISPLAY[rune.stat ?? ''] ?? {
      label: rune.effect ?? rune.stat ?? 'Bonus',
      glyph: '◆',
    };
    return {
      stat: rune.stat ?? '',
      label: disp.label,
      glyph: disp.glyph,
      total,
      isPercent,
      level,
      maxLevel: rune.maxLevel ?? 1,
    };
  });
}

/** Human-readable benefit label for a rune (e.g. Attack Damage, Attack Speed). */
export function runeBenefitLabel(rune: RuneNode): string {
  if (rune.stat && RUNE_STAT_DISPLAY[rune.stat]) {
    return RUNE_STAT_DISPLAY[rune.stat].label;
  }
  if (rune.stat) return formatStatLabel(rune.stat);
  if (typeof rune.effect === 'string' && rune.effect.trim()) return rune.effect;
  return rune.name;
}

/** One rune card per hero combat stat (lowest tree key wins). */
export function heroCombatRunesForPanel(runes: RuneNode[]): RuneNode[] {
  const order = new Map<string, number>(
    HERO_COMBAT_RUNE_STATS.map((stat, index) => [stat, index]),
  );
  const byStat = new Map<string, RuneNode>();

  for (const rune of runes) {
    if (!isHeroCombatRune(rune) || !rune.stat) continue;
    const current = byStat.get(rune.stat);
    if (!current || rune.key < current.key) byStat.set(rune.stat, rune);
  }

  return [...byStat.values()].sort(
    (a, b) =>
      (order.get(a.stat!) ?? 99) - (order.get(b.stat!) ?? 99),
  );
}
