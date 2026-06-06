import type { EnrichedHero, EnrichedItem, HeroPart } from '../types';
import { HERO_PARTS } from '../types';
import { itemIconUrl } from './icons';

export const GAME_UI_BASE = 'https://www.taskbarhero.wiki/game/ui';

export const HERO_ILLUST_CLASS: Record<number, string> = {
  101: 'Knight',
  201: 'Ranger',
  301: 'Sorcerer',
  401: 'Priest',
  501: 'Abalist',
  601: 'Slayer',
};

export interface GearSlotLayout {
  part: HeroPart;
  left: number;
  top: number;
  frame: string;
}

export const GEAR_SLOT_LAYOUT: GearSlotLayout[] = [
  { part: 'MAIN_WEAPON', left: 9.5, top: 21, frame: 'Slot_Gear_MainWeapon_Active.png' },
  { part: 'SUB_WEAPON', left: 23, top: 21, frame: 'Slot_Gear_SubWeapon_Active.png' },
  { part: 'HELMET', left: 9.5, top: 30.5, frame: 'Slot_Gear_Helmet_Active.png' },
  { part: 'ARMOR', left: 23, top: 30.5, frame: 'Slot_Gear_Armor_Active.png' },
  { part: 'GLOVES', left: 9.5, top: 40, frame: 'Slot_Gear_Gloves_Active.png' },
  { part: 'BOOTS', left: 23, top: 40, frame: 'Slot_Gear_Boots_Active.png' },
  { part: 'AMULET', left: 65.5, top: 21, frame: 'Slot_Gear_Amulet_Active.png' },
  { part: 'EARING', left: 79, top: 21, frame: 'Slot_Gear_Ring2.png' },
  { part: 'RING', left: 65.5, top: 30.5, frame: 'Slot_Gear_Ring_Active.png' },
  { part: 'BRACER', left: 79, top: 30.5, frame: 'Slot_Gear_Bracer_Active.png' },
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

export function heroIllustClass(hero: EnrichedHero): string {
  return HERO_ILLUST_CLASS[hero.key] ?? hero.class.replace('Hunter', 'Abalist');
}

export function renderGearSlotHtml(options: {
  layout: GearSlotLayout;
  item?: EnrichedItem | null;
  hasSockets?: boolean;
}): string {
  const { layout, item, hasSockets } = options;
  const iconUrl = item?.icon ? itemIconUrl(item.icon) : null;
  const gradeBg = item ? gradeBgUrl(item.grade) : null;

  return `
    <div class="game-slot-wrap" style="left:${layout.left}%;top:${layout.top}%">
      <button
        type="button"
        class="game-slot${item ? ' filled' : ''}"
        data-action="pick-gear"
        data-part="${layout.part}"
        title="${item?.name ?? layout.part.replace('_', ' ')}"
      >
        <img class="slot-frame" src="${gameUiUrl(layout.frame)}" alt="" />
        ${gradeBg ? `<img class="slot-grade" src="${gradeBg}" alt="" />` : ''}
        ${iconUrl ? `<img class="slot-icon" src="${iconUrl}" alt="" />` : ''}
      </button>
      ${
        item && hasSockets
          ? `<button type="button" class="game-socket-btn" data-action="edit-sockets" data-part="${layout.part}" title="Sockets">◆</button>`
          : ''
      }
    </div>`;
}

export function partOrderIndex(part: HeroPart): number {
  return HERO_PARTS.indexOf(part);
}
