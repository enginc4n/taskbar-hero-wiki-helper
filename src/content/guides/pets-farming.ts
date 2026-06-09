import { GAME_UI_BASE } from '@/presentation/game-ui';

export interface PetSlotDisplay {
  scaleX: number;
  scaleY: number;
}

export type PetFarmDifficulty = 'torment' | 'hell' | 'nightmare';

export interface PetFarmSpot {
  act: number;
  stage: number;
  stageName: string;
  difficulty: PetFarmDifficulty;
  runsPerHour: number;
}

export type PetStatCategory = 'exp' | 'gold' | 'chest' | 'rare';

export interface EnrichedPetStat {
  stat: string;
  disp: string;
  label: string;
}

const PET_STAT_CATEGORY: Record<string, PetStatCategory> = {
  IncreaseExpAmount: 'exp',
  IncreaseGoldAmount: 'gold',
  DropChanceNormalChestPercent: 'chest',
  DropChanceStageBossChestPercent: 'rare',
};

export function petStatCategory(stat: string): PetStatCategory {
  return PET_STAT_CATEGORY[stat] ?? 'chest';
}

export interface EnrichedPetUnlockKill {
  type: 'KillMonster';
  monsterKey: number;
  monsterName: string;
  count: number;
  farm?: {
    label: string;
    act: number;
    stageNo: number;
    stageName: string;
  };
}

export interface EnrichedPetUnlockDlc {
  type: 'DLC';
  note: string;
}

export interface EnrichedPet {
  key: number;
  name: string;
  icon: string;
  dlc: boolean;
  stats: EnrichedPetStat[];
  unlock: EnrichedPetUnlockKill | EnrichedPetUnlockDlc;
}

/** Best farm routes per pet (from taskbarhero.wiki/pets). */
export const PET_FARM_ROUTES: Record<number, PetFarmSpot[]> = {
  1001: [
    { act: 1, stage: 7, stageName: 'City Outskirts', difficulty: 'torment', runsPerHour: 204 },
    { act: 1, stage: 8, stageName: 'Cemetery', difficulty: 'torment', runsPerHour: 172 },
    { act: 1, stage: 7, stageName: 'City Outskirts', difficulty: 'hell', runsPerHour: 148 },
  ],
  1002: [
    { act: 2, stage: 5, stageName: 'Scorching Dunes', difficulty: 'torment', runsPerHour: 228 },
    { act: 2, stage: 5, stageName: 'Scorching Dunes', difficulty: 'hell', runsPerHour: 160 },
    { act: 2, stage: 5, stageName: 'Scorching Dunes', difficulty: 'nightmare', runsPerHour: 114 },
  ],
  1003: [
    { act: 2, stage: 8, stageName: 'Sacred Tomb', difficulty: 'torment', runsPerHour: 120 },
    { act: 2, stage: 9, stageName: "Pharaoh's Crypt", difficulty: 'torment', runsPerHour: 109 },
    { act: 2, stage: 9, stageName: "Pharaoh's Crypt", difficulty: 'hell', runsPerHour: 80 },
  ],
  1004: [
    { act: 3, stage: 6, stageName: 'Burning Ravine', difficulty: 'torment', runsPerHour: 138 },
    { act: 3, stage: 6, stageName: 'Burning Ravine', difficulty: 'hell', runsPerHour: 131 },
    { act: 3, stage: 6, stageName: 'Burning Ravine', difficulty: 'nightmare', runsPerHour: 85 },
  ],
  1005: [
    { act: 3, stage: 4, stageName: 'Frozen Glacier Cavern', difficulty: 'torment', runsPerHour: 135 },
    { act: 3, stage: 4, stageName: 'Frozen Glacier Cavern', difficulty: 'hell', runsPerHour: 100 },
    { act: 3, stage: 9, stageName: 'Core of the Abyss', difficulty: 'torment', runsPerHour: 88 },
  ],
};

const PET_SLOT_ICON_FILES: Record<string, string> = {
  Pet_1001: 'PetSlot_Bat_Arranged.png',
  Pet_1002: 'PetSlot_BeHolder_Arranged.png',
  Pet_1003: 'PetSlot_FlyingSkull_Arranged.png',
  Pet_1004: 'PetSlot_BlueGolem_Arranged.png',
  Pet_1005: 'PetSlot_BlackSpirit_Arranged.png',
  Pet_6001: 'PetSlot_FlyingSword_Arranged.png',
  Pet_6002: 'PetSlot_Butterfly_Arranged.png',
  Pet_6003: 'PetSlot_Dragon_Arranged.png',
};

/** Per-pet scale tweaks so slot art fills the frame consistently in the db table. */
const PET_SLOT_DISPLAY: Record<number, PetSlotDisplay> = {
  1001: { scaleX: 1, scaleY: 1 },
  1002: { scaleX: 0.96, scaleY: 0.9 },
  1003: { scaleX: 0.94, scaleY: 0.86 },
  1004: { scaleX: 0.94, scaleY: 0.94 },
  1005: { scaleX: 1, scaleY: 1 },
  6001: { scaleX: 0.96, scaleY: 0.96 },
  6002: { scaleX: 0.96, scaleY: 0.94 },
  6003: { scaleX: 0.9, scaleY: 0.86 },
};

export function petSlotIconUrl(iconKey: string): string {
  const file = PET_SLOT_ICON_FILES[iconKey] ?? `${iconKey}.png`;
  return `${GAME_UI_BASE}/${file}`;
}

export function petSlotDisplay(petKey: number): PetSlotDisplay {
  return PET_SLOT_DISPLAY[petKey] ?? { scaleX: 1, scaleY: 1 };
}

export function isKillUnlock(
  unlock: EnrichedPetUnlockKill | EnrichedPetUnlockDlc,
): unlock is EnrichedPetUnlockKill {
  return unlock.type === 'KillMonster';
}
