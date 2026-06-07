import type { ComputedStats } from '../types';

/** Local pixel-art UI assets under /public/assets/ui */
export function rpgAssetUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}assets/ui/${relativePath}`.replace(/\/{2,}/g, '/');
}

export const RUNE_VAULT_ICON = rpgAssetUrl('icons/rune_button.png');

export const RPG_FRAMES = {
  panelGold: rpgAssetUrl('frames/frame-panel-gold.png'),
  panelDark: rpgAssetUrl('frames/frame-panel-dark.png'),
  character: rpgAssetUrl('frames/frame-character.png'),
  equipmentSlot: rpgAssetUrl('frames/frame-equipment-slot.png'),
  runeSlot: rpgAssetUrl('frames/frame-rune-slot.png'),
} as const;

export const STAT_ICON_FILES: Partial<Record<keyof ComputedStats, string>> = {
  AttackDamage: 'icons/attack.png',
  MaxHp: 'icons/health.png',
  AttackSpeed: 'icons/attack-speed.png',
  CriticalChance: 'icons/crit-chance.png',
  CriticalDamage: 'icons/crit-damage.png',
  CooldownReduction: 'icons/cooldown.png',
  MovementSpeed: 'icons/movement-speed.png',
  Armor: 'icons/armor.png',
  CastSpeed: 'icons/cast-speed.png',
};

export function statIconUrl(stat: keyof ComputedStats): string | null {
  const file = STAT_ICON_FILES[stat];
  return file ? rpgAssetUrl(file) : null;
}

/** Hero class glyph for banner / codex */
export function classGlyph(className: string): string {
  const map: Record<string, string> = {
    Knight: '⚔',
    Ranger: '🏹',
    Sorcerer: '✦',
    Priest: '✚',
    Abalist: '☽',
    Slayer: '†',
    Hunter: '🏹',
  };
  return map[className] ?? '◆';
}

/** Rarity tint for runes and items */
export function rarityClass(level: number, max: number): string {
  if (level >= max) return 'rarity-max';
  if (level > 0) return 'rarity-active';
  return 'rarity-dormant';
}
