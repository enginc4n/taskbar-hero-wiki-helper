import type {
  EffectMaterial,
  EnrichedHero,
  EnrichedItem,
  MetaData,
  RuneGraph,
} from '../types';

const ENRICHED_BASE = 'https://www.taskbarherowiki.com/data';

/** Browser: same-origin /wiki-data (bundled or dev proxy). Node/scripts: fetch wiki directly. */
function getWikiBase(): string {
  if (typeof window === 'undefined') {
    return 'https://www.taskbarhero.wiki/data';
  }
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return new URL('wiki-data', base).pathname.replace(/\/$/, '');
}

const cache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        return res.json();
      }),
    );
  }
  return cache.get(url) as Promise<T>;
}

export async function loadEnrichedData() {
  const [items, heroes, effects, runes, meta] = await Promise.all([
    fetchJson<EnrichedItem[]>(`${ENRICHED_BASE}/items.json`),
    fetchJson<EnrichedHero[]>(`${ENRICHED_BASE}/heroes.json`),
    fetchJson<EffectMaterial[]>(`${ENRICHED_BASE}/effects.json`),
    fetchJson<RuneGraph>(`${ENRICHED_BASE}/runes.json`),
    fetchJson<MetaData>(`${ENRICHED_BASE}/meta.json`),
  ]);

  return { items, heroes, effects, runes, meta };
}

export async function loadWikiRefData() {
  const wikiBase = getWikiBase();
  const [
    heroes,
    passives,
    items,
    itemsDetail,
    gearTypes,
    runeTree,
    pets,
    petStats,
  ] = await Promise.all([
    fetchJson<import('../types').WikiHero[]>(`${wikiBase}/heroes.json`),
    fetchJson<import('../types').WikiPassive[]>(`${wikiBase}/passive_skills.json`),
    fetchJson<import('../types').WikiItem[]>(`${wikiBase}/items.json`),
    fetchJson<Record<string, import('../types').WikiItemDetail>>(`${wikiBase}/items_detail.json`),
    fetchJson<import('../types').WikiGearType[]>(`${wikiBase}/gear_types.json`),
    fetchJson<{ nodes: import('../types').WikiRuneNode[] }>(`${wikiBase}/rune_tree.json`),
    fetchJson<import('../types').WikiPet[]>(`${wikiBase}/t/pets.json`),
    fetchJson<import('../types').WikiPetStat[]>(`${wikiBase}/t/pet_stats.json`),
  ]);

  return { heroes, passives, items, itemsDetail, gearTypes, runeTree, pets, petStats };
}

export async function loadAllData() {
  const [enriched, wiki] = await Promise.all([loadEnrichedData(), loadWikiRefData()]);
  return { ...enriched, wiki };
}
