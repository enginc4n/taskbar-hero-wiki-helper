import {
  getPassiveLevel,
  getRuneLevel,
  heroLevelFromSave,
  partIndex,
} from '../simulator/build-state';
import type {
  PreparedBuild,
  PreparedBuildManifestEntry,
  PreparedBuildMilestone,
  PreparedGearEntry,
  PreparedLevelStep,
} from './prepared-builds';
import type { HeroPart, PlayerSaveData } from '../types';
import { HERO_PARTS } from '../types';

export { type PreparedBuild, type PreparedBuildManifestEntry } from './prepared-builds';

export function milestoneFromWorking(
  save: PlayerSaveData,
  heroKey: number,
  level: PreparedLevelStep,
): PreparedBuildMilestone {
  const hero = save.heroSaveDatas.find((h) => h.heroKey === heroKey);
  const passives =
    save.attributeSaveDatas
      ?.filter((row) => Number(row.Level) > 0)
      .map((row) => ({ key: Number(row.Key), level: Number(row.Level) })) ?? [];

  const runes =
    save.RuneSaveData?.filter((row) => row.Level > 0).map((row) => ({
      key: row.RuneKey,
      level: row.Level,
    })) ?? [];

  const gear: PreparedGearEntry[] = [];
  if (hero) {
    for (const part of HERO_PARTS) {
      const uid = hero.equippedItemIds[partIndex(part)];
      if (!uid) continue;
      const inst = save.itemSaveDatas.find((i) => String(i.UniqueId) === String(uid));
      if (inst) gear.push({ part: part as HeroPart, itemKey: inst.ItemKey });
    }
  }

  return {
    level,
    heroLevel: hero ? heroLevelFromSave(hero) : level,
    passives: passives.length ? passives : undefined,
    runes: runes.length ? runes : undefined,
    gear: gear.length ? gear : undefined,
  };
}

export function slugifyBuildId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'prepared-build';
}

export function manifestEntryFromBuild(build: PreparedBuild): PreparedBuildManifestEntry {
  return {
    id: build.id,
    file: `${build.id}.json`,
    name: build.name,
    heroKey: build.heroKey,
    heroClass: undefined,
    description: build.description,
  };
}

export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Strip empty optional arrays for cleaner hand-edited JSON. */
export function normalizeMilestone(m: PreparedBuildMilestone): PreparedBuildMilestone {
  const out: PreparedBuildMilestone = {
    level: m.level,
    heroLevel: m.heroLevel,
  };
  if (m.passives?.length) out.passives = m.passives;
  if (m.runes?.length) out.runes = m.runes;
  if (m.gear?.length) out.gear = m.gear;
  return out;
}

export function passiveKeysInSave(save: PlayerSaveData): number[] {
  return (save.attributeSaveDatas ?? [])
    .filter((row) => Number(row.Level) > 0)
    .map((row) => Number(row.Key));
}

export function copyMilestone(m: PreparedBuildMilestone): PreparedBuildMilestone {
  return JSON.parse(JSON.stringify(m)) as PreparedBuildMilestone;
}

export function mergeMilestoneIntoSave(
  save: PlayerSaveData,
  heroKey: number,
  milestone: PreparedBuildMilestone,
): void {
  save.attributeSaveDatas = (milestone.passives ?? []).map((p) => ({
    Key: p.key,
    Level: p.level,
  }));
  save.RuneSaveData = (milestone.runes ?? []).map((r) => ({
    RuneKey: r.key,
    Level: r.level,
  }));
  const hero = save.heroSaveDatas.find((h) => h.heroKey === heroKey);
  if (hero) {
    hero.Level = milestone.heroLevel;
    hero.HeroLevel = milestone.heroLevel;
    hero.equippedItemIds = new Array(hero.equippedItemIds.length).fill(null);
  }
  save.itemSaveDatas = [];
}

export function passiveLevelInSave(save: PlayerSaveData, key: number): number {
  return getPassiveLevel(save, key);
}

export function runeLevelInSave(save: PlayerSaveData, key: number): number {
  return getRuneLevel(save, key);
}
