import type {
  EffectGroup,
  EffectMaterial,
  EnchantEntry,
  EnrichedHero,
  EnrichedItem,
  HeroPart,
  HeroSaveData,
  HeroTreeGroup,
  ItemSaveData,
  PlayerSaveData,
  RuneSaveEntry,
} from '../types';
import { HERO_PARTS, STAT_TYPE_BY_NAME } from '../types';
import { enrichedItemToDetail } from '../data/adapters';

let nextUniqueId = 1_000_000;

export function clonePlayerSave(save: PlayerSaveData): PlayerSaveData {
  return structuredClone(save);
}

export function heroLevelFromSave(hero: HeroSaveData): number {
  return hero.Level ?? hero.HeroLevel ?? 1;
}

function normalizeAttributeSaveDatas(raw: unknown): import('../types').AttributeSaveEntry[] {
  const rows = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : [];
  const byKey = new Map<number, number>();

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const key = Number(record.Key ?? record.key);
    const level = Number(record.Level ?? record.level);
    if (!Number.isFinite(key)) continue;
    byKey.set(key, Number.isFinite(level) ? level : 0);
  }

  return [...byKey.entries()].map(([Key, Level]) => ({ Key, Level }));
}

/** Map game save field names to the shape the simulator expects. */
export function normalizePlayerSave(save: PlayerSaveData): PlayerSaveData {
  const normalized = clonePlayerSave(save);

  for (const hero of normalized.heroSaveDatas ?? []) {
    if (hero.Level == null && hero.HeroLevel != null) hero.Level = hero.HeroLevel;
    if (hero.Exp == null && hero.HeroExp != null) hero.Exp = hero.HeroExp;
  }

  normalized.attributeSaveDatas = normalizeAttributeSaveDatas(normalized.attributeSaveDatas);
  return normalized;
}

export function getPassiveLevel(save: PlayerSaveData, passiveKey: number): number {
  const entry = save.attributeSaveDatas?.find((a) => Number(a.Key) === passiveKey);
  return Number(entry?.Level) || 0;
}

/** Total skill points invested in a tree group (passives + actives). */
export function groupInvestedPoints(save: PlayerSaveData, group: HeroTreeGroup): number {
  return group.nodes.reduce((sum, node) => sum + getPassiveLevel(save, node.key), 0);
}

/** Total skill points spent anywhere on the hero skill tree. */
export function totalInvestedSkillPoints(save: PlayerSaveData): number {
  return (save.attributeSaveDatas ?? []).reduce(
    (sum, row) => sum + (Number(row.Level) || 0),
    0,
  );
}

/**
 * Attribute group unlock rules:
 * - Hero level reached the chapter gate, OR
 * - Total invested skill points reached the chapter gate (any chapters), OR
 * - Group already saved as unlocked, OR
 * - Any point invested in this group
 */
export function isAttributeGroupUnlocked(
  groupIndex: number,
  groups: HeroTreeGroup[],
  heroLevel: number,
  save: PlayerSaveData,
  hero: HeroSaveData,
): boolean {
  const group = groups[groupIndex];
  if (!group) return false;
  if (heroLevel >= group.levelGate) return true;
  if (totalInvestedSkillPoints(save) >= group.levelGate) return true;
  if ((hero.unlockedAttributeGroupKeys ?? []).includes(group.group)) return true;
  if (groupInvestedPoints(save, group) > 0) return true;
  return false;
}

/** Persist unlocked groups on the hero save after point investment or import. */
export function syncAttributeGroupUnlocks(
  save: PlayerSaveData,
  hero: HeroSaveData,
  heroDef: EnrichedHero,
): void {
  const heroLevel = heroLevelFromSave(hero);
  const keys = new Set(hero.unlockedAttributeGroupKeys ?? []);
  for (let i = 0; i < heroDef.tree.length; i++) {
    if (isAttributeGroupUnlocked(i, heroDef.tree, heroLevel, save, hero)) {
      keys.add(heroDef.tree[i].group);
    }
  }
  hero.unlockedAttributeGroupKeys = [...keys].sort((a, b) => a - b);
}

