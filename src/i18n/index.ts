import { en, type TranslationKey } from './en';
import { tr } from './tr';
import type { HeroPart } from '@/core/types';

export type Locale = 'en' | 'tr';

const STORAGE_KEY = 'wiki-helper-locale';

const bundles: Record<Locale, Record<TranslationKey, string>> = { en, tr };

export const LOCALE_OPTIONS: { value: Locale; label: string; flagCode: 'us' | 'tr' }[] = [
  { value: 'en', label: 'English', flagCode: 'us' },
  { value: 'tr', label: 'Türkçe', flagCode: 'tr' },
];

const PART_KEYS: Record<HeroPart, TranslationKey> = {
  MAIN_WEAPON: 'part.mainWeapon',
  SUB_WEAPON: 'part.subWeapon',
  HELMET: 'part.helmet',
  ARMOR: 'part.armor',
  GLOVES: 'part.gloves',
  BOOTS: 'part.boots',
  AMULET: 'part.amulet',
  EARING: 'part.earing',
  RING: 'part.ring',
  BRACER: 'part.bracer',
};

let currentLocale: Locale = readStoredLocale();
const listeners = new Set<() => void>();

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'tr') return stored;
  } catch {
    /* ignore */
  }
  return 'en';
}

function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  persistLocale(locale);
  document.documentElement.lang = locale;
  for (const listener of listeners) listener();
}

export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let text = bundles[currentLocale][key] ?? bundles.en[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function partLabel(part: HeroPart): string {
  return t(PART_KEYS[part]);
}

export function initLocale(): void {
  document.documentElement.lang = currentLocale;
}

export type { TranslationKey };
