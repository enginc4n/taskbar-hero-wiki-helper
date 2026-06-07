import { mergeRefMaps, buildRefMaps, enrichedItemToDetail } from '../data/adapters';
import {
  PREPARED_LEVEL_STEPS,
  applyPreparedMilestone,
  loadPreparedBuild,
  loadPreparedBuildIndex,
  milestoneForStep,
  normalizePreparedBuild,
  type PreparedBuild,
  type PreparedBuildManifestEntry,
} from '../data/prepared-builds';
import { heroCombatRunesForPanel, runeBenefitDescription, runeBenefitLabel } from '../data/runes';
import {
  HERO_GEAR_LEFT,
  HERO_GEAR_RIGHT,
  heroIllustFrameMs,
  gameUiUrl,
  heroIllustUrl,
  preloadHeroIllustFrames,
  renderGearSlotHtml,
} from '../data/game-ui';
import { itemIconHtml, itemIconUrl, runeIconUrl } from '../data/icons';
import { statIconHtml } from '../data/stat-icons';
import { classGlyph, rarityClass, RUNE_VAULT_ICON } from '../data/rpg-ui';
import { computeAllStats, computeBasicDps, compareStats, formatStatValue, formatDelta } from '../engine/stats';
import type { ComputedStats } from '../types';
import { parseSaveFile, isSaveFileError, DEFAULT_ES3_PASSWORD } from '../engine/save-decrypt';
import {
  clonePlayerSave,
  createEmptySave,
  equipItem,
  unequipPart,
  getPassiveLevel,
  getRuneLevel,
  getSelectedHero,
  canInvestMoreSkillPoints,
  normalizePlayerSave,
  partIndex,
  setPassiveLevel,
  setRuneLevel,
  syncAttributeGroupUnlocks,
  syncSaveItemKeys,
  type SocketSlotState,
} from '../simulator/build-state';
import type {
  EffectMaterial,
  EnrichedHero,
  EnrichedItem,
  HeroPart,
  MetaData,
  PlayerSaveData,
  RefMaps,
  RuneGraph,
  RuneNode,
} from '../types';
import { heroClassLabel, heroNameLabel } from '../i18n/hero-class';
import { partLabel, t, type TranslationKey } from '../i18n';
import { filterGear, DEFAULT_GEAR_FILTER, gradeClass, itemMatchesHeroClass, type GearFilterState } from '../gear/filter';
import { navHref, syncHash } from '../router';
import { openSocketEditorModal } from './socket-editor-modal';
import {
  captureSkillPathScrollTop,
  refreshSkillPathTiers,
  renderSkillPathPanel,
  restoreSkillPathScrollTop,
  type SkillPathPanelContext,
} from './skill-path-panel';

export interface SimulatorContext {
  items: EnrichedItem[];
  allItems: EnrichedItem[];
  heroes: EnrichedHero[];
  effects: EffectMaterial[];
  runes: RuneGraph;
  meta: MetaData;
  wiki: Parameters<typeof buildRefMaps>[0];
}

interface SimState {
  baseline: PlayerSaveData | null;
  working: PlayerSaveData;
  heroKey: number;
  refs: RefMaps;
  itemsByKey: Map<number, EnrichedItem>;
  effectsByKey: Map<number, EffectMaterial>;
  socketDraft: Map<string, SocketSlotState[]>;
}

const STAT_ROW_KEYS: { key: keyof ComputedStats; labelKey: TranslationKey; featured?: boolean }[] = [
  { key: 'AttackDamage', labelKey: 'stat.attackDamage' },
  { key: 'MaxHp', labelKey: 'stat.vitality' },
  { key: 'Armor', labelKey: 'stat.armor' },
  { key: 'AttackSpeed', labelKey: 'stat.attackSpeed' },
  { key: 'CriticalChance', labelKey: 'stat.criticalChance' },
  { key: 'CriticalDamage', labelKey: 'stat.criticalDamage' },
  { key: 'MovementSpeed', labelKey: 'stat.movementSpeed' },
  { key: 'CooldownReduction', labelKey: 'stat.cooldownReduction' },
  { key: 'CastSpeed', labelKey: 'stat.castSpeed' },
];

const RUNE_STAT_LABEL_KEYS: Partial<Record<string, TranslationKey>> = {
  AllHeroAttackDamage: 'stat.attackDamage',
  AllHeroAttackDamagePercent: 'stat.attackDamage',
  AllHeroArmor: 'stat.armor',
  AllHeroArmorPercent: 'stat.armor',
  AllHeroAttackSpeed: 'stat.attackSpeed',
  AllHeroMoveSpeed: 'stat.movementSpeed',
};

export interface SimulatorPageOptions {
  initialMode?: 'forge' | 'prepared';
  runesOpen?: boolean;
  initialHeroKey?: number;
  initialPreparedBuildId?: string;
}