export function attributeGroupLockHint(
  _groupIndex: number,
  groups: HeroTreeGroup[],
  heroLevel: number,
  save: PlayerSaveData,
  unlocked: boolean,
): string {
  if (unlocked) return 'Use + / − to invest skill points';
  const group = groups[_groupIndex];
  const gate = group.levelGate;
  const spent = totalInvestedSkillPoints(save);
  const needPoints = Math.max(0, gate - spent);
  if (heroLevel < gate && needPoints > 0) {
    return `Invest ${needPoints} more skill point${needPoints === 1 ? '' : 's'} (any chapter) or reach Hero Level ${gate}`;
  }
  if (heroLevel < gate) return `Sealed until Hero Level ${gate}`;
  if (needPoints > 0) {
    return `Invest ${needPoints} more skill point${needPoints === 1 ? '' : 's'} anywhere on the tree`;
  }
  return 'Use + / − to invest skill points';
}

export function createEmptySave(heroKey: number): PlayerSaveData {
  return {
    heroSaveDatas: [
      {
        heroKey,
        IsUnLock: true,
        Level: 1,
        Exp: 0,
        equippedItemIds: new Array(HERO_PARTS.length).fill(null),
      },
    ],
    itemSaveDatas: [],
    RuneSaveData: [],
    attributeSaveDatas: [],
    PetSaveData: [],
    currenySaveDatas: [{ Key: 100001, Quantity: 0 }],
    commonSaveData: { arrangedHeroKey: [heroKey] },
    inventorySaveDatas: [],
  };
}

export function getSelectedHero(save: PlayerSaveData, heroKey: number): HeroSaveData | undefined {
  return save.heroSaveDatas.find((h) => h.heroKey === heroKey);
}

export function partIndex(part: HeroPart): number {
  return HERO_PARTS.indexOf(part);
}

export function findEquippedItem(
  save: PlayerSaveData,
  hero: HeroSaveData,
  part: HeroPart,
): { inst: ItemSaveData; item: EnrichedItem | undefined } | null {
  const uid = hero.equippedItemIds[partIndex(part)];
  if (!uid) return null;
  const inst = save.itemSaveDatas.find((i) => String(i.UniqueId) === String(uid));
  if (!inst) return null;
  return { inst, item: undefined };
}

export function equipItem(
  save: PlayerSaveData,
  hero: HeroSaveData,
  part: HeroPart,
  item: EnrichedItem,
  itemsByKey: Map<number, EnrichedItem>,
): void {
  const idx = partIndex(part);
  if (item.parts && item.parts !== part) {
    throw new Error(`${item.name} cannot be equipped in ${part}`);
  }

  const uniqueId = nextUniqueId++;
  const inst: ItemSaveData = {
    UniqueId: uniqueId,
    ItemKey: item.key,
    EnchantData: [],
  };

  save.itemSaveDatas.push(inst);
  hero.equippedItemIds[idx] = uniqueId;
  itemsByKey.set(item.key, item);
}

export function unequipPart(_save: PlayerSaveData, hero: HeroSaveData, part: HeroPart): void {
  const idx = partIndex(part);
  hero.equippedItemIds[idx] = null;
}

export function modTypeToNumber(mod: string): number {
  if (mod === 'ADDITIVE') return 1;
  if (mod === 'MULTIPLICATIVE') return 2;
  return 0;
}

export function enchantFromEffect(group: EffectGroup, value: number): EnchantEntry {
  return {
    StatModKey: 0,
    StatType: STAT_TYPE_BY_NAME[group.stat] ?? 0,
    ModType: modTypeToNumber(group.mod),
    Value: value,
  };
}

export function getEffectGroupsForGear(
  material: EffectMaterial,
  gear: EnrichedItem,
): EffectGroup[] {
  const slotName =
    gear.gearGroup === 'WEAPON'
      ? 'Weapon'
      : gear.gearGroup === 'ARMOR'
        ? 'Armor'
        : gear.gearGroup === 'ACCESSORY'
          ? 'Accessory'
          : 'All';

  if (material.category === 'INSCRIPTION') {
    return material.groups.filter((g) => g.slot === 'All' || g.slot === slotName);
  }
  return material.groups.filter((g) => g.slot === slotName);
}

export interface SocketSlotState {
  category: 'DECORATION' | 'ENGRAVING' | 'INSCRIPTION';
  index: number;
  materialKey: number | null;
  groupIndex: number;
  roll: 'min' | 'max' | 'mid' | 'custom';
  customValue?: number;
}

