import {
  clonePlayerSave,
  createEmptySave,
  equipItem,
  getSelectedHero,
  setPassiveLevel,
  setRuneLevel,
  syncAttributeGroupUnlocks,
} from '../simulator/build-state';
import type { EnrichedHero, EnrichedItem, HeroPart, PlayerSaveData } from '../types';

export const PREPARED_LEVEL_STEPS = [1, 10, 20, 30, 40, 50, 60, 70] as const;

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
  return build.milestones.find((m) => m.level === level);
}

/** Apply a prepared milestone onto a fresh hero save (read-only preview). */
export function applyPreparedMilestone(
  save: PlayerSaveData,
  heroDef: EnrichedHero,
  milestone: PreparedBuildMilestone,
  allItems: EnrichedItem[],
  itemsByKey: Map<number, EnrichedItem>,
): void {
  const heroKey = heroDef.key;
  const fresh = createEmptySave(heroKey);
  save.heroSaveDatas = clonePlayerSave(fresh).heroSaveDatas;
  save.itemSaveDatas = [];
  save.RuneSaveData = [];
  save.attributeSaveDatas = [];

  const hero = getSelectedHero(save, heroKey)!;
  hero.Level = milestone.heroLevel;
  hero.HeroLevel = milestone.heroLevel;
  hero.equippedItemIds = new Array(hero.equippedItemIds.length).fill(null);

  for (const row of milestone.passives ?? []) {
    setPassiveLevel(save, row.key, row.level, 999);
  }
  for (const row of milestone.runes ?? []) {
    setRuneLevel(save, row.key, row.level, 999);
  }
  for (const row of milestone.gear ?? []) {
    const item =
      itemsByKey.get(row.itemKey) ?? allItems.find((i) => i.key === row.itemKey);
    if (item) equipItem(save, hero, row.part, item, itemsByKey);
  }

  syncAttributeGroupUnlocks(save, hero, heroDef);
}
