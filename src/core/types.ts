export type ModType = 'FLAT' | 'ADDITIVE' | 'MULTIPLICATIVE';

export interface StatContribution {
  stat: string;
  mod: ModType;
  raw: number;
  src: string;
}

export interface GearStatLine {
  stat: string;
  mod: ModType | string;
  value: number;
  disp?: string;
}

export interface EnrichedItem {
  key: number;
  name: string;
  type: string;
  grade: string;
  gradeRank?: number;
  parts?: string | null;
  gearType?: string | null;
  gearGroup?: string | null;
  classes?: string[];
  level?: number | null;
  icon?: string;
  obtainable?: boolean;
  tradable?: boolean;
  gold?: number;
  slots?: { decoration: number; engraving: number; inscription: number };
  variant?: string | null;
  stats?: { base?: GearStatLine[]; inherent?: GearStatLine[] };
  affix?: string | null;
}

export interface EffectGroup {
  slot: string;
  stat: string;
  mod: string;
  min: number;
  max: number;
  minTier?: number;
  maxTier?: number;
  disp?: string;
  slotOptions?: number;
  chance?: number;
}

export interface EffectMaterial {
  key: number;
  name: string;
  grade: string;
  icon?: string;
  category: 'DECORATION' | 'ENGRAVING' | 'INSCRIPTION';
  groups: EffectGroup[];
}

export interface HeroStatLine {
  stat: string;
  value: number;
  disp?: string;
}

export interface PassiveNode {
  kind: string;
  key: number;
  icon?: string;
  stat?: string;
  mod?: string;
  maxLevel?: number;
  perPoint?: string;
  total?: string;
  requiredPoint?: number;
  name?: string;
}

export interface HeroTreeGroup {
  group: number;
  tier: number;
  levelGate: number;
  nodes: PassiveNode[];
}

export interface EnrichedHero {
  key: number;
  class: string;
  name: string;
  description?: string;
  mainWeapon?: string;
  subWeapon?: string;
  icon?: string;
  art?: string;
  stats: HeroStatLine[];
  tree: HeroTreeGroup[];
}

export interface RuneLevel {
  level: number;
  value: string | number;
  cost?: number;
}

export interface RuneNode {
  key: number;
  name: string;
  icon?: string;
  stat?: string;
  effect?: string;
  category?: string;
  maxLevel?: number;
  levels?: RuneLevel[];
  next?: number[];
}

export interface RuneGraph {
  runes: RuneNode[];
}

export interface MetaData {
  grades: string[];
  classes: string[];
  gearTypes: string[];
  gearLevels?: number[];
  effectCategories?: string[];
}

export interface EnchantEntry {
  StatModKey?: number;
  StatType: number;
  ModType: number;
  Value: number;
}

export interface ItemSaveData {
  UniqueId: number | string;
  ItemKey: number;
  EnchantData?: EnchantEntry[];
}

export interface HeroSaveData {
  heroKey: number;
  IsUnLock?: boolean;
  Level?: number;
  HeroLevel?: number;
  Exp?: number;
  HeroExp?: number;
  equippedItemIds: (number | string | null)[];
  unlockedAttributeGroupKeys?: number[];
}

export interface RuneSaveEntry {
  RuneKey: number;
  Level: number;
}

export interface AttributeSaveEntry {
  Key: number;
  Level: number;
}

export interface PetSaveEntry {
  PetKey: number;
  IsUnlock?: boolean;
}

export interface PlayerSaveData {
  heroSaveDatas: HeroSaveData[];
  itemSaveDatas: ItemSaveData[];
  RuneSaveData?: RuneSaveEntry[];
  attributeSaveDatas?: AttributeSaveEntry[];
  PetSaveData?: PetSaveEntry[];
  currenySaveDatas?: { Key: number; Quantity: number }[];
  commonSaveData?: { arrangedHeroKey?: number[] };
  inventorySaveDatas?: { IsUnlock?: boolean }[];
}

export interface WikiItem {
  id: number;
  name: Record<string, string> | string;
  grade: string;
  type: string;
  gear?: string | null;
  level?: number | null;
  deleted?: boolean;
  slug?: string;
}

export interface WikiItemDetailStats {
  GearKey?: number;
  BaseStat1_Value?: number;
  BaseStat2_Value?: number;
  BaseStat1_STATTYPE?: string;
  BaseStat1_MODTYPE?: string;
  BaseStat2_STATTYPE?: string;
  BaseStat2_MODTYPE?: string;
  InherentStat1_STATTYPE?: string;
  InherentStat1_MODTYPE?: string;
  InherentStat1_Value?: number;
  InherentStat2_STATTYPE?: string;
  InherentStat2_MODTYPE?: string;
  InherentStat2_Value?: number;
  InherentStat3_STATTYPE?: string;
  InherentStat3_MODTYPE?: string;
  InherentStat3_Value?: number;
}