export function socketRollValue(slot: SocketSlotState, group: EffectGroup): number {
  if (slot.roll === 'min') return group.min;
  if (slot.roll === 'max') return group.max;
  if (slot.roll === 'mid') return (group.min + group.max) / 2;
  const custom = slot.customValue ?? group.max;
  return Math.max(group.min, Math.min(group.max, custom));
}

export function getSocketSlots(gear: EnrichedItem): { category: SocketSlotState['category']; count: number }[] {
  const slots = gear.slots ?? { decoration: 0, engraving: 0, inscription: 0 };
  const rows: { category: SocketSlotState['category']; count: number }[] = [
    { category: 'DECORATION', count: slots.decoration },
    { category: 'ENGRAVING', count: slots.engraving },
    { category: 'INSCRIPTION', count: slots.inscription },
  ];
  return rows.filter((s) => s.count > 0);
}

export function applySocketsToItem(
  inst: ItemSaveData,
  gear: EnrichedItem,
  socketStates: SocketSlotState[],
  effectsByKey: Map<number, EffectMaterial>,
): void {
  const enchants: EnchantEntry[] = [];

  for (const slot of socketStates) {
    if (slot.materialKey == null) continue;
    const material = effectsByKey.get(slot.materialKey);
    if (!material) continue;
    const groups = getEffectGroupsForGear(material, gear);
    const group = groups[slot.groupIndex] ?? groups[0];
    if (!group) continue;

    const value = socketRollValue(slot, group);
    enchants.push(enchantFromEffect(group, value));
  }

  inst.EnchantData = enchants;
}

export function setPassiveLevel(
  save: PlayerSaveData,
  passiveKey: number,
  level: number,
  maxLevel: number,
): void {
  const clamped = Math.max(0, Math.min(maxLevel, level));
  const list = save.attributeSaveDatas ?? [];
  const idx = list.findIndex((a) => a.Key === passiveKey);
  if (idx >= 0) {
    if (clamped === 0) list.splice(idx, 1);
    else list[idx].Level = clamped;
  } else if (clamped > 0) {
    list.push({ Key: passiveKey, Level: clamped });
  }
  save.attributeSaveDatas = list;
}

export function setRuneLevel(save: PlayerSaveData, runeKey: number, level: number, maxLevel: number): void {
  const list = save.RuneSaveData ?? [];
  const idx = list.findIndex((r) => r.RuneKey === runeKey);
  const clamped = Math.max(0, Math.min(maxLevel, level));
  if (idx >= 0) {
    if (clamped === 0) list.splice(idx, 1);
    else list[idx].Level = clamped;
  } else if (clamped > 0) {
    list.push({ RuneKey: runeKey, Level: clamped });
  }
  save.RuneSaveData = list;
}

export function getRuneLevel(save: PlayerSaveData, runeKey: number): number {
  return save.RuneSaveData?.find((r) => r.RuneKey === runeKey)?.Level ?? 0;
}

export function ensureItemDetailsForSave(
  save: PlayerSaveData,
  itemsByKey: Map<number, EnrichedItem>,
  itemDetailById: Map<string | number, import('../types').WikiItemDetail>,
): void {
  for (const inst of save.itemSaveDatas) {
    if (itemDetailById.has(inst.ItemKey) || itemDetailById.has(String(inst.ItemKey))) continue;
    const enriched = itemsByKey.get(inst.ItemKey);
    if (!enriched) continue;
    const detail = enrichedItemToDetail(enriched);
    if (detail) itemDetailById.set(String(inst.ItemKey), detail);
  }
}

export function buildItemsMap(items: EnrichedItem[]): Map<number, EnrichedItem> {
  return new Map(items.map((i) => [i.key, i]));
}

export function listPassiveNodes(hero: EnrichedHero) {
  return hero.tree.flatMap((g) => g.nodes.filter((n) => n.kind === 'passive' && n.stat && n.stat !== 'NONE'));
}

export function syncSaveItemKeys(save: PlayerSaveData, items: EnrichedItem[]): Map<number, EnrichedItem> {
  const map = buildItemsMap(items);
  for (const inst of save.itemSaveDatas) {
    if (!map.has(inst.ItemKey)) {
      const wikiItem = items.find((i) => i.key === inst.ItemKey);
      if (wikiItem) map.set(inst.ItemKey, wikiItem);
    }
  }
  return map;
}

export type { RuneSaveEntry };
