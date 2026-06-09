import type { EnrichedPet } from '@/content/guides/pets-farming';
import type {
  EffectMaterial,
  EnrichedHero,
  EnrichedItem,
  MetaData,
  RuneGraph,
} from '@/core/types';

const ENRICHED_REMOTE = 'https://www.taskbarherowiki.com/data';
const WIKI_REMOTE = 'https://www.taskbarhero.wiki/data';

export function isObtainableItem(item: EnrichedItem): boolean {
  return item.obtainable !== false;
}

/** Same-origin /test/* JSON when running Vite dev server. */
function getLocalTestBase(): string | null {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null;
  return new URL(`${import.meta.env.BASE_URL}test`, window.location.origin).pathname.replace(
    /\/$/,
    '',
  );
}

function getEnrichedBase(): string {
  const local = getLocalTestBase();
  if (local) return `${local}/enriched`;
  return ENRICHED_REMOTE;
}

/** Browser prod: bundled wiki-data. Browser dev: test/wiki. Node: remote wiki. */
function getWikiBase(): string {
  const local = getLocalTestBase();
  if (local) return `${local}/wiki`;
  if (typeof window === 'undefined') {
    return WIKI_REMOTE;
  }
  return new URL(`${import.meta.env.BASE_URL}wiki-data`, window.location.origin).pathname.replace(
    /\/$/,
    '',
  );
}

const cache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then(async (res) => {
        if (!res.ok) {
          const hint =
            import.meta.env.DEV && url.includes('/test/')
              ? ' Run `npm run sync-test-data` to populate test/enriched and test/wiki.'
              : '';
          throw new Error(`Failed to fetch ${url}: ${res.status}${hint}`);
        }
        return res.json() as Promise<T>;
      }),
    );
  }
  return cache.get(url) as Promise<T>;
}

export async function loadEnrichedData() {
  const base = getEnrichedBase();
  const [items, heroes, effects, runes, meta, pets] = await Promise.all([
    fetchJson<EnrichedItem[]>(`${base}/items.json`),
    fetchJson<EnrichedHero[]>(`${base}/heroes.json`),
    fetchJson<EffectMaterial[]>(`${base}/effects.json`),
    fetchJson<RuneGraph>(`${base}/runes.json`),
    fetchJson<MetaData>(`${base}/meta.json`),
    fetchJson<EnrichedPet[]>(`${base}/pets.json`),
  ]);

  return { items, heroes, effects, runes, meta, pets };
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
    fetchJson<import('@/core/types').WikiHero[]>(`${wikiBase}/heroes.json`),
    fetchJson<import('@/core/types').WikiPassive[]>(`${wikiBase}/passive_skills.json`),
    fetchJson<import('@/core/types').WikiItem[]>(`${wikiBase}/items.json`),
    fetchJson<Record<string, import('@/core/types').WikiItemDetail>>(`${wikiBase}/items_detail.json`),
    fetchJson<import('@/core/types').WikiGearType[]>(`${wikiBase}/gear_types.json`),
    fetchJson<{ nodes: import('@/core/types').WikiRuneNode[] }>(`${wikiBase}/rune_tree.json`),
    fetchJson<import('@/core/types').WikiPet[]>(`${wikiBase}/t/pets.json`),
    fetchJson<import('@/core/types').WikiPetStat[]>(`${wikiBase}/t/pet_stats.json`),
  ]);

  return { heroes, passives, items, itemsDetail, gearTypes, runeTree, pets, petStats };
}

export async function loadAllData() {
  const [enriched, wiki] = await Promise.all([loadEnrichedData(), loadWikiRefData()]);
  const allItems = enriched.items;
  return {
    ...enriched,
    allItems,
    items: allItems.filter(isObtainableItem),
    wiki,
  };
}