export function renderSimulatorPage(
  root: HTMLElement,
  ctx: SimulatorContext,
  options: SimulatorPageOptions = {},
): void {
  const refs = mergeRefMaps(buildRefMaps(ctx.wiki), {
    items: ctx.items,
    heroes: ctx.heroes,
    runes: ctx.runes,
  });

  const defaultHeroKey = ctx.heroes[0]?.key ?? 101;
  const initialHeroKey =
    options.initialHeroKey != null &&
    ctx.heroes.some((h) => h.key === options.initialHeroKey)
      ? options.initialHeroKey
      : defaultHeroKey;

  const state: SimState = {
    baseline: null,
    working: createEmptySave(initialHeroKey),
    heroKey: initialHeroKey,
    refs,
    itemsByKey: syncSaveItemKeys(createEmptySave(initialHeroKey), ctx.allItems),
    effectsByKey: new Map(ctx.effects.map((e) => [e.key, e])),
    socketDraft: new Map(),
  };

  let portraitAnimTimer: ReturnType<typeof setInterval> | null = null;
  let portraitAnimGeneration = 0;
  let chronicleHeightObs: ResizeObserver | null = null;
  let runeChamberOpen = options.runesOpen ?? false;

  type WorkspaceMode = 'forge' | 'prepared';
  let workspaceMode: WorkspaceMode = options.initialMode ?? 'forge';
  let forgeSnapshot: PlayerSaveData | null = null;
  let preparedManifest: PreparedBuildManifestEntry[] = [];
  let preparedBuildCache = new Map<string, PreparedBuild>();
  let selectedPreparedBuild: PreparedBuild | null = null;
  let preparedLevelIndex = 0;
  let preparedHeroFilterKey: number | null = null;

  function isPreparedReadOnly(): boolean {
    return workspaceMode === 'prepared' && selectedPreparedBuild !== null;
  }

  function applyPreparedView(): void {
    const build = selectedPreparedBuild;
    if (!build) return;
    const def = ctx.heroes.find((h) => h.key === build.heroKey);
    const milestone = milestoneForStep(build, preparedLevelIndex);
    if (!def || !milestone) return;

    const previewLevel = PREPARED_LEVEL_STEPS[preparedLevelIndex] ?? milestone.heroLevel;

    state.heroKey = build.heroKey;
    applyPreparedMilestone(
      state.working,
      def,
      milestone,
      ctx.allItems,
      state.itemsByKey,
      previewLevel,
    );
    state.itemsByKey = syncSaveItemKeys(state.working, ctx.allItems);
    for (const inst of state.working.itemSaveDatas) {
      const enriched = state.itemsByKey.get(inst.ItemKey);
      const detail = enriched ? enrichedItemToDetail(enriched) : null;
      if (detail) state.refs.itemDetailById.set(String(inst.ItemKey), detail);
    }
  }

  const pendingPreparedBuildId = options.initialPreparedBuildId;

  loadPreparedBuildIndex()
    .then(async (builds) => {
      preparedManifest = builds;
      if (workspaceMode === 'prepared' && pendingPreparedBuildId) {
        await selectPreparedBuildById(pendingPreparedBuildId);
        return;
      }
      if (workspaceMode === 'prepared') draw();
    })
    .catch(() => {
      preparedManifest = [];
    });

  function stopPortraitAnim(): void {
    portraitAnimGeneration += 1;
    if (portraitAnimTimer !== null) {
      clearInterval(portraitAnimTimer);
      portraitAnimTimer = null;
    }
  }

  function startPortraitAnim(): void {
    stopPortraitAnim();
    const generation = portraitAnimGeneration;
    const heroKey = state.heroKey;
    const frameUrls = preloadHeroIllustFrames(heroKey);
    const frameMs = heroIllustFrameMs(heroKey);
    if (frameUrls.length <= 1) return;

    void Promise.all(
      frameUrls.map((url) => {
        const preload = new Image();
        preload.src = url;
        return preload.decode?.().catch(() => undefined) ?? Promise.resolve();
      }),
    ).then(() => {
      if (generation !== portraitAnimGeneration) return;

      const imgs = root.querySelectorAll<HTMLImageElement>('.hero-portrait');
      if (!imgs.length) return;

      let frame = 0;
      imgs.forEach((img) => {
        img.src = frameUrls[0]!;
      });

      portraitAnimTimer = setInterval(() => {
        frame = (frame + 1) % frameUrls.length;
        const next = frameUrls[frame]!;
        imgs.forEach((img) => {
          img.src = next;
        });
      }, frameMs);
    });
  }

  function itemForPart(part: HeroPart): EnrichedItem | undefined {
    const hero = heroSave();
    if (!hero) return undefined;
    const uid = hero.equippedItemIds[partIndex(part)];
    const inst = uid ? state.working.itemSaveDatas.find((i) => String(i.UniqueId) === String(uid)) : null;
    return inst ? state.itemsByKey.get(inst.ItemKey) : undefined;
  }

  function itemHasSockets(item: EnrichedItem): boolean {
    const slots = item.slots;
    if (!slots) return false;
    return slots.decoration + slots.engraving + slots.inscription > 0;
  }

  function heroDef(): EnrichedHero | undefined {
    return ctx.heroes.find((h) => h.key === state.heroKey);
  }

  function heroSave() {
    return getSelectedHero(state.working, state.heroKey);
  }

  function heroPortraitUrl(hero: EnrichedHero | undefined): string | null {
    if (!hero) return null;
    return itemIconUrl(hero.icon ?? hero.art);
  }

  function drawHeroPortraitMini(hero: EnrichedHero | undefined, fallbackLetter: string): string {
    const portrait = heroPortraitUrl(hero);
    return `
      <span class="build-hero-portrait" aria-hidden="true">
        ${
          portrait
            ? `<img class="build-hero-portrait-img pixel-art" src="${portrait}" alt="" loading="lazy" />`
            : `<span class="build-hero-portrait-fallback">${fallbackLetter}</span>`
        }
        <img class="build-hero-portrait-frame pixel-art" src="${gameUiUrl('HeroSlot_OuterBoader_Arranged.png')}" alt="" />
      </span>`;
  }

  function drawBuildHeroPicker(hero: EnrichedHero | undefined, heroName: string): string {
    const menuOptions = ctx.heroes
      .map((h) => {
        const name = heroNameLabel(h.name);
        const cls = heroClassLabel(h.class);
        const saveHero = getSelectedHero(state.working, h.key);
        const locked = saveHero ? !saveHero.IsUnLock : false;
        const selected = h.key === state.heroKey;
        const showClass = cls && cls !== name;

        return `
          <li role="presentation">
            <button
              type="button"
              role="option"
              class="build-hero-option${selected ? ' is-selected' : ''}${locked ? ' is-locked' : ''}"
              data-action="hero-pick"
              data-hero-key="${h.key}"
              aria-selected="${selected}"
              ${locked ? 'disabled aria-disabled="true"' : ''}
            >
              ${drawHeroPortraitMini(h, name[0] ?? '?')}
              <span class="build-hero-option-copy">
                <span class="build-hero-option-name">${name}</span>
                ${showClass ? `<span class="build-hero-option-meta">${cls}</span>` : ''}
              </span>
              ${locked ? '<span class="build-hero-option-lock" aria-hidden="true">🔒</span>' : ''}
            </button>
          </li>`;
      })
      .join('');

    return `
      <div class="build-hero-picker" data-hero-picker>
        <button
          type="button"
          class="build-hero-trigger"
          data-action="hero-toggle"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-label="${t('build.selectHero')}"
        >
          ${drawHeroPortraitMini(hero, heroName[0] ?? '?')}
          <span class="build-hero-trigger-name">${heroName}</span>
          <span class="build-hero-trigger-caret" aria-hidden="true">▾</span>
        </button>
        <ul class="build-hero-menu" role="listbox" aria-label="${t('build.selectHero')}" hidden>
          ${menuOptions}
        </ul>
      </div>`;
  }

  function preparedManifestHeroes(): EnrichedHero[] {
    const keys = new Set(preparedManifest.map((entry) => entry.heroKey));
    return ctx.heroes.filter((h) => keys.has(h.key));
  }

  function drawPreparedHeroFilter(): string {
    const heroes = preparedManifestHeroes();
    const activeHero =
      preparedHeroFilterKey != null
        ? ctx.heroes.find((h) => h.key === preparedHeroFilterKey)
        : undefined;
    const triggerName = activeHero ? heroNameLabel(activeHero.name) : t('build.filterAllHeroes');
    const triggerPortrait = activeHero
      ? drawHeroPortraitMini(activeHero, heroNameLabel(activeHero.name)[0] ?? '?')
      : `
      <span class="build-hero-portrait" aria-hidden="true">
        <span class="build-hero-portrait-fallback">★</span>
        <img class="build-hero-portrait-frame pixel-art" src="${gameUiUrl('HeroSlot_OuterBoader_Arranged.png')}" alt="" />
      </span>`;

    const allOption = `
      <li role="presentation">
        <button
          type="button"
          role="option"
          class="build-hero-option${preparedHeroFilterKey === null ? ' is-selected' : ''}"
          data-action="prepared-hero-filter"
          data-hero-key=""
          aria-selected="${preparedHeroFilterKey === null}"
        >
          <span class="build-hero-portrait" aria-hidden="true">
            <span class="build-hero-portrait-fallback">★</span>
            <img class="build-hero-portrait-frame pixel-art" src="${gameUiUrl('HeroSlot_OuterBoader_Arranged.png')}" alt="" />
          </span>
          <span class="build-hero-option-copy">
            <span class="build-hero-option-name">${t('build.filterAllHeroes')}</span>
          </span>
        </button>
      </li>`;

    const menuOptions = heroes
      .map((h) => {
        const name = heroNameLabel(h.name);
        const cls = heroClassLabel(h.class);
        const selected = h.key === preparedHeroFilterKey;
        const showClass = cls && cls !== name;

        return `
          <li role="presentation">
            <button
              type="button"
              role="option"
              class="build-hero-option${selected ? ' is-selected' : ''}"
              data-action="prepared-hero-filter"
              data-hero-key="${h.key}"
              aria-selected="${selected}"
            >
              ${drawHeroPortraitMini(h, name[0] ?? '?')}
              <span class="build-hero-option-copy">
                <span class="build-hero-option-name">${name}</span>
                ${showClass ? `<span class="build-hero-option-meta">${cls}</span>` : ''}
              </span>
            </button>
          </li>`;
      })
      .join('');

    return `
      <div class="build-hero-picker prepared-hero-filter" data-hero-picker data-prepared-filter>
        <button
          type="button"
          class="build-hero-trigger"
          data-action="hero-toggle"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-label="${t('build.filterByHero')}"
        >
          ${triggerPortrait}
          <span class="build-hero-trigger-name">${triggerName}</span>
          <span class="build-hero-trigger-caret" aria-hidden="true">▾</span>
        </button>
        <ul class="build-hero-menu" role="listbox" aria-label="${t('build.filterByHero')}" hidden>
          ${allOption}
          ${menuOptions}
        </ul>
      </div>`;
  }

  function drawBuildToolbar(): string {
    if (workspaceMode === 'prepared' && selectedPreparedBuild === null) return '';

    const hero = heroDef();
    const hasBaseline = !!state.baseline;
    const heroName = hero ? heroNameLabel(hero.name) : t('build.unknown');

    const heroControl = workspaceMode === 'forge' ? drawBuildHeroPicker(hero, heroName) : '';

    const baselineStatus = `
      <span class="guild-status ${workspaceMode === 'prepared' ? 'is-prepared' : hasBaseline ? 'is-set' : ''}" role="status">
        <span class="guild-status-dot" aria-hidden="true"></span>
        ${workspaceMode === 'prepared'
          ? selectedPreparedBuild?.name ?? t('build.preparedBuilds')
          : hasBaseline
            ? t('build.baselineActive')
            : t('build.noBaseline')}
      </span>`;

    return `
      <header class="build-toolbar" aria-label="Build workspace">
        <div class="build-toolbar-inner">
          ${heroControl}
          <div class="build-toolbar-workspace">
            ${baselineStatus}
            <div class="build-toolbar-actions guild-actions">
              ${workspaceMode === 'forge' ? `
              <label class="rpg-btn rpg-btn--ghost">
                <span class="rpg-btn-shine" aria-hidden="true"></span>
                📥 ${t('build.loadSave')}
                <input type="file" accept=".es3,.bak" data-action="load-save" hidden />
              </label>
              <button type="button" class="rpg-btn rpg-btn--ghost" data-action="new-build">✨ ${t('build.newBuild')}</button>
              <button type="button" class="rpg-btn rpg-btn--gold" data-action="set-baseline">
                <span class="rpg-btn-shine" aria-hidden="true"></span>
                📌 ${t('build.setBaseline')}
              </button>` : `
              <span class="guild-prepared-badge text-ui" role="status">${t('build.viewOnly')}</span>`}
            </div>
          </div>
        </div>
      </header>`;
  }

  function drawPreparedBuildsRail(): string {
    if (workspaceMode !== 'prepared' || selectedPreparedBuild !== null) return '';

    const filteredManifest =
      preparedHeroFilterKey == null
        ? preparedManifest
        : preparedManifest.filter((entry) => entry.heroKey === preparedHeroFilterKey);

    const cards = filteredManifest
      .map((entry) => {
        const selected = selectedPreparedBuild?.id === entry.id;
        const glyph = classGlyph(entry.heroClass ?? '');
        return `
          <button
            type="button"
            class="prepared-build-card${selected ? ' is-selected' : ''}"
            data-action="pick-prepared"
            data-id="${entry.id}"
            aria-pressed="${selected}"
          >
            <span class="prepared-build-glyph" aria-hidden="true">${glyph}</span>
            <span class="prepared-build-name">${entry.name}</span>
            <span class="prepared-build-class">${heroClassLabel(entry.heroClass)}</span>
            ${entry.description ? `<span class="prepared-build-desc">${entry.description}</span>` : ''}
          </button>`;
      })
      .join('');

    const emptyMessage =
      preparedManifest.length === 0
        ? t('build.noPreparedBuilds')
        : t('build.noPreparedBuildsForHero');

    return `
      <section class="prepared-builds-rail" aria-label="Prepared builds">
        <div class="prepared-builds-rail-head">
          <div class="prepared-builds-rail-title">
            <p class="text-kicker">${t('build.guildArchives')}</p>
            <h3 class="rpg-panel-title">${t('build.preparedBuilds')}</h3>
          </div>
          ${drawPreparedHeroFilter()}
        </div>
        <div class="prepared-build-cards" role="list">
          ${cards || `<p class="prepared-builds-empty">${emptyMessage}</p>`}
        </div>
      </section>`;
  }

  function computeDpsSummary(): {
    dpsValue: string;
    dpsDeltaHtml: string;
    dpsBarPct: number;
  } | null {
    const hero = heroSave();
    if (!hero) return null;

    const current = computeAllStats(hero, state.working, state.refs);
    const dps = computeBasicDps(current);
    const baselineHero = state.baseline ? getSelectedHero(state.baseline, state.heroKey) : null;
    const baselineStats = baselineHero ? computeAllStats(baselineHero, state.baseline!, state.refs) : current;
    const baselineDps = computeBasicDps(baselineStats);
    const dpsDelta = dps - baselineDps;
    const dpsPct = baselineDps === 0 ? 0 : (dps / baselineDps - 1) * 100;

    function deltaHtml(positive: boolean, text: string): string {
      return `<span class="attr-delta ${positive ? 'positive' : 'negative'}">${text}</span>`;
    }

    const dpsValue = Math.round(dps).toLocaleString();
    const dpsDeltaHtml = state.baseline
      ? deltaHtml(
          dpsDelta >= 0,
          `${dpsDelta >= 0 ? '+' : ''}${Math.round(dpsDelta).toLocaleString()} (${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(1)}%)`,
        )
      : '';

    const dpsBarPct = state.baseline
      ? Math.min(100, Math.max(8, 50 + dpsPct / 2))
      : Math.min(100, Math.max(20, (dps / Math.max(baselineDps, dps, 1)) * 50));

    return { dpsValue, dpsDeltaHtml, dpsBarPct };
  }

  function renderGearSlot(part: HeroPart): string {
    const item = itemForPart(part);
    return renderGearSlotHtml({
      part,
      item,
      hasSockets: item ? itemHasSockets(item) : false,
      readOnly: isPreparedReadOnly(),
    });
  }

  function gearSide(rows: HeroPart[][], side: 'left' | 'right'): string {
    return `
      <div class="equip-side equip-side--${side}">
        ${rows
          .map(
            (row) => `
          <div class="equip-row">${row.map((part) => renderGearSlot(part)).join('')}</div>`,
          )
          .join('')}
      </div>`;
  }

  function drawDpsBlock(): string {
    const dps = computeDpsSummary();
    if (!dps) return '';

    return `
      <aside class="char-sheet-dps char-sheet-dps--aside" aria-label="${t('build.basicAttackDps')}">
        <div class="char-sheet-dps-icon" aria-hidden="true">${statIconHtml('Dps')}</div>
        <div class="loadout-dps-copy">
          <div class="char-sheet-dps-label">${t('build.basicAttackDps')}</div>
          <div class="char-sheet-dps-value">${dps.dpsValue}</div>
          ${dps.dpsDeltaHtml}
          <div class="loadout-dps-track" aria-hidden="true">
            <div class="loadout-dps-bar" style="width: ${dps.dpsBarPct}%"></div>
          </div>
        </div>
      </aside>`;
  }

  function drawLoadoutHead(): string {
    const runeBtn = drawRuneVaultButton();
    if (!runeBtn) return '';

    return `<header class="loadout-head">${runeBtn}</header>`;
  }

  function drawLoadoutStage(): string {
    const hero = heroDef();
    const save = heroSave();
    if (!hero || !save) return '';

    const displayName = heroNameLabel(hero.name);
    const displayClass = heroClassLabel(hero.class);
    const showClass = displayClass && displayClass !== displayName;

    return `
      <section class="loadout-stage" aria-label="Hero loadout">
        ${drawLoadoutHead()}
        <div class="loadout-scaler">
          <div class="loadout-grid">
            ${gearSide(HERO_GEAR_LEFT, 'left')}
            <div class="loadout-hero-center">
              <h2 class="loadout-hero-name">${displayName}</h2>
              ${showClass ? `<p class="loadout-hero-class">${displayClass}</p>` : ''}
              <div class="equip-portrait-frame">
                <img
                  class="hero-portrait pixel-art"
                  src="${heroIllustUrl(hero.key, 0)}"
                  alt="${t('build.heroPortrait', { name: displayName })}"
                  decoding="async"
                />
              </div>
            </div>
            ${gearSide(HERO_GEAR_RIGHT, 'right')}
          </div>
        </div>
      </section>`;
  }

  function drawCharacterSheet(): string {
    const hero = heroSave();
    if (!hero) return '';
    const current = computeAllStats(hero, state.working, state.refs);
    const baselineHero = state.baseline ? getSelectedHero(state.baseline, state.heroKey) : null;
    const baselineStats = baselineHero ? computeAllStats(baselineHero, state.baseline!, state.refs) : current;
    const deltas = new Map(compareStats(baselineStats, current).map((d) => [d.name, d]));

    function deltaHtml(positive: boolean, text: string): string {
      return `<span class="attr-delta ${positive ? 'positive' : 'negative'}">${text}</span>`;
    }

    function statDelta(key: keyof ComputedStats): string {
      if (!state.baseline) return '';
      const delta = deltas.get(key);
      if (!delta || delta.delta === 0) return '';
      return deltaHtml(delta.delta >= 0, formatDelta(delta));
    }

    const tiles = STAT_ROW_KEYS.map((stat) => {
      const value = formatStatValue(stat.key, current[stat.key]);
      return `
        <div class="attr-tile${stat.featured ? ' attr-tile--featured' : ''}">
          <div class="attr-icon">
            ${statIconHtml(stat.key)}
          </div>
          <span class="attr-label">${t(stat.labelKey)}</span>
          <span class="attr-value">${value}</span>
          ${statDelta(stat.key)}
        </div>`;
    }).join('');

    return `
      <section class="char-sheet-bar" aria-label="Character attributes">
        <div class="rpg-panel char-sheet-panel">
          <div class="rpg-panel-inner char-sheet-inner">
            <header class="char-sheet-head">
              <div class="rpg-panel-head-copy">
                <p class="text-kicker">${t('build.characterSheet')}</p>
                <h3 class="rpg-panel-title">
                  <span class="char-sheet-title-icon" aria-hidden="true">${statIconHtml('Attributes', 'char-sheet-title-icon-svg pixel-art')}</span>
                  ${t('build.attributes')}
                </h3>
              </div>
            </header>
            <div class="char-sheet-body">
              <div class="attr-strip">${tiles}</div>
              ${drawDpsBlock()}
            </div>
          </div>
        </div>
      </section>`;
  }

  function drawRuneVaultButton(): string {
    if (workspaceMode === 'prepared') return '';

    return `
      <button
        type="button"
        class="rune-vault-btn${runeChamberOpen ? ' is-open' : ''}"
        data-action="toggle-rune-chamber"
        aria-pressed="${runeChamberOpen}"
        aria-label="${runeChamberOpen ? t('build.closeRuneVault') : t('build.openRuneVault')}"
        title="${runeChamberOpen ? t('build.closeRuneChamber') : t('build.openRuneChamber')}"
      >
        <img class="rune-vault-btn-icon pixel-art" src="${RUNE_VAULT_ICON}" alt="" />
        <span class="rune-vault-btn-label text-ui">${t('build.runes')}</span>
      </button>`;
  }

  function skillPathContext(): SkillPathPanelContext | null {
    const def = heroDef();
    const heroData = heroSave();
    if (!def || !heroData) return null;
    return {
      variant: 'simulator',
      hero: def,
      working: state.working,
      heroData,
      readOnly: isPreparedReadOnly(),
    };
  }

  function drawChronicleLevelScrubber(): string {
    const level = PREPARED_LEVEL_STEPS[preparedLevelIndex] ?? PREPARED_LEVEL_STEPS[0];
    const maxIndex = PREPARED_LEVEL_STEPS.length - 1;
    const ticks = PREPARED_LEVEL_STEPS.map((step, i) => {
      const pct = maxIndex === 0 ? 0 : (i / maxIndex) * 100;
      return `<button
          type="button"
          class="chronicle-level-tick${i === preparedLevelIndex ? ' is-active' : ''}"
          data-action="prepared-level-pick"
          data-index="${i}"
          style="left: ${pct}%"
          aria-label="${t('build.level', { level: step })}"
          aria-pressed="${i === preparedLevelIndex}"
        >${step}</button>`;
    }).join('');

    return `
      <div class="chronicle-level-scrubber" role="group" aria-label="${t('build.previewHeroLevel')}">
        <div class="chronicle-level-scrubber-head">
          <span class="chronicle-level-label">${t('build.heroLevel')}</span>
          <output class="chronicle-level-readout" for="chronicle-level-range">Lv.${level}</output>
        </div>
        <div class="chronicle-level-track-wrap">
          <input
            id="chronicle-level-range"
            type="range"
            class="chronicle-level-range"
            min="0"
            max="${maxIndex}"
            step="1"
            value="${preparedLevelIndex}"
            data-action="prepared-level-scrub"
            aria-valuemin="${PREPARED_LEVEL_STEPS[0]}"
            aria-valuemax="${PREPARED_LEVEL_STEPS[maxIndex]}"
            aria-valuenow="${level}"
            aria-valuetext="${t('build.level', { level })}"
          />
          <div class="chronicle-level-ticks">${ticks}</div>
        </div>
      </div>`;
  }

  function drawChronicleColumn(): string {
    const levelPanel = isPreparedReadOnly()
      ? `<section class="prepared-level-panel rpg-panel" aria-label="${t('build.previewHeroLevel')}">
          <div class="rpg-panel-inner prepared-level-panel-inner">
            ${drawChronicleLevelScrubber()}
          </div>
        </section>`
      : '';

    return `
      <aside class="chronicle-col">
        ${levelPanel}
        ${drawGuildChronicle()}
      </aside>`;
  }

  function syncPreparedLevelPanelUi(): void {
    const panel = root.querySelector('.prepared-level-panel');
    if (!panel) return;

    const level = PREPARED_LEVEL_STEPS[preparedLevelIndex] ?? PREPARED_LEVEL_STEPS[0];
    const readout = panel.querySelector('.chronicle-level-readout');
    if (readout) readout.textContent = `Lv.${level}`;

    panel.querySelectorAll<HTMLElement>('.chronicle-level-tick').forEach((el) => {
      const i = Number(el.getAttribute('data-index'));
      const active = i === preparedLevelIndex;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-pressed', String(active));
    });

    const range = panel.querySelector<HTMLInputElement>('[data-action="prepared-level-scrub"]');
    if (range && document.activeElement !== range) {
      range.value = String(preparedLevelIndex);
      range.setAttribute('aria-valuenow', String(level));
      range.setAttribute('aria-valuetext', t('build.level', { level }));
    }
  }

  function syncSidePanelHeights(): void {
    const heroHall = root.querySelector<HTMLElement>('.hero-hall');
    const chronicleCol = root.querySelector<HTMLElement>('.chronicle-col');
    const runeSidebar = root.querySelector<HTMLElement>('.rune-sidebar');
    if (!heroHall) return;

    const height = heroHall.offsetHeight;
    if (height <= 0) return;

    const px = `${height}px`;
    for (const panel of [chronicleCol, runeSidebar]) {
      if (!panel) continue;
      if (panel.style.height === px && panel.style.maxHeight === px) continue;
      panel.style.height = px;
      panel.style.maxHeight = px;
    }
  }

  function setupChronicleHeightSync(): void {
    chronicleHeightObs?.disconnect();

    const heroHall = root.querySelector<HTMLElement>('.hero-hall');
    if (!heroHall) return;

    syncSidePanelHeights();
    chronicleHeightObs = new ResizeObserver(() => syncSidePanelHeights());
    chronicleHeightObs.observe(heroHall);
  }

  function draw(): void {
    stopPortraitAnim();
    const scrollState = captureScrollState();
    const showPreparedWorkspace = workspaceMode === 'prepared' && selectedPreparedBuild !== null;
    const showForgeWorkspace = workspaceMode === 'forge';
    const showWorkspace = showPreparedWorkspace || showForgeWorkspace;

    root.innerHTML = `
      <div class="rpg-screen${workspaceMode === 'prepared' ? ' is-prepared-mode' : ''}${showPreparedWorkspace ? ' is-prepared-active' : ''}${isPreparedReadOnly() ? ' is-readonly' : ''}">
        ${drawBuildToolbar()}
        ${drawPreparedBuildsRail()}
        ${showWorkspace ? `
        <div class="rpg-workspace${showForgeWorkspace && runeChamberOpen ? ' rune-open' : ''}">
          ${drawChronicleColumn()}
          <main class="hero-hall rpg-panel">
            <div class="rpg-panel-inner">
              ${drawLoadoutStage()}
              ${drawCharacterSheet()}
            </div>
          </main>
          ${drawRuneChamber()}
        </div>` : ''}
      </div>
      <div id="sim-modal" class="modal-root"></div>
    `;
    bindEvents();
    syncPreparedLevelPanelUi();
    startPortraitAnim();
    requestAnimationFrame(() => {
      syncSidePanelHeights();
      setupChronicleHeightSync();
      restoreScrollState(scrollState);
    });
  }

  function refreshPreparedPreview(): void {
    const scrollState = captureScrollState();
    const ctx = skillPathContext();
    if (ctx) refreshSkillPathTiers(root, ctx);

    const loadout = root.querySelector('.loadout-stage');
    if (loadout) loadout.outerHTML = drawLoadoutStage();

    const charSheet = root.querySelector('.char-sheet-bar');
    if (charSheet) charSheet.outerHTML = drawCharacterSheet();

    syncPreparedLevelPanelUi();
    syncSidePanelHeights();
    restoreScrollState(scrollState);
    startPortraitAnim();
  }

  function setPreparedLevel(index: number): void {
    preparedLevelIndex = Math.max(0, Math.min(PREPARED_LEVEL_STEPS.length - 1, index));
    applyPreparedView();
    refreshPreparedPreview();
  }

  function drawGuildChronicle(): string {
    const ctx = skillPathContext();
    if (!ctx) return '';
    return renderSkillPathPanel({
      ...ctx,
      panelId: 'panel-chronicle',
      ariaLabel: 'Guild Chronicle',
    });
  }

  function runeBenefitDisplayText(rune: RuneNode, level: number): string {
    const description = runeBenefitDescription(rune, level);
    if (!rune.stat) return description;
    const labelKey = RUNE_STAT_LABEL_KEYS[rune.stat];
    if (!labelKey) return description;
    const localizedLabel = t(labelKey);
    return description.replace(runeBenefitLabel(rune), localizedLabel);
  }

  function drawRuneChamber(): string {
    if (workspaceMode === 'prepared') return '';

    const runeSlots = heroCombatRunesForPanel(ctx.runes.runes)
      .map((rune) => {
        const level = getRuneLevel(state.working, rune.key);
        const max = rune.maxLevel ?? 1;
        const icon = runeIconUrl(rune.icon);
        const rarity = rarityClass(level, max);
        const benefit = runeBenefitDisplayText(rune, level);

        const decBtn = `
              <button type="button" class="node-btn rune-slot-btn" data-action="rune-dec" data-key="${rune.key}" aria-label="${t('build.decrease', { name: rune.name })}">−</button>`;
        const incBtn = `
              <button type="button" class="node-btn rune-slot-btn" data-action="rune-inc" data-key="${rune.key}" data-max="${max}" aria-label="${t('build.increase', { name: rune.name })}">+</button>`;
        const readonly = isPreparedReadOnly();

        return `
          <article class="rune-slot ${rarity}" aria-label="${rune.name}, ${benefit}, level ${level} of ${max}">
            <div class="rune-slot-row${readonly ? ' rune-slot-row--readonly' : ''}">
              ${readonly ? '' : decBtn}
              <div class="rune-gem" title="${rune.name}">
                ${icon ? `<img class="rune-gem-icon pixel-art" src="${icon}" alt="" loading="lazy" />` : '<span aria-hidden="true">◆</span>'}
                <span class="rune-gem-lv ${rarity}">${level}/${max}</span>
              </div>
              ${readonly ? '' : incBtn}
              <span class="rune-slot-benefit${level > 0 ? ' is-active' : ''}">${benefit}</span>
            </div>
          </article>`;
      })
      .join('');

    if (!runeChamberOpen) return '';

    return `
      <aside class="rune-sidebar" id="panel-runes" aria-label="Rune Chamber">
        <div class="rpg-panel rune-chamber-panel">
          <div class="rpg-panel-inner rune-chamber-inner">
            <header class="rune-chamber-head">
              <p class="text-kicker rune-chamber-kicker">${t('build.runeChamber')}</p>
              <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--icon rune-chamber-close" data-action="toggle-rune-chamber" aria-label="${t('build.closeRuneChamber')}">✕</button>
            </header>
            <div class="rune-inventory">${runeSlots}</div>
          </div>
        </div>
      </aside>`;
  }

  function captureScrollState(): { chronicleScrollTop: number; runeScrollTop: number; windowScrollY: number } {
    return {
      chronicleScrollTop: captureSkillPathScrollTop(root),
      runeScrollTop: root.querySelector<HTMLElement>('.rune-inventory')?.scrollTop ?? 0,
      windowScrollY: window.scrollY,
    };
  }

  function restoreScrollState(saved: ReturnType<typeof captureScrollState>): void {
    requestAnimationFrame(() => {
      restoreSkillPathScrollTop(root, saved.chronicleScrollTop);
      const runeInv = root.querySelector<HTMLElement>('.rune-inventory');
      if (runeInv) runeInv.scrollTop = saved.runeScrollTop;
      if (window.scrollY !== saved.windowScrollY) window.scrollTo(0, saved.windowScrollY);
    });
  }

  function selectHero(key: number): void {
    state.heroKey = key;
    if (!getSelectedHero(state.working, state.heroKey)) {
      state.working.heroSaveDatas.push(...createEmptySave(state.heroKey).heroSaveDatas);
    }
    draw();
  }

  function openGearPicker(part: HeroPart): void {
    const hero = heroDef();
    if (!hero) return;
    let filter: GearFilterState = { ...DEFAULT_GEAR_FILTER };
    let page = 1;
    const modalRoot = root.querySelector('#sim-modal') as HTMLElement;

    function allowedGear(item: EnrichedItem): boolean {
      if (item.type !== 'GEAR') return false;
      if (item.parts && item.parts !== part) return false;
      if (!itemMatchesHeroClass(item, hero!.class)) return false;
      return true;
    }

    function renderModal(): void {
      const pool = ctx.items.filter(allowedGear);
      const filtered = filterGear(pool, filter);
      const visible = filtered.slice(0, page * 40);
      const equipped = itemForPart(part);

      modalRoot.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal" role="presentation">
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="gear-modal-title">
            <div class="modal-frame">
              <div class="modal-header">
                <div>
                  <p class="text-kicker">${t('gearModal.equipment')}</p>
                  <h3 id="gear-modal-title">${t('gearModal.selectPart', { part: partLabel(part) })}</h3>
                </div>
                <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--icon" data-action="close-modal" aria-label="${t('build.close')}">✕</button>
              </div>
              <div class="gear-modal-body">
                <aside class="gear-modal-filters">
                  <label class="field">
                    <span class="field-label">${t('gearModal.grade')}</span>
                    <select data-field="grade"><option value="ALL">${t('gearModal.allGrades')}</option>${ctx.meta.grades.map((g) => `<option value="${g}">${g}</option>`).join('')}</select>
                  </label>
                  <label class="field">
                    <span class="field-label">${t('gearModal.search')}</span>
                    <input data-field="search" value="${filter.search}" placeholder="${t('gearModal.searchPlaceholder')}" />
                  </label>
                  <p class="small">${t('gearModal.itemsMatch', { count: filtered.length })}</p>
                </aside>
                <div class="gear-modal-results">
                  ${equipped ? `
                  <div class="gear-equipped-bar">
                    <div class="gear-equipped-current">
                      ${itemIconHtml(equipped.icon, equipped.name, 'gear-equipped-icon')}
                      <div class="gear-equipped-meta">
                        <span class="gear-equipped-label">${t('gearModal.equipped')}</span>
                        <span class="gear-equipped-name">${equipped.name}${equipped.variant ? ` (${equipped.variant})` : ''}</span>
                      </div>
                    </div>
                    <button type="button" class="rpg-btn rpg-btn--ghost" data-action="unequip">${t('gearModal.remove')}</button>
                  </div>` : ''}
                  <div class="gear-grid">
                    ${visible
                      .map(
                        (item) => `
                      <article class="gear-card ${gradeClass(item.grade)}">
                        ${itemIconHtml(item.icon, item.name)}
                        <div class="gear-card-body">
                          <h4>${item.name}${item.variant ? ` (${item.variant})` : ''}</h4>
                          <p class="meta">${item.grade} · Lv${item.level ?? '?'}</p>
                        </div>
                        <button type="button" class="rpg-btn rpg-btn--gold rpg-btn--sm" data-action="equip" data-key="${item.key}">${t('gearModal.equip')}</button>
                      </article>`,
                      )
                      .join('')}
                  </div>
                  ${visible.length < filtered.length ? `<button type="button" class="rpg-btn rpg-btn--ghost gear-load-more" data-action="more" style="width:100%;margin-top:0.65rem;">Load more</button>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>`;

      modalRoot.querySelector('.modal')?.addEventListener('click', (ev) => ev.stopPropagation());
      modalRoot.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
        el.addEventListener('click', () => { modalRoot.innerHTML = ''; });
      });
      modalRoot.querySelector('[data-action="unequip"]')?.addEventListener('click', () => {
        const h = heroSave();
        if (!h) return;
        unequipPart(state.working, h, part);
        modalRoot.innerHTML = '';
        draw();
      });
      modalRoot.querySelectorAll('[data-action="equip"]').forEach((el) => {
        el.addEventListener('click', () => {
          const key = Number(el.getAttribute('data-key'));
          const item = state.itemsByKey.get(key) ?? ctx.allItems.find((i) => i.key === key);
          const h = heroSave();
          if (!item || !h) return;
          state.itemsByKey.set(item.key, item);
          equipItem(state.working, h, part, item, state.itemsByKey);
          const detail = enrichedItemToDetail(item);
          if (detail) state.refs.itemDetailById.set(String(item.key), detail);
          modalRoot.innerHTML = '';
          draw();
        });
      });
      modalRoot.querySelector('[data-action="more"]')?.addEventListener('click', () => {
        page += 1;
        renderModal();
      });
      modalRoot.querySelectorAll('[data-field]').forEach((el) => {
        const handler = () => {
          const field = el.getAttribute('data-field')!;
          if (field === 'grade') filter.grade = (el as HTMLSelectElement).value;
          if (field === 'search') filter.search = (el as HTMLInputElement).value;
          page = 1;
          renderModal();
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
      });
    }

    renderModal();
  }

  function openSocketEditor(part: HeroPart): void {
    const hero = heroSave();
    if (!hero) return;
    const uid = hero.equippedItemIds[partIndex(part)];
    const inst = state.working.itemSaveDatas.find((i) => String(i.UniqueId) === String(uid));
    const item = inst ? state.itemsByKey.get(inst.ItemKey) : undefined;
    if (!inst || !item) return;

    openSocketEditorModal({
      modalRoot: root.querySelector('#sim-modal') as HTMLElement,
      item,
      inst,
      effects: ctx.effects,
      effectsByKey: state.effectsByKey,
      socketDraft: state.socketDraft,
      onApplied: () => draw(),
    });
  }

  function syncHeroTreeUnlocks(): void {
    const saveHero = heroSave();
    const def = heroDef();
    if (saveHero && def) syncAttributeGroupUnlocks(state.working, saveHero, def);
  }

  async function selectPreparedBuildById(id: string): Promise<void> {
    const entry = preparedManifest.find((b) => b.id === id);
    if (!entry) return;

    let build = preparedBuildCache.get(entry.id);
    if (!build) {
      try {
        build = await loadPreparedBuild(entry);
        preparedBuildCache.set(entry.id, build);
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
        return;
      }
    }

    selectedPreparedBuild = normalizePreparedBuild(build);
    preparedLevelIndex = 0;
    applyPreparedView();
    syncHash(navHref('build', 'prepared', { build: id }).slice(1));
    draw();
  }

  function enterForgeMode(): void {
    if (workspaceMode === 'forge') return;
    workspaceMode = 'forge';
    selectedPreparedBuild = null;
    preparedLevelIndex = 0;
    preparedHeroFilterKey = null;
    if (forgeSnapshot) {
      state.working = clonePlayerSave(forgeSnapshot);
      state.heroKey = state.working.heroSaveDatas.find((h) => h.IsUnLock)?.heroKey ?? state.heroKey;
      state.itemsByKey = syncSaveItemKeys(state.working, ctx.allItems);
      forgeSnapshot = null;
    }
    syncHash(navHref('build', 'forge').slice(1));
    draw();
  }

  function enterPreparedMode(): void {
    if (workspaceMode === 'prepared') return;
    forgeSnapshot = clonePlayerSave(state.working);
    workspaceMode = 'prepared';
    state.baseline = null;
    selectedPreparedBuild = null;
    preparedLevelIndex = 0;
    runeChamberOpen = false;
    syncHash(navHref('build', 'prepared').slice(1));
    draw();
  }

  const HERO_MENU_MIN_WIDTH = 220;

  function bindHeroPicker(): void {
    root.querySelectorAll<HTMLElement>('[data-hero-picker]').forEach((picker) => {
      bindOneHeroPicker(picker);
    });
  }

  function bindOneHeroPicker(picker: HTMLElement): void {

    const triggerBtn = picker.querySelector<HTMLButtonElement>('[data-action="hero-toggle"]');
    const menuList = picker.querySelector<HTMLUListElement>('.build-hero-menu');
    if (!triggerBtn || !menuList) return;

    let dismissListener: ((event: MouseEvent) => void) | null = null;
    let escapeListener: ((event: KeyboardEvent) => void) | null = null;

    const positionMenu = (): void => {
      const rect = triggerBtn.getBoundingClientRect();
      const width = Math.max(rect.width, HERO_MENU_MIN_WIDTH);
      menuList.style.position = 'fixed';
      menuList.style.top = `${rect.bottom + 6}px`;
      menuList.style.left = `${rect.left}px`;
      menuList.style.right = 'auto';
      menuList.style.width = `${width}px`;
      menuList.style.zIndex = '10000';
    };

    const resetMenuPosition = (): void => {
      menuList.classList.remove('is-visible');
      menuList.style.position = '';
      menuList.style.top = '';
      menuList.style.left = '';
      menuList.style.right = '';
      menuList.style.width = '';
      menuList.style.zIndex = '';
    };

    const detachDismissListener = (): void => {
      if (dismissListener) {
        document.removeEventListener('mousedown', dismissListener);
        dismissListener = null;
      }
      if (escapeListener) {
        document.removeEventListener('keydown', escapeListener);
        escapeListener = null;
      }
    };

    const closeMenu = (): void => {
      menuList.classList.remove('is-visible');
      menuList.hidden = true;
      triggerBtn.setAttribute('aria-expanded', 'false');
      picker.classList.remove('is-open');
      resetMenuPosition();
      detachDismissListener();
      if (menuList.parentElement === document.body) {
        picker.appendChild(menuList);
      }
    };

    const openMenu = (): void => {
      if (menuList.parentElement !== document.body) {
        document.body.appendChild(menuList);
      }
      menuList.hidden = false;
      triggerBtn.setAttribute('aria-expanded', 'true');
      picker.classList.add('is-open');
      positionMenu();
      requestAnimationFrame(() => {
        positionMenu();
        menuList.classList.add('is-visible');
      });
      dismissListener = (event: MouseEvent) => {
        const target = event.target;
        if (target instanceof Node && (picker.contains(target) || menuList.contains(target))) return;
        closeMenu();
      };
      escapeListener = (event: KeyboardEvent) => {
        if (event.key === 'Escape') closeMenu();
      };
      document.addEventListener('mousedown', dismissListener);
      document.addEventListener('keydown', escapeListener);
    };

    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!menuList.hidden) {
        closeMenu();
        return;
      }
      openMenu();
    });

    const isPreparedFilter = picker.hasAttribute('data-prepared-filter');
    const pickAction = isPreparedFilter ? 'prepared-hero-filter' : 'hero-pick';

    picker.querySelectorAll<HTMLButtonElement>(`[data-action="${pickAction}"]`).forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (el.disabled) return;
        const rawKey = el.getAttribute('data-hero-key');
        if (isPreparedFilter) {
          preparedHeroFilterKey = rawKey === '' || rawKey == null ? null : Number(rawKey);
          if (rawKey != null && rawKey !== '' && Number.isNaN(preparedHeroFilterKey)) return;
          closeMenu();
          draw();
          return;
        }
        const key = Number(rawKey);
        if (!Number.isNaN(key)) selectHero(key);
        closeMenu();
      });
    });

    const repositionIfOpen = (): void => {
      if (!menuList.hidden) positionMenu();
    };

    window.addEventListener('resize', repositionIfOpen);
    window.addEventListener('scroll', repositionIfOpen, true);
  }

  function bindEvents(): void {
    bindHeroPicker();

    root.querySelector('[data-action="mode-forge"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      enterForgeMode();
    });
    root.querySelector('[data-action="mode-prepared"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      enterPreparedMode();
    });

    root.querySelectorAll('[data-action="pick-prepared"]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        if (id) void selectPreparedBuildById(id);
      });
    });

    root.querySelector('[data-action="load-save"]')?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const parsed = await parseSaveFile(await file.arrayBuffer(), DEFAULT_ES3_PASSWORD);
        const loaded = normalizePlayerSave(parsed.PlayerSaveData);
        state.working = loaded;
        state.baseline = clonePlayerSave(loaded);
        state.heroKey = state.working.heroSaveDatas.find((h) => h.IsUnLock)?.heroKey ?? state.heroKey;
        state.itemsByKey = syncSaveItemKeys(state.working, ctx.allItems);
        for (const inst of state.working.itemSaveDatas) {
          const enriched = state.itemsByKey.get(inst.ItemKey);
          const detail = enriched ? enrichedItemToDetail(enriched) : null;
          if (detail) state.refs.itemDetailById.set(String(inst.ItemKey), detail);
        }
        syncHeroTreeUnlocks();
        draw();
      } catch (err) {
        alert(isSaveFileError(err) ? err.message : String(err));
      }
    });

    root.querySelector('[data-action="new-build"]')?.addEventListener('click', () => {
      state.working = createEmptySave(state.heroKey);
      state.baseline = clonePlayerSave(state.working);
      syncHeroTreeUnlocks();
      draw();
    });

    root.querySelector('[data-action="set-baseline"]')?.addEventListener('click', () => {
      state.baseline = clonePlayerSave(state.working);
      draw();
    });

    root.querySelectorAll('[data-action="pick-gear"]').forEach((el) => {
      el.addEventListener('click', () => openGearPicker(el.getAttribute('data-part') as HeroPart));
    });

    root.querySelectorAll('[data-action="edit-sockets"]').forEach((el) => {
      el.addEventListener('click', () => openSocketEditor(el.getAttribute('data-part') as HeroPart));
    });

    root.querySelectorAll('[data-action="passive-inc"]').forEach((el) => {
      el.addEventListener('click', () => {
        if (!canInvestMoreSkillPoints(state.working)) return;
        const key = Number(el.getAttribute('data-key'));
        const max = Number(el.getAttribute('data-max'));
        setPassiveLevel(state.working, key, getPassiveLevel(state.working, key) + 1, max);
        syncHeroTreeUnlocks();
        draw();
      });
    });

    root.querySelectorAll('[data-action="passive-dec"]').forEach((el) => {
      el.addEventListener('click', () => {
        const key = Number(el.getAttribute('data-key'));
        setPassiveLevel(state.working, key, getPassiveLevel(state.working, key) - 1, 999);
        syncHeroTreeUnlocks();
        draw();
      });
    });

    root.querySelectorAll('[data-action="rune-inc"]').forEach((el) => {
      el.addEventListener('click', () => {
        const key = Number(el.getAttribute('data-key'));
        const max = Number(el.getAttribute('data-max'));
        setRuneLevel(state.working, key, getRuneLevel(state.working, key) + 1, max);
        draw();
      });
    });

    root.querySelectorAll('[data-action="rune-dec"]').forEach((el) => {
      el.addEventListener('click', () => {
        const key = Number(el.getAttribute('data-key'));
        setRuneLevel(state.working, key, getRuneLevel(state.working, key) - 1, 999);
        draw();
      });
    });

    root.querySelectorAll('[data-action="toggle-rune-chamber"]').forEach((el) => {
      el.addEventListener('click', () => {
        runeChamberOpen = !runeChamberOpen;
        draw();
      });
    });
  }

  root.addEventListener('input', (e) => {
    if (!isPreparedReadOnly()) return;
    const target = e.target as HTMLElement;
    if (target.getAttribute('data-action') !== 'prepared-level-scrub') return;
    setPreparedLevel(Number((target as HTMLInputElement).value));
  });

  root.addEventListener('click', (e) => {
    if (!isPreparedReadOnly()) return;
    const tick = (e.target as HTMLElement).closest('[data-action="prepared-level-pick"]');
    if (!tick) return;
    const index = Number(tick.getAttribute('data-index'));
    if (!Number.isFinite(index)) return;
    setPreparedLevel(index);
    const range = root.querySelector<HTMLInputElement>('[data-action="prepared-level-scrub"]');
    if (range) range.value = String(preparedLevelIndex);
  });

  draw();
}
