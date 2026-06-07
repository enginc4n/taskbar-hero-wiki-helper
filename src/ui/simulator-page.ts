import { mergeRefMaps, buildRefMaps, enrichedItemToDetail } from '../data/adapters';
import { heroCombatRunesForPanel, runeBenefitLabel } from '../data/runes';
import {
  HERO_GEAR_LEFT,
  HERO_GEAR_RIGHT,
  HERO_ILLUST_FRAME_MS,
  gameUiUrl,
  heroIllustFrameCount,
  heroIllustUrl,
  renderGearSlotHtml,
} from '../data/game-ui';
import { itemIconHtml, itemIconUrl, runeIconUrl } from '../data/icons';
import { statIconHtml } from '../data/stat-icons';
import { classGlyph, rarityClass, RUNE_VAULT_ICON } from '../data/rpg-ui';
import {
  passiveNodeLabel,
  skillIconUrl,
  skillNodeFrameUrl,
  skillSectionLockedIconUrl,
} from '../data/skill-ui';
import { computeAllStats, computeBasicDps, compareStats, formatStatLabel, formatStatValue, formatDelta } from '../engine/stats';
import type { ComputedStats } from '../types';
import { parseSaveFile, isSaveFileError, DEFAULT_ES3_PASSWORD } from '../engine/save-decrypt';
import {
  applySocketsToItem,
  clonePlayerSave,
  createEmptySave,
  equipItem,
  unequipPart,
  getEffectGroupsForGear,
  getPassiveLevel,
  getRuneLevel,
  getSelectedHero,
  getSocketSlots,
  heroLevelFromSave,
  normalizePlayerSave,
  partIndex,
  setPassiveLevel,
  setRuneLevel,
  syncAttributeGroupUnlocks,
  isAttributeGroupUnlocked,
  attributeGroupLockHint,
  syncSaveItemKeys,
  type SocketSlotState,
} from '../simulator/build-state';
import type {
  EffectMaterial,
  EnrichedHero,
  EnrichedItem,
  HeroPart,
  MetaData,
  PassiveNode,
  PlayerSaveData,
  RefMaps,
  RuneGraph,
} from '../types';
import { PART_LABELS } from '../types';
import { filterGear, DEFAULT_GEAR_FILTER, gradeClass, itemMatchesHeroClass, type GearFilterState } from '../gear/filter';

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

const STAT_ROWS: { key: keyof ComputedStats; label: string; featured?: boolean }[] = [
  { key: 'AttackDamage', label: 'Attack Damage', featured: true },
  { key: 'MaxHp', label: 'Vitality' },
  { key: 'Armor', label: 'Armor' },
  { key: 'AttackSpeed', label: 'Attack Speed' },
  { key: 'CriticalChance', label: 'Critical Chance' },
  { key: 'CriticalDamage', label: 'Critical Damage' },
  { key: 'MovementSpeed', label: 'Movement Speed' },
  { key: 'CooldownReduction', label: 'Cooldown Reduction' },
  { key: 'CastSpeed', label: 'Cast Speed' },
];

