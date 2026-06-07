import type { EnrichedHero, HeroSaveData, HeroTreeGroup, PlayerSaveData } from '../types';
import {
  getPassiveLevel,
  heroLevelFromSave,
  isAttributeGroupUnlocked,
  totalInvestedSkillPoints,
} from './build-state';

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

export function heroChapterSkillNodes(hero: EnrichedHero): ChapterNodeSlot[] {
  return hero.tree.flatMap((group, chapterIndex) => chapterSkillNodes(group, chapterIndex));
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

function canIncrementSlotAtCounts(
  slot: ChapterNodeSlot,
  chapterNodes: ChapterNodeSlot[],
  counts: Map<number, number>,
): boolean {
  const cur = counts.get(slot.key) ?? 0;
  if (cur >= slot.maxLevel) return false;
  // Any skill can receive its first point once the chapter is unlocked.
  if (cur === 0) return true;
  if (slot.nodeIndex === 0) return true;
  const prev = chapterNodes[slot.nodeIndex - 1];
  const prevLv = counts.get(prev.key) ?? 0;
  return prevLv > cur || prevLv >= prev.maxLevel;
}

/**
 * Within-chapter investment order:
 * - First point on any skill in the chapter is allowed.
 * - Further points on later skills require the previous skill to be ahead or maxed.
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

  const { slot, chapterNodes } = found;
  const unlocked = isAttributeGroupUnlocked(
    slot.chapterIndex,
    hero.tree,
    heroLevelFromSave(heroData),
    save,
    heroData,
  );
  if (!unlocked) return false;

  const counts = new Map<number, number>();
  for (const s of chapterNodes) counts.set(s.key, getPassiveLevel(save, s.key));
  return canIncrementSlotAtCounts(slot, chapterNodes, counts);
}

/** Decrement only removes the most recently invested point (LIFO). */
export function canDecrementSkillAtKey(key: number, history: number[]): boolean {
  return history.length > 0 && history[history.length - 1] === key;
}

export function pushSkillInvest(history: number[], key: number): number[] {
  return [...history, key];
}

export function popSkillInvest(history: number[]): number[] {
  return history.slice(0, -1);
}

/** Rebuild investment history from passive levels for LIFO decrement. */
export function reconstructInvestHistory(save: PlayerSaveData, hero: EnrichedHero): number[] {
  const targets = new Map<number, number>();
  let totalTarget = 0;
  for (const slot of heroChapterSkillNodes(hero)) {
    const lv = getPassiveLevel(save, slot.key);
    if (lv > 0) {
      targets.set(slot.key, lv);
      totalTarget += lv;
    }
  }

  const history: number[] = [];
  const counts = (): Map<number, number> => {
    const m = new Map<number, number>();
    for (const k of history) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };

  let guard = 0;
  while (history.length < totalTarget && guard++ < totalTarget * hero.tree.length * 20) {
    let pushed = false;
    for (let ci = 0; ci < hero.tree.length; ci++) {
      const chapterNodes = chapterSkillNodes(hero.tree[ci], ci);
      for (const slot of chapterNodes) {
        const target = targets.get(slot.key) ?? 0;
        const cur = counts().get(slot.key) ?? 0;
        if (cur >= target) continue;
        if (!canIncrementSlotAtCounts(slot, chapterNodes, counts())) continue;
        history.push(slot.key);
        pushed = true;
        break;
      }
      if (pushed) break;
    }
    if (!pushed) break;
  }
  return history;
}
