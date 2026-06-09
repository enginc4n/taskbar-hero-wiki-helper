import { formatStatLabel } from '@/core/engine/stats';
import type { RuneNode } from '@/core/types';

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

export function formatRuneBonusAmount(value: number, isPercent: boolean): string {
  if (value < 0) return `${value}${isPercent ? '%' : ''}`;
  return `+${value}${isPercent ? '%' : ''}`;
}

/** Benefit with numeric bonus (e.g. +3 Attack Damage). Level 0 shows the level-1 increment. */
export function runeBenefitDescription(rune: RuneNode, level: number): string {
  const label = runeBenefitLabel(rune);
  const { total, isPercent } = runeBonusTotalAtLevel(rune, level > 0 ? level : 1);
  return `${formatRuneBonusAmount(total, isPercent)} ${label}`;
}

export interface HeroCombatRuneGroup {
  stat: string;
  runes: RuneNode[];
}

/** Combat runes grouped by stat type (preserves HERO_COMBAT_RUNE_STATS order). */
export function heroCombatRuneGroups(runes: RuneNode[]): HeroCombatRuneGroup[] {
  const all = heroCombatRunesForPanel(runes);
  return HERO_COMBAT_RUNE_STATS.map((stat) => ({
    stat,
    runes: all.filter((rune) => rune.stat === stat),
  })).filter((group) => group.runes.length > 0);
}

/** All account runes that affect hero combat stats (full tree, not one-per-stat). */
export function heroCombatRunesForPanel(runes: RuneNode[]): RuneNode[] {
  const order = new Map<string, number>(
    HERO_COMBAT_RUNE_STATS.map((stat, index) => [stat, index]),
  );

  return runes
    .filter((rune) => isHeroCombatRune(rune) && rune.stat)
    .sort((a, b) => {
      const statCmp = (order.get(a.stat!) ?? 99) - (order.get(b.stat!) ?? 99);
      return statCmp !== 0 ? statCmp : a.key - b.key;
    });
}
