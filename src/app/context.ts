import type { buildRefMaps } from '@/data/adapters';
import type { EnrichedPet } from '@/content/guides/pets-farming';
import type {
  EffectMaterial,
  EnrichedHero,
  EnrichedItem,
  MetaData,
  RuneGraph,
} from '@/core/types';

/** Loaded game data shared across all pages. */
export interface AppContext {
  items: EnrichedItem[];
  allItems: EnrichedItem[];
  heroes: EnrichedHero[];
  effects: EffectMaterial[];
  runes: RuneGraph;
  meta: MetaData;
  pets: EnrichedPet[];
  wiki: Parameters<typeof buildRefMaps>[0];
}

/** @deprecated Use AppContext */
export type SimulatorContext = AppContext;
