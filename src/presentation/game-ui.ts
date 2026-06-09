import type { EffectMaterial, EnchantEntry, EnrichedHero, EnrichedItem, HeroPart } from '@/core/types';
import { HERO_PARTS } from '@/core/types';
import { buildGearTooltipHtml } from './gear-tooltip';
import { itemIconUrl } from './icons';

export const GAME_UI_BASE = 'https://www.taskbarhero.wiki/game/ui';

/** Bundled game UI assets served from /public/assets/ui (respects Vite BASE_URL). */
export function bundledGameUiUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}assets/ui/${relativePath}`.replace(/\/{2,}/g, '/');
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

/** Full idle portrait loop duration. */
export const HERO_ILLUST_CYCLE_MS = 1000;

export function heroIllustFrameMs(heroKey: number): number {
  const count = heroIllustFrameCount(heroKey);
  return Math.max(1, Math.round(HERO_ILLUST_CYCLE_MS / count));
}

/** Warm browser cache for all idle portrait frames before animating. */
export function preloadHeroIllustFrames(heroKey: number): string[] {
  const count = heroIllustFrameCount(heroKey);
  const urls: string[] = [];
  for (let frame = 0; frame < count; frame++) {
    const url = heroIllustUrl(heroKey, frame);
    urls.push(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
  return urls;
}

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

/** Single-column gear stacks for the hero loadout panel. */
export const HERO_GEAR_LEFT_COL: HeroPart[] = [
  'MAIN_WEAPON',
  'SUB_WEAPON',
  'HELMET',
  'ARMOR',
  'GLOVES',
  'BOOTS',
];

export const HERO_GEAR_RIGHT_COL: HeroPart[] = ['AMULET', 'EARING', 'RING', 'BRACER'];

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
  enchants?: EnchantEntry[];
  effects?: EffectMaterial[];
  hasSockets?: boolean;
  readOnly?: boolean;
}): string {
  const { part, item, enchants, effects, hasSockets, readOnly } = options;
  const iconUrl = item?.icon ? itemIconUrl(item.icon) : null;
  const gradeBg = item ? gradeBgUrl(item.grade) : null;

  const slotLabel = item?.name ?? part.replace('_', ' ');
  const slotA11y = slotLabel.replace(/"/g, '&quot;');
  const slotTag = readOnly ? 'div' : 'button';
  const slotAttrs = readOnly
    ? `class="game-slot game-slot--readonly${item ? ' filled' : ''}"${item ? ` aria-label="${slotA11y}"` : ` title="${slotA11y}"`}`
    : `type="button" class="game-slot${item ? ' filled' : ''}" data-action="pick-gear" data-part="${part}"${item ? ` aria-label="${slotA11y}"` : ` title="${slotA11y}"`}`;

  return `
    <div class="game-slot-wrap${item ? ' is-filled' : ''}${readOnly ? ' is-readonly' : ''}">
      <${slotTag} ${slotAttrs}>
        <img class="slot-frame" src="${slotFrameUrl(GEAR_SLOT_FRAMES[part])}" alt="" />
        ${gradeBg ? `<img class="slot-grade" src="${gradeBg}" alt="" />` : ''}
        ${iconUrl ? `<img class="slot-icon" src="${iconUrl}" alt="" />` : ''}
      </${slotTag}>
      ${
        item && hasSockets && !readOnly
          ? `<button type="button" class="game-socket-btn" data-action="edit-sockets" data-part="${part}" title="Sockets">◆</button>`
          : ''
      }
      ${
        item
          ? `<div class="rpg-tooltip gear-tooltip" role="tooltip">${buildGearTooltipHtml(item, enchants, effects)}</div>`
          : ''
      }
    </div>`;
}

export function partOrderIndex(part: HeroPart): number {
  return HERO_PARTS.indexOf(part);
}
