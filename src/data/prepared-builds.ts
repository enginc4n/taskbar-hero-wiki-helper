import {
  clonePlayerSave,
  createEmptySave,
  equipItem,
  getSelectedHero,
  partIndex,
  setPassiveLevel,
  setRuneLevel,
  syncAttributeGroupUnlocks,
} from '../simulator/build-state';
import type { EnchantEntry, EnrichedHero, EnrichedItem, HeroPart, PlayerSaveData } from '../types';

export const PREPARED_LEVEL_STEPS = [11, 21, 31, 41, 51, 61, 71, 81, 91, 101] as const;

/** Map legacy milestone levels (1, 10, 20, …) onto current steps. */
export function legacyMilestoneLevel(level: number): PreparedLevelStep {
  if ((PREPARED_LEVEL_STEPS as readonly number[]).includes(level)) {
    return level as PreparedLevelStep;
  }
  if (level <= 1) return PREPARED_LEVEL_STEPS[0];
  const mapped = Math.min(
    PREPARED_LEVEL_STEPS[PREPARED_LEVEL_STEPS.length - 1],
    Math.floor((level - 1) / 10) * 10 + 11,
  );
  return mapped as PreparedLevelStep;
}

export type PreparedLevelStep = (typeof PREPARED_LEVEL_STEPS)[number];

export interface PreparedBuildManifestEntry {
  id: string;
  file: string;
  name: string;
  heroKey: number;
  heroClass?: string;
  description?: string;
}

export interface PreparedBuildManifest {
  builds: PreparedBuildManifestEntry[];
}

export interface PreparedPassiveEntry {
  key: number;
  level: number;
}

export interface PreparedRuneEntry {
  key: number;
  level: number;
}

export interface PreparedGearEntry {
  part: HeroPart;
  itemKey: number;
  enchants?: EnchantEntry[];
}

export interface PreparedBuildMilestone {
  level: PreparedLevelStep;
  heroLevel: number;
  passives?: PreparedPassiveEntry[];
  runes?: PreparedRuneEntry[];
  gear?: PreparedGearEntry[];
}

export interface PreparedBuild {
  id: string;
  name: string;
  description?: string;
  heroKey: number;
  milestones: PreparedBuildMilestone[];
}

function preparedBuildsBase(): string {
  if (typeof window === 'undefined') {
    return '/prepared-builds';
  }
  return new URL(`${import.meta.env.BASE_URL}prepared-builds`, window.location.origin).pathname.replace(
    /\/$/,
    '',
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

export async function loadPreparedBuildIndex(): Promise<PreparedBuildManifestEntry[]> {
  const manifest = await fetchJson<PreparedBuildManifest>(`${preparedBuildsBase()}/index.json`);
  return manifest.builds ?? [];
}

export async function loadPreparedBuild(entry: PreparedBuildManifestEntry): Promise<PreparedBuild> {
  return fetchJson<PreparedBuild>(`${preparedBuildsBase()}/${entry.file}`);
}

export function milestoneForStep(
  build: PreparedBuild,
  stepIndex: number,
): PreparedBuildMilestone | undefined {
  const level = PREPARED_LEVEL_STEPS[stepIndex];
  if (level == null) return undefined;

  const exact = build.milestones.find((m) => legacyMilestoneLevel(m.level) === level);
  if (exact) return exact;

  let best: PreparedBuildMilestone | undefined;
  let bestStepIndex = -1;
  for (const milestone of build.milestones) {
    const mapped = legacyMilestoneLevel(milestone.level);
    const mappedIndex = PREPARED_LEVEL_STEPS.indexOf(mapped);
    if (mappedIndex >= 0 && mappedIndex <= stepIndex && mappedIndex > bestStepIndex) {
      best = milestone;
      bestStepIndex = mappedIndex;
    }
  }
  return best;
}

/** Normalize legacy milestone files (levels 1/10/20, heroLevel drift) after load. */
export function normalizePreparedBuild(build: PreparedBuild): PreparedBuild {
  return {
    ...build,
    milestones: build.milestones.map((milestone) => {
      const step = legacyMilestoneLevel(milestone.level);
      return {
        ...milestone,
        level: step,
        heroLevel: Math.max(milestone.heroLevel ?? 0, step),
      };
    }),
  };
}

function findPreparedItem(
  itemKey: number,
  itemsByKey: Map<number, EnrichedItem>,
  allItems: EnrichedItem[],
): EnrichedItem | undefined {
  const key = Number(itemKey);
  if (!Number.isFinite(key)) return undefined;
  return itemsByKey.get(key) ?? allItems.find((item) => Number(item.key) === key);
}

/** Apply a prepared milestone onto a fresh hero save (read-only preview). */
export function applyPreparedMilestone(
  save: PlayerSaveData,
  heroDef: EnrichedHero,
  milestone: PreparedBuildMilestone,
  allItems: EnrichedItem[],
  itemsByKey: Map<number, EnrichedItem>,
  previewHeroLevel?: number,
): void {
  const heroKey = heroDef.key;
  const fresh = createEmptySave(heroKey);
  save.heroSaveDatas = clonePlayerSave(fresh).heroSaveDatas;
  save.itemSaveDatas = [];
  save.RuneSaveData = [];
  save.attributeSaveDatas = [];

  const hero = getSelectedHero(save, heroKey)!;
  const heroLevel = previewHeroLevel ?? milestone.heroLevel;
  hero.Level = heroLevel;
  hero.HeroLevel = heroLevel;
  hero.equippedItemIds = new Array(hero.equippedItemIds.length).fill(null);

  for (const row of milestone.passives ?? []) {
    setPassiveLevel(save, row.key, row.level, 999);
  }
  for (const row of milestone.runes ?? []) {
    setRuneLevel(save, row.key, row.level, 999);
  }
  for (const row of milestone.gear ?? []) {
    const item = findPreparedItem(row.itemKey, itemsByKey, allItems);
    if (!item) continue;
    equipItem(save, hero, row.part, item, itemsByKey);
    if (row.enchants?.length) {
      const uid = hero.equippedItemIds[partIndex(row.part)];
      const inst = save.itemSaveDatas.find((i) => String(i.UniqueId) === String(uid));
      if (inst) inst.EnchantData = structuredClone(row.enchants);
    }
  }

  syncAttributeGroupUnlocks(save, hero, heroDef);
}