export interface WikiItemDetail {
  stats?: WikiItemDetailStats | null;
}

export interface WikiHero {
  HeroKey: number;
  HeroNameKey_i18n?: Record<string, string>;
  AttackDamage?: number;
  AttackSpeed?: number;
  CriticalChance?: number;
  CriticalDamage?: number;
  MaxHp?: number;
  Armor?: number;
  MovementSpeed?: number;
  CooldownReduction?: number;
  CastSpeed?: number;
  attributes?: { key: number; type: string }[];
}

export interface WikiPassive {
  PassiveSkillKey: number;
  STATTYPE: string;
  MODTYPE: ModType | string;
  Value?: number;
}

export interface WikiGearType {
  GearType: string;
  BaseStat1_STATTYPE: string;
  BaseStat1_MODTYPE: string;
  BaseStat2_STATTYPE?: string | null;
  BaseStat2_MODTYPE?: string | null;
}

export interface WikiRuneNode {
  key: number;
  stat?: string;
  levels?: { level: number; value: number }[];
}

export interface WikiPetStat {
  STATTYPE: string;
  MODTYPE: ModType | number;
  Value?: number;
  PetKey?: number;
}

export interface WikiPet {
  PetKey: number;
  StatDataKey?: number;
}

export interface RefMaps {
  heroByKey: Map<number, WikiHero>;
  passiveByKey: Map<number, WikiPassive>;
  itemById: Map<number, WikiItem>;
  itemDetailById: Map<string | number, WikiItemDetail>;
  gearTypeByName: Map<string, WikiGearType>;
  runeNodeByKey: Map<number, WikiRuneNode>;
  petByKey: Map<number, WikiPet>;
  petStatsByKey: Map<number, WikiPetStat[]>;
}

export interface ComputedStats {
  AttackDamage: number;
  AttackSpeed: number;
  CriticalChance: number;
  CriticalDamage: number;
  MaxHp: number;
  Armor: number;
  MovementSpeed: number;
  CooldownReduction: number;
  CastSpeed: number;
}

export interface StatDelta {
  name: string;
  baseline: number;
  current: number;
  delta: number;
  deltaPct: number;
}

export type GearCategory = 'all' | 'weapon' | 'off_hand' | 'armor' | 'accessory';

export const GEAR_CATEGORY_SLOTS: Record<Exclude<GearCategory, 'all'>, string[]> = {
  weapon: ['SWORD', 'AXE', 'BOW', 'CROSSBOW', 'SCEPTER', 'STAFF', 'HATCHET'],
  off_hand: ['SHIELD', 'ARROW', 'ORB', 'BOLT', 'TOME'],
  armor: ['ARMOR', 'HELMET', 'GLOVES', 'BOOTS'],
  accessory: ['AMULET', 'EARING', 'RING', 'BRACER'],
};

export const HERO_PARTS = [
  'MAIN_WEAPON',
  'SUB_WEAPON',
  'HELMET',
  'ARMOR',
  'GLOVES',
  'BOOTS',
  'AMULET',
  'EARING',
  'RING',
  'BRACER',
] as const;

export type HeroPart = (typeof HERO_PARTS)[number];

export const PART_LABELS: Record<HeroPart, string> = {
  MAIN_WEAPON: 'Weapon',
  SUB_WEAPON: 'Off-hand',
  HELMET: 'Helmet',
  ARMOR: 'Armor',
  GLOVES: 'Gloves',
  BOOTS: 'Boots',
  AMULET: 'Amulet',
  EARING: 'Earring',
  RING: 'Ring',
  BRACER: 'Bracer',
};

export const STAT_TYPE_BY_NAME: Record<string, number> = {
  AttackDamage: 1,
  AttackSpeed: 2,
  CriticalChance: 3,
  CriticalDamage: 4,
  MaxHp: 5,
  Armor: 6,
  MovementSpeed: 7,
  AreaOfEffect: 8,
  BaseAttackCountReduction: 9,
  CooldownReduction: 10,
  FireResistance: 12,
  ColdResistance: 13,
  LightningResistance: 14,
  ChaosResistance: 15,
  DodgeChance: 16,
  BlockChance: 17,
  PhysicalDamagePercent: 24,
  FireDamagePercent: 25,
  ColdDamagePercent: 26,
  LightningDamagePercent: 27,
  ChaosDamagePercent: 28,
  AddHpPerHit: 33,
  DamageReduction: 34,
  CastSpeed: 49,
  AllElementalResistance: 52,
  IncreaseProjectileDamage: 53,
  IncreaseMeleeDamage: 54,
  IncreaseAreaOfEffectDamage: 55,
  HpRegenPerSec: 23,
  HpLeech: 21,
  Multistrike: 20,
  ProjectileCount: 22,
};

export const STAT_NAME_BY_TYPE: Record<number, string> = Object.fromEntries(
  Object.entries(STAT_TYPE_BY_NAME).map(([k, v]) => [v, k]),
);
