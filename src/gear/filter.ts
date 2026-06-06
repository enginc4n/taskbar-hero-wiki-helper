import type { EnrichedItem, GearCategory } from '../types';
import { GEAR_CATEGORY_SLOTS } from '../types';

export interface GearFilterState {
  grade: string;
  category: GearCategory;
  levelMin: number;
  levelMax: number;
  search: string;
}

export const DEFAULT_GEAR_FILTER: GearFilterState = {
  grade: 'ALL',
  category: 'all',
  levelMin: 1,
  levelMax: 100,
  search: '',
};

export function filterGear(items: EnrichedItem[], filter: GearFilterState): EnrichedItem[] {
  return items.filter((item) => {
    if (item.type !== 'GEAR') return false;
    if (filter.grade !== 'ALL' && item.grade !== filter.grade) return false;

    const level = item.level ?? 0;
    if (level < filter.levelMin || level > filter.levelMax) return false;

    if (filter.category !== 'all') {
      const slots = GEAR_CATEGORY_SLOTS[filter.category];
      if (!item.gearType || !slots.includes(item.gearType)) return false;
    }

    if (filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      if (!item.name.toLowerCase().includes(q)) return false;
    }

    return true;
  });
}

export function paginate<T>(items: T[], page: number, pageSize = 60): T[] {
  return items.slice(0, page * pageSize);
}

export function gearAffixLabel(item: EnrichedItem): string {
  const inherent = item.stats?.inherent ?? [];
  if (inherent.length === 0) return '';
  return inherent.map((s) => s.disp ?? `${s.stat} ${s.value}`).join(' · ');
}

export function gradeClass(grade: string): string {
  return `grade-${grade.toLowerCase()}`;
}

export function itemMatchesHeroClass(item: EnrichedItem, heroClass: string): boolean {
  if (!item.classes?.length) return true;
  if (item.classes.includes('All')) return true;
  return item.classes.includes(heroClass);
}
