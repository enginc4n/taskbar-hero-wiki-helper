import type {
  EffectMaterial,
  EnrichedHero,
  EnrichedItem,
  MetaData,
  RuneGraph,
} from '../types';

const ENRICHED_BASE = 'https://www.taskbarherowiki.com/data';
const WIKI_BASE = 'https://www.taskbarhero.wiki/data';

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
    fetchJson<import('../types').WikiHero[]>(`${WIKI_BASE}/heroes.json`),
    fetchJson<import('../types').WikiPassive[]>(`${WIKI_BASE}/passive_skills.json`),
    fetchJson<import('../types').WikiItem[]>(`${WIKI_BASE}/items.json`),
    fetchJson<Record<string, import('../types').WikiItemDetail>>(`${WIKI_BASE}/items_detail.json`),
    fetchJson<import('../types').WikiGearType[]>(`${WIKI_BASE}/gear_types.json`),
    fetchJson<{ nodes: import('../types').WikiRuneNode[] }>(`${WIKI_BASE}/rune_tree.json`),
    fetchJson<import('../types').WikiPet[]>(`${WIKI_BASE}/t/pets.json`),
    fetchJson<import('../types').WikiPetStat[]>(`${WIKI_BASE}/t/pet_stats.json`),
  ]);

  return { heroes, passives, items, itemsDetail, gearTypes, runeTree, pets, petStats };
}

export async function loadAllData() {
  const [enriched, wiki] = await Promise.all([loadEnrichedData(), loadWikiRefData()]);
  return { ...enriched, wiki };
}
