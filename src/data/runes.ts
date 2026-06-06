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