export function renderSimulatorPage(root: HTMLElement, ctx: SimulatorContext): void {
  const refs = mergeRefMaps(buildRefMaps(ctx.wiki), {
    items: ctx.items,
    heroes: ctx.heroes,
    runes: ctx.runes,
  });

  const state: SimState = {
    baseline: null,
    working: createEmptySave(ctx.heroes[0]?.key ?? 101),
    heroKey: ctx.heroes[0]?.key ?? 101,
    refs,
    itemsByKey: syncSaveItemKeys(createEmptySave(ctx.heroes[0]?.key ?? 101), ctx.allItems),
    effectsByKey: new Map(ctx.effects.map((e) => [e.key, e])),
    socketDraft: new Map(),
  };

  let portraitAnimTimer: ReturnType<typeof setInterval> | null = null;
  let chronicleHeightObs: ResizeObserver | null = null;
  let runeChamberOpen = typeof window !== 'undefined' && window.location.hash === '#panel-runes';

  function stopPortraitAnim(): void {
    if (portraitAnimTimer !== null) {
      clearInterval(portraitAnimTimer);
      portraitAnimTimer = null;
    }
  }

  function startPortraitAnim(): void {
    stopPortraitAnim();
    const imgs = root.querySelectorAll<HTMLImageElement>('.hero-portrait');
    if (!imgs.length) return;
    const heroKey = state.heroKey;
    const frameCount = heroIllustFrameCount(heroKey);
    if (frameCount <= 1) return;
    let frame = 0;
    const url = heroIllustUrl(heroKey, frame);
    imgs.forEach((img) => { img.src = url; });
    portraitAnimTimer = setInterval(() => {
      frame = (frame + 1) % frameCount;
      const next = heroIllustUrl(heroKey, frame);
      imgs.forEach((img) => { img.src = next; });
    }, HERO_ILLUST_FRAME_MS);
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

  function drawGuildBanner(): string {
    const hero = heroDef();
    const hasBaseline = !!state.baseline;
    const heroName = hero?.name ?? 'Unknown';
    const glyph = classGlyph(hero?.class ?? '');

    return `
      <header class="guild-banner" aria-label="Guild Hall">
        <div class="guild-banner-inner">
          <div class="guild-brand">
            <div class="guild-crest" aria-hidden="true">⚜</div>
            <div class="guild-brand-text">
              <p class="guild-logo text-display">TBH Build Forge</p>
              <p class="guild-tagline">Plan your hero's path before committing gold</p>
            </div>
          </div>
          <div class="guild-hero-strip">
            <div class="guild-class-icon" aria-hidden="true" title="${hero?.class ?? ''}">${glyph}</div>
            <div class="guild-hero-info">
              <h2 class="guild-hero-name">${heroName}</h2>
            </div>
            <span class="guild-status ${hasBaseline ? 'is-set' : ''}" role="status">
              <span class="guild-status-dot" aria-hidden="true"></span>
              ${hasBaseline ? 'Baseline active' : 'No baseline'}
            </span>
          </div>
          <div class="guild-actions">
            <label class="rpg-btn rpg-btn--ghost">
              <span class="rpg-btn-shine" aria-hidden="true"></span>
              Load Build
              <input type="file" accept=".es3,.bak" data-action="load-save" hidden />
            </label>
            <button type="button" class="rpg-btn rpg-btn--ghost" data-action="new-build">New Build</button>
            <button type="button" class="rpg-btn rpg-btn--gold" data-action="set-baseline">
              <span class="rpg-btn-shine" aria-hidden="true"></span>
              Save Build
            </button>
          </div>
        </div>
      </header>`;
  }

  function drawHeroShowcase(): string {
    const hero = heroDef();
    const save = heroSave();
    if (!hero || !save) return '';
    const desc = hero.description ?? `A ${hero.class} forged in the fires of the guild hall.`;

    return `
      <section class="hero-showcase" aria-label="Hero showcase">
        <div class="hero-showcase-head">
          <div class="hero-showcase-titles">
            <h2 class="hero-showcase-name">${hero.name}</h2>
            <p class="hero-showcase-class">${hero.class}</p>
          </div>
          ${drawRuneVaultButton()}
        </div>
        <p class="hero-desc">${desc}</p>
      </section>`;
  }

  function drawEquipmentStage(): string {
    function gearSide(rows: HeroPart[][]): string {
      return rows
        .map(
          (row) => `
        <div class="equip-row">
          ${row
            .map((part) =>
              renderGearSlotHtml({
                part,
                item: itemForPart(part),
                hasSockets: (() => {
                  const item = itemForPart(part);
                  return item ? itemHasSockets(item) : false;
                })(),
              }),
            )
            .join('')}
        </div>`,
        )
        .join('');
    }

    const hero = heroDef();
    return `
      <section class="equipment-stage" aria-label="Equipment">
        <div class="equipment-stage-banners" aria-hidden="true">
          <span class="equip-banner equip-banner--l"></span>
          <span class="equip-banner equip-banner--r"></span>
          <span class="equip-pedestal"></span>
        </div>
        <div class="equipment-layout">
          <div class="equip-side equip-side--left">${gearSide(HERO_GEAR_LEFT)}</div>
          <div class="equip-center">
            <div class="equip-portrait-frame">
              <img
                class="hero-portrait pixel-art"
                src="${heroIllustUrl(hero?.key ?? 101, 0)}"
                alt="${hero?.name ?? 'Hero'} portrait"
                loading="lazy"
              />
            </div>
          </div>
          <div class="equip-side equip-side--right">${gearSide(HERO_GEAR_RIGHT)}</div>
        </div>
      </section>`;
  }

  function drawHeroCodex(): string {
    return `
      <section class="hero-codex" aria-label="Hero Codex — Hall of Champions">
        <div class="rpg-panel-head" style="margin-bottom:0.5rem;padding-bottom:0.5rem;">
          <div class="rpg-panel-head-copy">
            <p class="text-kicker">Hall of Champions</p>
            <h3 class="rpg-panel-title">Hero Codex</h3>
          </div>
        </div>
        <div class="codex-roster" role="group" aria-label="Hero roster">
          ${ctx.heroes
            .map((h) => {
              const selected = h.key === state.heroKey;
              const saveHero = getSelectedHero(state.working, h.key);
              const locked = saveHero ? !saveHero.IsUnLock : false;
              const icon = itemIconUrl(h.icon ?? h.art);
              return `
            <button
              type="button"
              class="hslot${selected ? ' on' : ''}${locked ? ' is-locked' : ''}"
              data-action="hero-pick"
              data-key="${h.key}"
              title="${locked ? `${h.name} — Locked` : h.name}"
              aria-label="${h.name}${selected ? ' (selected)' : ''}${locked ? ' (locked)' : ''}"
              aria-pressed="${selected}"
              ${locked ? 'disabled' : ''}
            >
              <span class="hslot-inner">
                ${icon ? `<img class="hslot-portrait pixel-art" src="${icon}" alt="" loading="lazy" />` : h.name[0]}
              </span>
              <img class="hslot-frame pixel-art" src="${gameUiUrl('HeroSlot_OuterBoader_Arranged.png')}" alt="" />
              <img class="hslot-hover pixel-art" src="${gameUiUrl('HeroSlot_InnerBoader_Hover.png')}" alt="" />
              ${selected ? `<img class="hslot-active pixel-art" src="${gameUiUrl('HeroSlot_InnerBoader_Active.png')}" alt="" />` : ''}
            </button>`;
            })
            .join('')}
        </div>
      </section>`;
  }

  function drawCharacterSheet(): string {
    const hero = heroSave();
    if (!hero) return '';
    const current = computeAllStats(hero, state.working, state.refs);
    const dps = computeBasicDps(current);
    const baselineHero = state.baseline ? getSelectedHero(state.baseline, state.heroKey) : null;
    const baselineStats = baselineHero ? computeAllStats(baselineHero, state.baseline!, state.refs) : current;
    const baselineDps = computeBasicDps(baselineStats);
    const deltas = new Map(compareStats(baselineStats, current).map((d) => [d.name, d]));
    const dpsDelta = dps - baselineDps;
    const dpsPct = baselineDps === 0 ? 0 : (dps / baselineDps - 1) * 100;

    function deltaHtml(positive: boolean, text: string): string {
      return `<span class="attr-delta ${positive ? 'positive' : 'negative'}">${text}</span>`;
    }

    function statDelta(key: keyof ComputedStats): string {
      if (!state.baseline) return '';
      const delta = deltas.get(key);
      if (!delta || delta.delta === 0) return '';
      return deltaHtml(delta.delta >= 0, formatDelta(delta));
    }

    const dpsValue = Math.round(dps).toLocaleString();
    const dpsDeltaHtml = state.baseline
      ? deltaHtml(dpsDelta >= 0, `${dpsDelta >= 0 ? '+' : ''}${Math.round(dpsDelta).toLocaleString()} (${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(1)}%)`)
      : '';

    const tiles = STAT_ROWS.map((stat) => {
      const value = formatStatValue(stat.key, current[stat.key]);
      return `
        <div class="attr-tile${stat.featured ? ' attr-tile--featured' : ''}">
          <div class="attr-icon">
            ${statIconHtml(stat.key)}
          </div>
          <span class="attr-label">${stat.label}</span>
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
                <p class="text-kicker">Character Sheet</p>
                <h3 class="rpg-panel-title">
                  <span class="char-sheet-title-icon" aria-hidden="true">${statIconHtml('Attributes', 'char-sheet-title-icon-svg pixel-art')}</span>
                  Attributes
                </h3>
              </div>
              <div class="char-sheet-dps">
                <div class="char-sheet-dps-icon" aria-hidden="true">${statIconHtml('Dps')}</div>
                <div>
                  <div class="char-sheet-dps-label">Basic Attack DPS</div>
                  <div class="char-sheet-dps-value">${dpsValue}</div>
                  ${dpsDeltaHtml}
                </div>
              </div>
            </header>
            <div class="attr-strip">${tiles}</div>
          </div>
        </div>
      </section>`;
  }

  function drawRuneVaultButton(): string {
    return `
      <button
        type="button"
        class="rune-vault-btn${runeChamberOpen ? ' is-open' : ''}"
        data-action="toggle-rune-chamber"
        aria-pressed="${runeChamberOpen}"
        aria-label="${runeChamberOpen ? 'Close rune vault' : 'Open rune vault'}"
        title="${runeChamberOpen ? 'Close Rune Chamber' : 'Open Rune Chamber'}"
      >
        <img class="rune-vault-btn-icon pixel-art" src="${RUNE_VAULT_ICON}" alt="" />
        <span class="rune-vault-btn-label text-ui">Runes</span>
      </button>`;
  }

  function drawSkillNode(node: PassiveNode, tierUnlocked: boolean, linkBefore: boolean): string {
    const level = getPassiveLevel(state.working, node.key);
    const max = node.maxLevel ?? 1;
    const icon = skillIconUrl(node.icon);
    const lvClass = level >= max ? 'max' : level > 0 ? 'has' : '';
    const label = passiveNodeLabel(node);
    const perPoint = node.perPoint ?? '';
    const atMax = level >= max;
    const atMin = level <= 0;

    return `
      <div class="tree-node-link">
        ${linkBefore ? '<span class="tree-link-h" aria-hidden="true"></span>' : ''}
        <div class="tree-skill skill-node-wrap ${lvClass}${tierUnlocked ? '' : ' is-muted'}" title="${label} · ${perPoint}/lvl">
          <div class="skill-node">
            <img class="node-frame pixel-art" src="${skillNodeFrameUrl('passive', level, max)}" alt="" />
            ${icon ? `<img class="node-icon pixel-art" src="${icon}" alt="" loading="lazy" />` : ''}
            <span class="node-lv ${lvClass}">${level}<span class="node-lv-max">/${max}</span></span>
          </div>
          <span class="tree-skill-name">${label}</span>
          ${tierUnlocked ? `
            <div class="tree-skill-controls" role="group" aria-label="${label} level">
              <button type="button" class="node-btn" data-action="passive-dec" data-key="${node.key}" aria-label="Decrease ${label}"${atMin ? ' disabled' : ''}>−</button>
              <button type="button" class="node-btn" data-action="passive-inc" data-key="${node.key}" data-max="${max}" aria-label="Increase ${label}"${atMax ? ' disabled' : ''}>+</button>
            </div>` : ''}
        </div>
      </div>`;
  }

  function drawActiveNode(node: PassiveNode, tierUnlocked: boolean, linkBefore: boolean): string {
    const level = getPassiveLevel(state.working, node.key);
    const max = node.maxLevel ?? 1;
    const icon = skillIconUrl(node.icon);
    const lvClass = level >= max ? 'max' : level > 0 ? 'has' : '';
    const name = node.name ?? 'Active Skill';
    const atMax = level >= max;
    const atMin = level <= 0;

    return `
      <div class="tree-node-link">
        ${linkBefore ? '<span class="tree-link-h" aria-hidden="true"></span>' : ''}
        <div class="tree-skill tree-skill--active ${lvClass}${tierUnlocked ? '' : ' is-muted'}" title="${name}">
          <div class="skill-node">
            <img class="node-frame pixel-art" src="${skillNodeFrameUrl('active', level, max)}" alt="" />
            ${icon ? `<img class="node-icon pixel-art" src="${icon}" alt="" loading="lazy" />` : ''}
            <span class="node-lv ${lvClass}">${level}<span class="node-lv-max">/${max}</span></span>
            <span class="tree-skill-tag text-ui">Active</span>
          </div>
          <span class="tree-skill-name">${name}</span>
          ${tierUnlocked ? `
            <div class="tree-skill-controls" role="group" aria-label="${name} level">
              <button type="button" class="node-btn" data-action="passive-dec" data-key="${node.key}" aria-label="Decrease ${name}"${atMin ? ' disabled' : ''}>−</button>
              <button type="button" class="node-btn" data-action="passive-inc" data-key="${node.key}" data-max="${max}" aria-label="Increase ${name}"${atMax ? ' disabled' : ''}>+</button>
            </div>` : ''}
        </div>
      </div>`;
  }

  function drawSkillNodesLayout(
    passives: PassiveNode[],
    actives: PassiveNode[],
    unlocked: boolean,
  ): string {
    type SkillEntry = { node: PassiveNode; kind: 'passive' | 'active' };
    const all: SkillEntry[] = [
      ...passives.map((n) => ({ node: n, kind: 'passive' as const })),
      ...actives.map((n) => ({ node: n, kind: 'active' as const })),
    ];
    if (!all.length) return '';

    const rows: SkillEntry[][] = all.length === 4 ? [all.slice(0, 2), all.slice(2, 4)] : [all];
    const layoutClass = all.length === 4 ? 'tree-nodes-layout--quad' : 'tree-nodes-layout--line';

    const rowsHtml = rows
      .map((row) => {
        const items = row
          .map((item, i) =>
            item.kind === 'passive'
              ? drawSkillNode(item.node, unlocked, i > 0)
              : drawActiveNode(item.node, unlocked, i > 0),
          )
          .join('');
        return `<div class="tree-nodes-row">${items}</div>`;
      })
      .join('');

    return `<div class="tree-nodes-layout ${layoutClass}">${rowsHtml}</div>`;
  }

  function drawGuildChronicle(): string {
    const def = heroDef();
    const heroData = heroSave();
    if (!def || !heroData) return '';

    const heroLevel = heroLevelFromSave(heroData);
    const groups = def.tree;

    const tiers = groups
      .map((group, index) => {
        const unlocked = isAttributeGroupUnlocked(index, groups, heroLevel, state.working, heroData);
        const hasPoints = group.nodes.some((n) => getPassiveLevel(state.working, n.key) > 0);
        const reached = heroLevel >= group.levelGate;
        const passives = group.nodes.filter((n) => n.kind === 'passive' && n.stat && n.stat !== 'NONE');
        const actives = group.nodes.filter((n) => n.kind === 'active');
        const nodesHtml = drawSkillNodesLayout(passives, actives, unlocked);
        const lockHint = attributeGroupLockHint(index, groups, heroLevel, state.working, unlocked);
        const stateClass = [
          unlocked ? 'is-unlocked' : 'is-locked',
          reached ? 'is-reached' : '',
          hasPoints ? 'is-invested' : '',
          reached && unlocked && !hasPoints ? 'is-current' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return `
          <article class="tree-tier ${stateClass}" data-gate="${group.levelGate}">
            <div class="tree-tier-gate">
              <div class="tree-gate-stone">
                <span>${group.levelGate}</span>
              </div>
            </div>
            <div class="tree-tier-page">
              <header class="tree-tier-head">
                <span class="tree-chapter">Chapter ${index + 1}</span>
                <h4 class="tree-tier-title">Level ${group.levelGate} — Guild Record</h4>
                <p class="tree-tier-hint">${lockHint}</p>
              </header>
              <div class="tree-branch">
                ${nodesHtml}
              </div>
              ${unlocked ? '' : `
                <div class="tree-tier-seal" aria-hidden="true">
                  <img src="${skillSectionLockedIconUrl()}" alt="" class="pixel-art" />
                  <span class="text-ui">Sealed</span>
                </div>`}
            </div>
          </article>`;
      })
      .join('');

    return `
      <div class="rpg-panel chronicle-panel" id="panel-chronicle" aria-label="Guild Chronicle">
        <div class="rpg-panel-inner">
          <header class="rpg-panel-head">
            <div class="rpg-panel-head-copy">
              <p class="text-kicker">Guild Chronicle</p>
              <h3 class="rpg-panel-title">Path of ${def.name}</h3>
              <p class="rpg-panel-sub">Lv.${heroLevel} · ${groups.length} chapters on the road</p>
            </div>
          </header>
          <div class="chronicle-scroll">
            <div class="chronicle-book">
              <div class="chronicle-spine" aria-hidden="true"></div>
              <div class="chronicle-path" aria-hidden="true"></div>
              <div class="chronicle-tiers">${tiers}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function drawRuneChamber(): string {
    const runeSlots = heroCombatRunesForPanel(ctx.runes.runes)
      .map((rune) => {
        const level = getRuneLevel(state.working, rune.key);
        const max = rune.maxLevel ?? 1;
        const icon = runeIconUrl(rune.icon);
        const rarity = rarityClass(level, max);
        const benefit = runeBenefitLabel(rune);
        const effect = rune.effect ?? (rune.stat ? formatStatLabel(rune.stat) : benefit);

        return `
          <article class="rune-slot ${rarity}" title="${rune.name}: ${effect}" aria-label="${rune.name}, ${benefit}, level ${level} of ${max}">
            <div class="rune-gem">
              ${icon ? `<img class="rune-gem-icon pixel-art" src="${icon}" alt="" loading="lazy" />` : '<span aria-hidden="true">◆</span>'}
              <span class="rune-gem-lv ${rarity}">${level}/${max}</span>
            </div>
            <span class="rune-slot-benefit${level > 0 ? ' is-active' : ''}">${benefit}</span>
            <div class="rune-slot-controls">
              <button type="button" class="node-btn" data-action="rune-dec" data-key="${rune.key}" aria-label="Decrease ${rune.name}">−</button>
              <button type="button" class="node-btn" data-action="rune-inc" data-key="${rune.key}" data-max="${max}" aria-label="Increase ${rune.name}">+</button>
            </div>
            <div class="rpg-tooltip">${effect}</div>
          </article>`;
      })
      .join('');

    if (!runeChamberOpen) return '';

    return `
      <aside class="rune-sidebar" id="panel-runes" aria-label="Rune Chamber">
        <div class="rpg-panel rune-chamber-panel">
          <div class="rpg-panel-inner rune-chamber-inner">
            <header class="rune-chamber-head">
              <div class="rpg-panel-head-copy">
                <p class="text-kicker">Rune Chamber</p>
                <h3 class="rpg-panel-title">Arcane Relics</h3>
              </div>
              <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--icon rune-chamber-close" data-action="toggle-rune-chamber" aria-label="Close rune chamber">✕</button>
            </header>
            <div class="rune-inventory">${runeSlots}</div>
          </div>
        </div>
      </aside>`;
  }

  function captureScrollState(): { chronicleScrollTop: number; runeScrollTop: number; windowScrollY: number } {
    return {
      chronicleScrollTop: root.querySelector<HTMLElement>('.chronicle-scroll')?.scrollTop ?? 0,
      runeScrollTop: root.querySelector<HTMLElement>('.rune-inventory')?.scrollTop ?? 0,
      windowScrollY: window.scrollY,
    };
  }

  function restoreScrollState(saved: ReturnType<typeof captureScrollState>): void {
    requestAnimationFrame(() => {
      const chronicle = root.querySelector<HTMLElement>('.chronicle-scroll');
      if (chronicle) chronicle.scrollTop = saved.chronicleScrollTop;
      const runeInv = root.querySelector<HTMLElement>('.rune-inventory');
      if (runeInv) runeInv.scrollTop = saved.runeScrollTop;
      if (window.scrollY !== saved.windowScrollY) window.scrollTo(0, saved.windowScrollY);
    });
  }

  function syncSidePanelHeights(): void {
    const heroHall = root.querySelector<HTMLElement>('.hero-hall');
    const chroniclePanel = root.querySelector<HTMLElement>('.chronicle-panel');
    const runeSidebar = root.querySelector<HTMLElement>('.rune-sidebar');
    if (!heroHall) return;

    const height = heroHall.offsetHeight;
    if (height <= 0) return;

    const px = `${height}px`;
    for (const panel of [chroniclePanel, runeSidebar]) {
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
    root.innerHTML = `
      <div class="rpg-screen">
        ${drawGuildBanner()}
        <div class="rpg-workspace${runeChamberOpen ? ' rune-open' : ''}">
          <aside class="chronicle-col">${drawGuildChronicle()}</aside>
          <main class="hero-hall rpg-panel">
            <div class="rpg-panel-inner">
              ${drawHeroShowcase()}
              ${drawEquipmentStage()}
              ${drawHeroCodex()}
            </div>
          </main>
          ${drawRuneChamber()}
        </div>
        ${drawCharacterSheet()}
      </div>
      <div id="sim-modal" class="modal-root"></div>
    `;
    bindEvents();
    startPortraitAnim();
    requestAnimationFrame(() => {
      syncSidePanelHeights();
      setupChronicleHeightSync();
      restoreScrollState(scrollState);
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
                  <p class="text-kicker">Equipment</p>
                  <h3 id="gear-modal-title">Select ${PART_LABELS[part]}</h3>
                </div>
                <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--icon" data-action="close-modal" aria-label="Close">✕</button>
              </div>
              <div class="gear-modal-body">
                <aside class="gear-modal-filters">
                  <label class="field">
                    <span class="field-label">Grade</span>
                    <select data-field="grade"><option value="ALL">All grades</option>${ctx.meta.grades.map((g) => `<option value="${g}">${g}</option>`).join('')}</select>
                  </label>
                  <label class="field">
                    <span class="field-label">Search</span>
                    <input data-field="search" value="${filter.search}" placeholder="Item name…" />
                  </label>
                  <p class="small">${filtered.length} items match</p>
                </aside>
                <div class="gear-modal-results">
                  ${equipped ? `
                  <div class="gear-equipped-bar">
                    <div class="gear-equipped-current">
                      ${itemIconHtml(equipped.icon, equipped.name, 'gear-equipped-icon')}
                      <div class="gear-equipped-meta">
                        <span class="gear-equipped-label">Equipped</span>
                        <span class="gear-equipped-name">${equipped.name}${equipped.variant ? ` (${equipped.variant})` : ''}</span>
                      </div>
                    </div>
                    <button type="button" class="rpg-btn rpg-btn--ghost" data-action="unequip">Remove</button>
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
                        <button type="button" class="rpg-btn rpg-btn--gold rpg-btn--sm" data-action="equip" data-key="${item.key}">Equip</button>
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

    const draftKey = String(inst.UniqueId);
    if (!state.socketDraft.has(draftKey)) {
      const slots: SocketSlotState[] = [];
      for (const { category, count } of getSocketSlots(item)) {
        for (let i = 0; i < count; i++) {
          slots.push({ category, index: i, materialKey: null, groupIndex: 0, roll: 'max' });
        }
      }
      state.socketDraft.set(draftKey, slots);
    }
    const draft = state.socketDraft.get(draftKey)!;
    const modalRoot = root.querySelector('#sim-modal') as HTMLElement;

    function formatRollHint(group: import('../types').EffectGroup): string {
      return group.disp ?? `${group.min} – ${group.max}`;
    }

    function renderModal(): void {
      modalRoot.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal" role="presentation">
          <div class="modal socket-modal" role="dialog" aria-modal="true" aria-labelledby="socket-modal-title">
            <div class="modal-frame">
              <div class="modal-header">
                <div>
                  <p class="text-kicker">Socket Chamber</p>
                  <h3 id="socket-modal-title">${item!.name}</h3>
                </div>
                <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--icon" data-action="close-modal" aria-label="Close">✕</button>
              </div>
              <div class="socket-modal-body">
              ${draft
                .map((slot, idx) => {
                  const mats = ctx.effects.filter((e) => e.category === slot.category);
                  const mat = slot.materialKey ? state.effectsByKey.get(slot.materialKey) : null;
                  const groups = mat ? getEffectGroupsForGear(mat, item!) : [];
                  const group = groups[slot.groupIndex] ?? groups[0];
                  const rollHint = group ? formatRollHint(group) : '';

                  return `
                    <div class="socket-editor">
                      <div class="socket-editor-head">
                        <strong>${slot.category} ${slot.index + 1}</strong>
                        <div class="socket-selected">
                          ${mat ? itemIconHtml(mat.icon, mat.name, 'socket-mat-icon') : '<span class="socket-mat-empty" aria-hidden="true">—</span>'}
                          <div class="socket-mat-meta">
                            <span class="socket-mat-name">${mat?.name ?? 'Empty'}</span>
                            ${group ? `<span class="socket-roll-hint">${rollHint}</span>` : ''}
                          </div>
                        </div>
                      </div>
                      <div class="socket-mat-label">Material</div>
                      <div class="material-picker" role="listbox" aria-label="${slot.category} ${slot.index + 1} material">
                        <button type="button" class="material-chip${slot.materialKey == null ? ' selected' : ''}" data-action="pick-material" data-slot="${idx}" data-key="" role="option" aria-selected="${slot.materialKey == null}">
                          <span class="material-chip-empty">∅</span>
                        </button>
                        ${mats
                          .map((m) => {
                            const label = m.name.replace(/"/g, '&quot;');
                            return `
                          <button type="button" class="material-chip${slot.materialKey === m.key ? ' selected' : ''}" data-action="pick-material" data-slot="${idx}" data-key="${m.key}" data-label="${label}" title="${label}" role="option" aria-selected="${slot.materialKey === m.key}">
                            ${itemIconHtml(m.icon, m.name, 'material-chip-icon')}
                            <span class="material-chip-tooltip">${m.name}</span>
                          </button>`;
                          })
                          .join('')}
                      </div>
                      <div class="socket-options">
                      ${groups.length > 1 ? `<label class="socket-field">Stat<select data-slot="${idx}" data-field="group">${groups.map((g, gi) => `<option value="${gi}" ${slot.groupIndex === gi ? 'selected' : ''}>${formatStatLabel(g.stat)} ${g.disp ?? ''}</option>`).join('')}</select></label>` : ''}
                      <label class="socket-field">Roll
                        <select data-slot="${idx}" data-field="roll">
                          <option value="min" ${slot.roll === 'min' ? 'selected' : ''}>Min${group ? ` (${group.min})` : ''}</option>
                          <option value="mid" ${slot.roll === 'mid' ? 'selected' : ''}>Mid</option>
                          <option value="max" ${slot.roll === 'max' ? 'selected' : ''}>Max${group ? ` (${group.max})` : ''}</option>
                          <option value="custom" ${slot.roll === 'custom' ? 'selected' : ''}>Custom</option>
                        </select>
                      </label>
                      ${slot.roll === 'custom' && group ? `<label class="socket-field socket-custom-field">Value<input type="number" step="any" data-slot="${idx}" data-field="customValue" value="${slot.customValue ?? group.max}" min="${group.min}" max="${group.max}" /><span class="socket-roll-range">${group.min} – ${group.max}</span></label>` : ''}
                      </div>
                    </div>`;
                })
                .join('')}
              </div>
              <footer class="modal-footer">
                <button type="button" class="rpg-btn rpg-btn--gold" data-action="apply-sockets">Apply &amp; Recompute</button>
              </footer>
            </div>
          </div>
        </div>`;

      modalRoot.querySelector('.modal')?.addEventListener('click', (ev) => ev.stopPropagation());
      modalRoot.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
        el.addEventListener('click', () => { modalRoot.innerHTML = ''; });
      });
      modalRoot.querySelectorAll('[data-action="pick-material"]').forEach((el) => {
        el.addEventListener('click', () => {
          const idx = Number(el.getAttribute('data-slot'));
          const keyRaw = el.getAttribute('data-key');
          const slot = draft[idx];
          slot.materialKey = keyRaw ? Number(keyRaw) : null;
          slot.groupIndex = 0;
          renderModal();
        });
      });
      modalRoot.querySelectorAll('[data-field]').forEach((el) => {
        const handler = () => {
          const idx = Number(el.getAttribute('data-slot'));
          const field = el.getAttribute('data-field')!;
          const slot = draft[idx];
          const mat = slot.materialKey ? state.effectsByKey.get(slot.materialKey) : null;
          const groups = mat ? getEffectGroupsForGear(mat, item!) : [];
          const group = groups[slot.groupIndex] ?? groups[0];
          if (field === 'group') slot.groupIndex = Number((el as HTMLSelectElement).value);
          else if (field === 'roll') {
            slot.roll = (el as HTMLSelectElement).value as SocketSlotState['roll'];
            if (slot.roll === 'custom' && group && slot.customValue == null) slot.customValue = group.max;
            renderModal();
            return;
          } else if (field === 'customValue') {
            slot.customValue = Number((el as HTMLInputElement).value);
            if (group) slot.customValue = Math.max(group.min, Math.min(group.max, slot.customValue));
            return;
          }
          renderModal();
        };
        el.addEventListener('change', handler);
        if (el.getAttribute('data-field') === 'customValue') el.addEventListener('input', handler);
      });
      modalRoot.querySelector('[data-action="apply-sockets"]')?.addEventListener('click', () => {
        if (!inst || !item) return;
        applySocketsToItem(inst, item, draft, state.effectsByKey);
        modalRoot.innerHTML = '';
        draw();
      });
    }

    renderModal();
  }

  function syncHeroTreeUnlocks(): void {
    const saveHero = heroSave();
    const def = heroDef();
    if (saveHero && def) syncAttributeGroupUnlocks(state.working, saveHero, def);
  }

  function bindEvents(): void {
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

    root.querySelectorAll('[data-action="hero-pick"]').forEach((el) => {
      el.addEventListener('click', () => selectHero(Number(el.getAttribute('data-key'))));
    });

    root.querySelectorAll('[data-action="pick-gear"]').forEach((el) => {
      el.addEventListener('click', () => openGearPicker(el.getAttribute('data-part') as HeroPart));
    });

    root.querySelectorAll('[data-action="edit-sockets"]').forEach((el) => {
      el.addEventListener('click', () => openSocketEditor(el.getAttribute('data-part') as HeroPart));
    });

    root.querySelectorAll('[data-action="passive-inc"]').forEach((el) => {
      el.addEventListener('click', () => {
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

  draw();
}
