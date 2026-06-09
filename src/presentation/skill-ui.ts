import { formatStatLabel } from '@/core/engine/stats';
import type { PassiveNode } from '@/core/types';

const GAME_UI = 'https://www.taskbarhero.wiki/game/ui';
const SKILL_UI = 'https://www.taskbarhero.wiki/game/skills';
const SKILL_SECTION = 'https://www.taskbarhero.wiki/game/monsters/SkillPointSection';

export function skillSectionBgUrl(active: boolean): string {
  return `${SKILL_SECTION}/SkillPointSection_Bg_${active ? 'Active' : 'DeActive'}.png`;
}

export function skillNodeFrameUrl(kind: 'passive' | 'active', level: number, maxLevel: number): string {
  const prefix = kind === 'passive' ? 'PassiveSkillSlot' : 'ActiveSkillSlot';
  if (level >= maxLevel) return `${GAME_UI}/${prefix}_MaxLv_Bg.png`;
  if (level > 0) return `${GAME_UI}/${prefix}_Active.png`;
  return `${GAME_UI}/${prefix}_Normal_Bg.png`;
}

export function skillIconUrl(icon?: string): string | null {
  if (!icon) return null;
  if (icon.startsWith('Passive_') || icon.startsWith('Skill_')) {
    return `${SKILL_UI}/${icon}.png`;
  }
  return `https://www.taskbarherowiki.com/icons/${icon}.png`;
}

export function passiveNodeLabel(node: PassiveNode): string {
  if (node.stat && node.stat !== 'NONE') return formatStatLabel(node.stat);
  return node.name ?? 'Passive';
}

export function skillSectionLockedIconUrl(): string {
  return `${SKILL_SECTION}/SkillPointSection__LockedIcon.png`;
}
