import type { EnrichedHero, HeroSaveData, HeroTreeGroup, PlayerSaveData } from '../types';
import {
  getPassiveLevel,
  heroLevelFromSave,
  isAttributeGroupUnlocked,
  totalInvestedSkillPoints,
} from './build-state';

/** Max active skills that can hold skill points at the same time (in-game loadout cap). */
export const MAX_INVESTED_ACTIVE_SKILLS = 2;

/** Skill point budget for a prepared-build milestone tab (Lv.11 → 11 SP, etc.). */
export function milestoneSkillBudget(milestoneLevel: number): number {
  return milestoneLevel;
}

export interface ChapterNodeSlot {
  key: number;
  chapterIndex: number;
  nodeIndex: number;
  maxLevel: number;
}

export function chapterSkillNodes(group: HeroTreeGroup, chapterIndex: number): ChapterNodeSlot[] {
  const passives = group.nodes.filter((n) => n.kind === 'passive' && n.stat && n.stat !== 'NONE');
  const actives = group.nodes.filter((n) => n.kind === 'active');
  return [...passives, ...actives].map((node, nodeIndex) => ({
    key: node.key,
    chapterIndex,
    nodeIndex,
    maxLevel: node.maxLevel ?? 1,
  }));
}

function findChapterSlot(
  hero: EnrichedHero,
  key: number,
): { slot: ChapterNodeSlot; chapterNodes: ChapterNodeSlot[] } | undefined {
  for (let ci = 0; ci < hero.tree.length; ci++) {
    const chapterNodes = chapterSkillNodes(hero.tree[ci], ci);
    const slot = chapterNodes.find((s) => s.key === key);
    if (slot) return { slot, chapterNodes };
  }
  return undefined;
}

export function isActiveSkillKey(hero: EnrichedHero, key: number): boolean {
  for (const group of hero.tree) {
    const node = group.nodes.find((n) => n.key === key);
    if (node) return node.kind === 'active';
  }
  return false;
}

/** Active skills with at least one invested point. */
export function investedActiveSkillCount(save: PlayerSaveData, hero: EnrichedHero): number {
  let count = 0;
  for (const group of hero.tree) {
    for (const node of group.nodes) {
      if (node.kind === 'active' && getPassiveLevel(save, node.key) > 0) count++;
    }
  }
  return count;
}

/**
 * First point on a new active requires a free loadout slot (max 2 actives invested).
 * Actives that already have points can still be leveled up.
 */
export function canAddActiveSkillPoint(
  save: PlayerSaveData,
  hero: EnrichedHero,
  key: number,
): boolean {
  if (!isActiveSkillKey(hero, key)) return true;
  if (getPassiveLevel(save, key) > 0) return true;
  return investedActiveSkillCount(save, hero) < MAX_INVESTED_ACTIVE_SKILLS;
}

/**
 * Author skill investment: milestone budget, chapter unlocked, and per-skill max only.
 * Within an unlocked chapter, points can go to any passive or active freely.
 */
export function canIncrementSkillAtKey(
  key: number,
  save: PlayerSaveData,
  hero: EnrichedHero,
  heroData: HeroSaveData,
  budget: number,
): boolean {
  if (totalInvestedSkillPoints(save) >= budget) return false;

  const found = findChapterSlot(hero, key);
  if (!found) return false;

  const { slot } = found;
  const cur = getPassiveLevel(save, slot.key);
  if (cur >= slot.maxLevel) return false;

  if (!canAddActiveSkillPoint(save, hero, key)) return false;

  return isAttributeGroupUnlocked(
    slot.chapterIndex,
    hero.tree,
    heroLevelFromSave(heroData),
    save,
    heroData,
  );
}
