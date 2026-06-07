import { t, type TranslationKey } from './index';

const HERO_CLASS_KEYS: Record<string, TranslationKey> = {
  Knight: 'class.knight',
  Ranger: 'class.ranger',
  Sorcerer: 'class.sorcerer',
  Priest: 'class.priest',
  Slayer: 'class.slayer',
  Hunter: 'class.hunter',
  Abalist: 'class.hunter',
};

function classTranslationKey(className: string): TranslationKey | undefined {
  if (HERO_CLASS_KEYS[className]) return HERO_CLASS_KEYS[className];
  const lower = className.trim().toLowerCase();
  for (const [english, key] of Object.entries(HERO_CLASS_KEYS)) {
    if (english.toLowerCase() === lower) return key;
  }
  return undefined;
}

export function heroClassLabel(className: string | undefined | null): string {
  if (!className) return '';
  const key = classTranslationKey(className);
  return key ? t(key) : className;
}

/** Hero display names in game data match class names (Knight, Ranger, …). */
export function heroNameLabel(name: string | undefined | null): string {
  return heroClassLabel(name);
}