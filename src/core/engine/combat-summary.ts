import { getSelectedHero } from '../simulator/build-state';
import type { ComputedStats, HeroSaveData, PlayerSaveData, RefMaps } from '../types';
import { computeAllStats, computeBasicDps } from './stats';

export interface CombatSummary {
  stats: ComputedStats;
  dps: number;
  baselineStats: ComputedStats;
  baselineDps: number;
}

/** Shared forge + prepared combat snapshot (stats + basic-attack DPS). */
export function computeCombatSummary(
  hero: HeroSaveData,
  working: PlayerSaveData,
  refs: RefMaps,
  baseline: PlayerSaveData | null,
  heroKey: number,
): CombatSummary {
  const stats = computeAllStats(hero, working, refs);
  const dps = computeBasicDps(stats);
  const baselineHero = baseline ? getSelectedHero(baseline, heroKey) : null;
  const baselineStats =
    baseline && baselineHero ? computeAllStats(baselineHero, baseline, refs) : stats;
  const baselineDps = computeBasicDps(baselineStats);
  return { stats, dps, baselineStats, baselineDps };
}

export interface DpsBarSummary {
  dpsValue: string;
  dpsDeltaHtml: string;
  dpsBarPct: number;
}

export function formatDpsBarSummary(
  summary: CombatSummary,
  hasBaseline: boolean,
  deltaHtml: (positive: boolean, text: string) => string,
): DpsBarSummary {
  const { dps, baselineDps } = summary;
  const dpsDelta = dps - baselineDps;
  const dpsPct = baselineDps === 0 ? 0 : (dps / baselineDps - 1) * 100;

  return {
    dpsValue: dps.toLocaleString(undefined, { maximumFractionDigits: 1 }),
    dpsDeltaHtml: hasBaseline
      ? deltaHtml(
          dpsDelta >= 0,
          `${dpsDelta >= 0 ? '+' : ''}${Math.round(dpsDelta).toLocaleString()} (${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(1)}%)`,
        )
      : '',
    dpsBarPct: hasBaseline
      ? Math.min(100, Math.max(8, 50 + dpsPct / 2))
      : Math.min(100, Math.max(20, (dps / Math.max(baselineDps, dps, 1)) * 50)),
  };
}
