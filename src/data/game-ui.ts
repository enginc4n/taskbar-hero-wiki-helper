import type { EnrichedHero, EnrichedItem, HeroPart } from '../types';
import { HERO_PARTS } from '../types';
import { itemIconUrl } from './icons';

export const GAME_UI_BASE = 'https://www.taskbarhero.wiki/game/ui';

/** Bundled game UI assets served from /public (respects Vite BASE_URL). */
export function bundledGameUiUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}game-ui/${relativePath}`.replace(/\/{2,}/g, '/');
}

export function slotFrameUrl(file: string): string {
  return bundledGameUiUrl(`slots/${file}`);
}

export const HERO_ILLUST_CLASS: Record<number, string> = {
  101: 'Knight',
  201: 'Ranger',
  301: 'Sorcerer',
  401: 'Priest',
  501: 'Abalist',
  601: 'Slayer',
};

/** Idle animation frame count per hero (Inventory_ChaIllust_*_Mid_Anim_N). */
export const HERO_ILLUST_FRAME_COUNT: Record<number, number> = {
  101: 9,
  201: 9,
  301: 9,
  401: 9,
  501: 9,
  601: 11,
};

export const HERO_ILLUST_FRAME_MS = 110;

export const GEAR_SLOT_FRAMES: Record<HeroPart, string> = {
  MAIN_WEAPON: 'Slot_Gear_MainWeapon_Active.png',
  SUB_WEAPON: 'Slot_Gear_SubWeapon_Active.png',
  HELMET: 'Slot_Gear_Helmet_Active.png',
  ARMOR: 'Slot_Gear_Armor_Active.png',
  GLOVES: 'Slot_Gear_Gloves_Active.png',
  BOOTS: 'Slot_Gear_Boots_Active.png',
  AMULET: 'Slot_Gear_Amulet_Active.png',
  EARING: 'Slot_Gear_Ring2.png',
  RING: 'Slot_Gear_Ring_Active.png',
  BRACER: 'Slot_Gear_Bracer_Active.png',
};

/** Left/right gear columns for the hero equipment grid. */
export const HERO_GEAR_LEFT: HeroPart[][] = [
  ['MAIN_WEAPON', 'SUB_WEAPON'],
  ['HELMET', 'ARMOR'],
  ['GLOVES', 'BOOTS'],
];

export const HERO_GEAR_RIGHT: HeroPart[][] = [
  ['AMULET', 'EARING'],
  ['RING', 'BRACER'],
];

export function gameUiUrl(file: string): string {
  return `${GAME_UI_BASE}/${file}`;
}

export function gradeBgUrl(grade: string): string {
  const normalized = grade.toUpperCase() === 'COMMON' ? 'NORMAL' : grade.toUpperCase();
  return gameUiUrl(`ItemSlot_GradeBg_${normalized}.png`);
}

export function heroIllustUrl(heroKey: number, frame = 0): string {
  const cls = HERO_ILLUST_CLASS[heroKey] ?? 'Knight';
  return gameUiUrl(`Inventory_ChaIllust_${cls}_Mid_Anim_${frame}.png`);
}

export function heroIllustFrameCount(heroKey: number): number {
  return HERO_ILLUST_FRAME_COUNT[heroKey] ?? 9;
}

export function heroIllustClass(hero: EnrichedHero): string {
  return HERO_ILLUST_CLASS[hero.key] ?? hero.class.replace('Hunter', 'Abalist');
}

export function renderGearSlotHtml(options: {
  part: HeroPart;
  item?: EnrichedItem | null;
  hasSockets?: boolean;
}): string {
  const { part, item, hasSockets } = options;
  const iconUrl = item?.icon ? itemIconUrl(item.icon) : null;
  const gradeBg = item ? gradeBgUrl(item.grade) : null;

  return `
    <div class="game-slot-wrap">
      <button
        type="button"
        class="game-slot${item ? ' filled' : ''}"
        data-action="pick-gear"
        data-part="${part}"
        title="${item?.name ?? part.replace('_', ' ')}"
      >
        <img class="slot-frame" src="${slotFrameUrl(GEAR_SLOT_FRAMES[part])}" alt="" />
        ${gradeBg ? `<img class="slot-grade" src="${gradeBg}" alt="" />` : ''}
        ${iconUrl ? `<img class="slot-icon" src="${iconUrl}" alt="" />` : `<img class="slot-empty" src="${slotFrameUrl('ItemSlot_Icon_NoEquip.png')}" alt="" />`}
      </button>
      ${
        item && hasSockets
          ? `<button type="button" class="game-socket-btn" data-action="edit-sockets" data-part="${part}" title="Sockets">◆</button>`
          : ''
      }
    </div>`;
}

export function partOrderIndex(part: HeroPart): number {
  return HERO_PARTS.indexOf(part);
}
