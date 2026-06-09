import type {
  EnrichedHero,
  EnrichedItem,
  RefMaps,
  RuneGraph,
  WikiHero,
  WikiItem,
  WikiItemDetail,
  WikiPassive,
  WikiPetStat,
} from '../types';

export function buildRefMaps(wiki: {
  heroes: WikiHero[];
  passives: WikiPassive[];
  items: WikiItem[];
  itemsDetail: Record<string, WikiItemDetail>;
  gearTypes: import('../types').WikiGearType[];
  runeTree: { nodes: import('../types').WikiRuneNode[] };
  pets: import('../types').WikiPet[];
  petStats: WikiPetStat[];
}): RefMaps {
  const petStatsByKey = new Map<number, WikiPetStat[]>();
  for (const row of wiki.petStats) {
    const key = row.PetKey;
    if (key == null) continue;
    const list = petStatsByKey.get(key) ?? [];
    list.push(row);
    petStatsByKey.set(key, list);
  }

  return {
    heroByKey: new Map(wiki.heroes.map((h) => [h.HeroKey, h])),
    passiveByKey: new Map(wiki.passives.map((p) => [p.PassiveSkillKey, p])),
    itemById: new Map(wiki.items.map((i) => [i.id, i])),
    itemDetailById: new Map(Object.entries(wiki.itemsDetail)),
    gearTypeByName: new Map(wiki.gearTypes.map((g) => [g.GearType, g])),
    runeNodeByKey: new Map(wiki.runeTree.nodes.map((n) => [n.key, n])),
    petByKey: new Map(wiki.pets.map((p) => [p.PetKey, p])),
    petStatsByKey,
  };
}

/** Enriched hero stats use display units; engine/wiki raw data uses per-mille for these. */
const ENRICHED_PER_MILLE_STATS = new Set(['CriticalChance', 'CriticalDamage']);

function enrichedStatToEngineRaw(stat: string, value: number): number {
  return ENRICHED_PER_MILLE_STATS.has(stat) ? value * 10 : value;
}

export function enrichedHeroToWikiHero(hero: EnrichedHero): WikiHero {
  const mapped: WikiHero = {
    HeroKey: hero.key,
    attributes: [],
  };

  for (const s of hero.stats) {
    (mapped as unknown as Record<string, number>)[s.stat] = enrichedStatToEngineRaw(s.stat, s.value);
  }

  for (const group of hero.tree) {
    for (const node of group.nodes) {
      if (node.kind !== 'passive' || !node.stat || node.stat === 'NONE') continue;
      mapped.attributes!.push({ key: node.key, type: 'PASSIVESKILL' });
    }
  }

  return mapped;
}

export function enrichedPassiveMap(heroes: EnrichedHero[]): Map<number, WikiPassive> {
  const map = new Map<number, WikiPassive>();
  for (const hero of heroes) {
    for (const group of hero.tree) {
      for (const node of group.nodes) {
        if (node.kind !== 'passive' || !node.stat || node.stat === 'NONE') continue;
        const perPoint = parseFloat((node.perPoint ?? '+0').replace(/[^0-9.-]/g, '')) || 0;
        map.set(node.key, {
          PassiveSkillKey: node.key,
          STATTYPE: node.stat,
          MODTYPE: (node.mod as WikiPassive['MODTYPE']) ?? 'FLAT',
          Value: perPoint,
        });
      }
    }
  }
  return map;
}

export function enrichedItemToWikiItem(item: EnrichedItem): WikiItem {
  return {
    id: item.key,
    name: item.name,
    grade: item.grade,
    type: item.type,
    gear: item.gearType ?? null,
    level: item.level ?? null,
    deleted: item.obtainable === false,
  };
}

export function enrichedItemToDetail(item: EnrichedItem): WikiItemDetail | null {
  if (!item.stats?.base?.length && !item.stats?.inherent?.length) return null;

  const stats: NonNullable<WikiItemDetail['stats']> = { GearKey: item.key };
  const base = item.stats?.base ?? [];
  if (base[0]) {
    stats.BaseStat1_STATTYPE = base[0].stat;
    stats.BaseStat1_MODTYPE = String(base[0].mod);
    stats.BaseStat1_Value = base[0].value;
  }
  if (base[1]) {
    stats.BaseStat2_STATTYPE = base[1].stat;
    stats.BaseStat2_MODTYPE = String(base[1].mod);
    stats.BaseStat2_Value = base[1].value;
  }

  const inherent = item.stats?.inherent ?? [];
  for (let i = 0; i < Math.min(3, inherent.length); i++) {
    const row = inherent[i];
    const n = i + 1;
    (stats as Record<string, unknown>)[`InherentStat${n}_STATTYPE`] = row.stat;
    (stats as Record<string, unknown>)[`InherentStat${n}_MODTYPE`] = row.mod;
    (stats as Record<string, unknown>)[`InherentStat${n}_Value`] = row.value;
  }

  return { stats };
}

export function mergeRefMaps(
  base: RefMaps,
  enriched: { items: EnrichedItem[]; heroes: EnrichedHero[]; runes: RuneGraph },
): RefMaps {
  const itemById = new Map(base.itemById);
  const itemDetailById = new Map(base.itemDetailById);
  const heroByKey = new Map(base.heroByKey);
  const passiveByKey = new Map(base.passiveByKey);
  const runeNodeByKey = new Map(base.runeNodeByKey);

  for (const item of enriched.items) {
    itemById.set(item.key, enrichedItemToWikiItem(item));
    const detail = enrichedItemToDetail(item);
    if (detail) itemDetailById.set(String(item.key), detail);
  }

  for (const hero of enriched.heroes) {
    const wikiHero = heroByKey.get(hero.key);
    const mapped = enrichedHeroToWikiHero(hero);
    if (wikiHero) {
      // Wiki datamine has engine-raw stat values; enriched only supplies tree/attributes.
      heroByKey.set(hero.key, {
        ...wikiHero,
        attributes: mapped.attributes?.length ? mapped.attributes : wikiHero.attributes,
      });
    } else {
      heroByKey.set(hero.key, mapped);
    }
  }

  for (const [key, passive] of enrichedPassiveMap(enriched.heroes)) {
    if (!passiveByKey.has(key)) passiveByKey.set(key, passive);
  }

  for (const node of enriched.runes.runes) {
    if (!node.stat || runeNodeByKey.has(node.key)) continue;
    const levels = (node.levels ?? []).map((l) => ({
      level: l.level,
      value:
        typeof l.value === 'number'
          ? l.value
          : parseFloat(String(l.value).replace(/[^0-9.-]/g, '')) || 0,
    }));
    runeNodeByKey.set(node.key, { key: node.key, stat: node.stat, levels });
  }

  return {
    ...base,
    itemById,
    itemDetailById,
    heroByKey,
    passiveByKey,
    runeNodeByKey,
  };
}
