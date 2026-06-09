import { formatStatLabel, formatStatValue } from '../engine/stats';
import { t, type TranslationKey } from '../i18n';
import { getEffectGroupsForGear, getSocketSlots, modTypeToNumber } from '../simulator/build-state';
import type { EffectGroup, EffectMaterial, EnchantEntry, EnrichedItem } from '../types';
import { STAT_NAME_BY_TYPE } from '../types';
import { itemIconHtml } from './icons';

const STAT_SCALE: Record<string, number> = {
  AttackSpeed: 100,
  CastSpeed: 100,
  MovementSpeed: 100,
  CriticalChance: 1000,
  CriticalDamage: 1000,
  CooldownReduction: 1000,
};

const CATEGORY_LABEL_KEYS: Record<'DECORATION' | 'ENGRAVING' | 'INSCRIPTION', TranslationKey> = {
  DECORATION: 'socketModal.category.decoration',
  ENGRAVING: 'socketModal.category.engraving',
  INSCRIPTION: 'socketModal.category.inscription',
};

export interface GearTooltipSocketRow {
  category: 'DECORATION' | 'ENGRAVING' | 'INSCRIPTION';
  index: number;
  material: EffectMaterial | null;
  effectLine: string | null;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatEnchantValue(stat: string, modType: number, raw: number): string {
  const scale = STAT_SCALE[stat] ?? 1;
  if (modType === 1) {
    return formatStatValue(stat, raw / 1000);
  }
  if (modType === 2) {
    const pct = raw / 10;
    return `${pct >= 0 ? '+' : ''}${pct}%`;
  }
  return formatStatValue(stat, raw / scale);
}

function formatEnchantLine(entry: EnchantEntry): string | null {
  if (!entry.StatType) return null;
  const stat = STAT_NAME_BY_TYPE[entry.StatType];
  if (!stat) return null;
  const label = formatStatLabel(stat);
  const value = formatEnchantValue(stat, entry.ModType, entry.Value ?? 0);
  const prefix = entry.ModType === 2 ? '×' : '';
  return `${prefix}${value} ${label}`;
}

function groupMatchesEnchant(group: EffectGroup, enchant: EnchantEntry): boolean {
  const stat = STAT_NAME_BY_TYPE[enchant.StatType];
  if (!stat || group.stat !== stat) return false;
  if (modTypeToNumber(group.mod) !== enchant.ModType) return false;
  const value = enchant.Value ?? 0;
  return value >= group.min && value <= group.max;
}

function findMaterialForEnchant(
  enchant: EnchantEntry,
  item: EnrichedItem,
  category: GearTooltipSocketRow['category'],
  effects: EffectMaterial[],
): EffectMaterial | null {
  let best: { material: EffectMaterial; spread: number } | null = null;

  for (const material of effects) {
    if (material.category !== category) continue;
    const groups = getEffectGroupsForGear(material, item);
    for (const group of groups) {
      if (!groupMatchesEnchant(group, enchant)) continue;
      const spread = group.max - group.min;
      if (!best || spread < best.spread) {
        best = { material, spread };
      }
    }
  }

  return best?.material ?? null;
}

export function resolveGearTooltipSockets(
  item: EnrichedItem,
  enchants: EnchantEntry[] | undefined,
  effects: EffectMaterial[],
): GearTooltipSocketRow[] {
  if (!enchants?.length || !effects.length) return [];

  const plan: { category: GearTooltipSocketRow['category']; index: number }[] = [];
  for (const { category, count } of getSocketSlots(item)) {
    for (let i = 0; i < count; i++) {
      plan.push({ category, index: i });
    }
  }

  const rows: GearTooltipSocketRow[] = [];
  for (let i = 0; i < enchants.length; i++) {
    const enchant = enchants[i];
    const effectLine = formatEnchantLine(enchant);
    if (!effectLine) continue;

    const slot = plan[i];
    if (!slot) {
      rows.push({ category: 'INSCRIPTION', index: i, material: null, effectLine });
      continue;
    }

    rows.push({
      category: slot.category,
      index: slot.index,
      material: findMaterialForEnchant(enchant, item, slot.category, effects),
      effectLine,
    });
  }

  return rows;
}

function renderSocketRows(rows: GearTooltipSocketRow[]): string {
  return rows
    .map((row) => {
      const slotLabel = `${t(CATEGORY_LABEL_KEYS[row.category])} ${row.index + 1}`;
      const icon = row.material
        ? itemIconHtml(row.material.icon, row.material.name, 'gear-tooltip-socket-icon')
        : '<span class="gear-tooltip-socket-empty" aria-hidden="true">◆</span>';
      const name = row.material ? escapeHtml(row.material.name) : t('build.empty');

      return `
        <li class="gear-tooltip-socket">
          ${icon}
          <span class="gear-tooltip-socket-body">
            <span class="gear-tooltip-socket-label">${escapeHtml(slotLabel)}</span>
            <span class="gear-tooltip-socket-name">${name}</span>
            ${row.effectLine ? `<span class="gear-tooltip-socket-effect">${escapeHtml(row.effectLine)}</span>` : ''}
          </span>
        </li>`;
    })
    .join('');
}

export function buildGearTooltipHtml(
  item: EnrichedItem,
  enchants?: EnchantEntry[],
  effects?: EffectMaterial[],
): string {
  const lines: string[] = [];
  lines.push(`<p class="gear-tooltip-name">${escapeHtml(item.name)}${item.variant ? ` (${escapeHtml(item.variant)})` : ''}</p>`);
  if (item.grade || item.level != null) {
    lines.push(
      `<p class="gear-tooltip-meta">${[item.grade, item.level != null ? `Lv${item.level}` : ''].filter(Boolean).join(' · ')}</p>`,
    );
  }

  const socketRows = effects?.length ? resolveGearTooltipSockets(item, enchants, effects) : [];
  if (socketRows.length) {
    lines.push(`<p class="gear-tooltip-section">${t('socketModal.slots')}</p>`);
    lines.push(`<ul class="gear-tooltip-sockets">${renderSocketRows(socketRows)}</ul>`);
    return lines.join('');
  }

  const enchantLines = (enchants ?? [])
    .map(formatEnchantLine)
    .filter((line): line is string => !!line);

  if (enchantLines.length) {
    lines.push(`<p class="gear-tooltip-section">${t('socketModal.slots')}</p>`);
    lines.push(
      `<ul class="gear-tooltip-list">${enchantLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`,
    );
  }

  return lines.join('');
}
