import { mergeRefMaps, buildRefMaps, enrichedItemToDetail } from '../data/adapters';
import { heroCombatRunesForPanel } from '../data/runes';
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
import {
  passiveNodeLabel,
  skillIconUrl,
  skillNodeFrameUrl,
  skillSectionBgUrl,
  skillSectionLockedIconUrl,
} from '../data/skill-ui';
import { computeAllStats, computeBasicDps, compareStats, formatStatValue, formatDelta } from '../engine/stats';
import { parseSaveFile, isSaveFileError, DEFAULT_ES3_PASSWORD } from '../engine/save-decrypt';
import {
  applySocketsToItem,
  clonePlayerSave,
  createEmptySave,
  equipItem,
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
  /** Full item catalog — used to resolve save equipment, including legacy unobtainable gear. */
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

  function stopPortraitAnim(): void {
    if (portraitAnimTimer !== null) {
      clearInterval(portraitAnimTimer);
      portraitAnimTimer = null;
    }
  }

  function startPortraitAnim(): void {
    stopPortraitAnim();
    const img = root.querySelector<HTMLImageElement>('.hero-portrait');
    if (!img) return;

    const heroKey = state.heroKey;
    const frameCount = heroIllustFrameCount(heroKey);
    if (frameCount <= 1) return;

    let frame = 0;
    img.src = heroIllustUrl(heroKey, frame);

    portraitAnimTimer = setInterval(() => {
      frame = (frame + 1) % frameCount;
      img.src = heroIllustUrl(heroKey, frame);
    }, HERO_ILLUST_FRAME_MS);
  }

  function itemForPart(part: HeroPart): EnrichedItem | undefined {
    const hero = heroSave();
    if (!hero) return undefined;
    const uid = hero.equippedItemIds[partIndex(part)];
    const inst = uid
      ? state.working.itemSaveDatas.find((i) => String(i.UniqueId) === String(uid))
      : null;
    return inst ? state.itemsByKey.get(inst.ItemKey) : undefined;
  }

  function itemHasSockets(item: EnrichedItem): boolean {
    const slots = item.slots;
    if (!slots) return false;
    return slots.decoration + slots.engraving + slots.inscription > 0;
  }

  function drawHeroPickerButtons(): string {
    return ctx.heroes
      .map((h) => {
        const selected = h.key === state.heroKey;
        const icon = itemIconUrl(h.icon ?? h.art);
        return `
          <button
            type="button"
            class="hslot${selected ? ' on' : ''}"
            data-action="hero-pick"
            data-key="${h.key}"
            title="${h.name}"
            aria-label="${h.name}${selected ? ' (selected)' : ''}"
            aria-pressed="${selected}"
          >
            <span class="hslot-inner">
              ${icon ? `<img class="hslot-portrait" src="${icon}" alt="" loading="lazy" />` : h.name[0]}
            </span>
            <img class="hslot-frame" src="${gameUiUrl('HeroSlot_OuterBoader_Arranged.png')}" alt="" />
            <img class="hslot-hover" src="${gameUiUrl('HeroSlot_InnerBoader_Hover.png')}" alt="" />
            ${selected ? `<img class="hslot-active" src="${gameUiUrl('HeroSlot_InnerBoader_Active.png')}" alt="" />` : ''}
          </button>`;
      })
      .join('');
  }

  function drawHeroWindow(): string {
    const hero = heroDef();
    const save = heroSave();
    if (!hero || !save) return '';

    function gearSideHtml(rows: HeroPart[][]): string {
      return rows
        .map(
          (row) => `
        <div class="hero-gear-row">
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

    const level = heroLevelFromSave(save);

    return `
      <section class="hero-window forge-panel" id="panel-hero" aria-label="Hero equipment">
        <header class="hero-window-header">
          <span class="hero-window-title">Hero</span>
          <span class="hero-window-name">${hero.name}</span>
          <span class="hero-window-level">Level ${level}</span>
        </header>
        <div class="hero-window-body">
          <div class="hero-gear-side hero-gear-left">${gearSideHtml(HERO_GEAR_LEFT)}</div>
          <div class="hero-center">
            <img
              class="hero-portrait"
              src="${heroIllustUrl(hero.key, 0)}"
              alt="${hero.name} portrait"
              loading="lazy"
            />
          </div>
          <div class="hero-gear-side hero-gear-right">${gearSideHtml(HERO_GEAR_RIGHT)}</div>
        </div>
        <footer class="hero-window-footer">
          <span class="hero-footer-label">Switch hero</span>
          <div class="herolist" role="group" aria-label="Hero roster">${drawHeroPickerButtons()}</div>
        </footer>
      </section>`;
  }

  function heroDef(): EnrichedHero | undefined {
    return ctx.heroes.find((h) => h.key === state.heroKey);
  }

  function heroSave() {
    return getSelectedHero(state.working, state.heroKey);
  }

  function drawStats(): string {
    const hero = heroSave();
    if (!hero) return '';
    const current = computeAllStats(hero, state.working, state.refs);
    const dps = computeBasicDps(current);
    const baselineHero = state.baseline ? getSelectedHero(state.baseline, state.heroKey) : null;
    const baselineStats = baselineHero
      ? computeAllStats(baselineHero, state.baseline!, state.refs)
      : current;
    const baselineDps = computeBasicDps(baselineStats);
    const deltas = compareStats(baselineStats, current);
    const atkDelta = deltas.find((d) => d.name === 'AttackDamage');
    const dpsDelta = dps - baselineDps;
    const dpsPct = baselineDps === 0 ? 0 : (dps / baselineDps - 1) * 100;

    const dpsDeltaHtml = state.baseline
      ? `<span class="stat-delta ${dpsDelta >= 0 ? 'positive' : 'negative'}" aria-label="Change from baseline">${dpsDelta >= 0 ? '+' : ''}${Math.round(dpsDelta).toLocaleString()} (${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(1)}%)</span>`
      : '';
    const atkDeltaHtml =
      state.baseline && atkDelta
        ? `<span class="stat-delta ${atkDelta.delta >= 0 ? 'positive' : 'negative'}">${formatDelta(atkDelta)}</span>`
        : '';

    return `
      <section class="stats-dashboard" aria-label="Combat statistics">
        <div class="stats-primary">
          <article class="stat-card stat-card-hero">
            <span class="stat-eyebrow">Basic Attack DPS</span>
            <span class="stat-value-xl">${Math.round(dps).toLocaleString()}</span>
            ${dpsDeltaHtml}
          </article>
          <article class="stat-card stat-card-hero stat-card-accent">
            <span class="stat-eyebrow">Attack Damage</span>
            <span class="stat-value-xl">${formatStatValue('AttackDamage', current.AttackDamage)}</span>
            ${atkDeltaHtml}
          </article>
        </div>
        <div class="stats-secondary">
          <article class="stat-card stat-card-compact">
            <span class="stat-eyebrow">Attack Speed</span>
            <span class="stat-value-md">${formatStatValue('AttackSpeed', current.AttackSpeed)}</span>
          </article>
          <article class="stat-card stat-card-compact">
            <span class="stat-eyebrow">Crit Chance</span>
            <span class="stat-value-md">${formatStatValue('CriticalChance', current.CriticalChance)}</span>
          </article>
          <article class="stat-card stat-card-compact">
            <span class="stat-eyebrow">Crit Damage</span>
            <span class="stat-value-md">${formatStatValue('CriticalDamage', current.CriticalDamage)}</span>
          </article>
        </div>
      </section>`;
  }

  function drawCommandDeck(): string {
    const hero = heroDef();
    const save = heroSave();
    const level = save ? heroLevelFromSave(save) : 1;
    const hasBaseline = !!state.baseline;

    return `
      <section class="command-deck forge-panel" aria-label="Build controls">
        <div class="command-deck-grid">
          <div class="build-context">
            <span class="eyebrow">Active build</span>
            <h2 class="build-hero-name">
              ${hero?.name ?? 'Unknown'}
              <span class="build-hero-meta">Lv.${level} · ${hero?.class ?? ''}</span>
            </h2>
            <p class="status-pill ${hasBaseline ? 'is-set' : ''}" role="status">
              ${hasBaseline ? 'Baseline set — stat deltas are live' : 'No baseline yet — import a save or set baseline to track changes'}
            </p>
          </div>
          <div class="command-actions">
            <label class="btn btn-secondary">
              Import save
              <input type="file" accept=".es3,.bak" data-action="load-save" hidden />
            </label>
            <button type="button" class="btn btn-ghost" data-action="new-build">New build</button>
            <button type="button" class="btn btn-primary" data-action="set-baseline">Set baseline</button>
          </div>
        </div>
      </section>`;
  }

  function passiveLevel(key: number): number {
    return getPassiveLevel(state.working, key);
  }

  function drawSkillNode(node: PassiveNode): string {
    const level = passiveLevel(node.key);
    const max = node.maxLevel ?? 1;
    const icon = skillIconUrl(node.icon);
    const lvClass = level >= max ? 'max' : level > 0 ? 'has' : '';

    return `
      <div class="skill-node" title="${passiveNodeLabel(node)} · ${node.perPoint ?? ''}/lvl">
        <img class="node-frame" src="${skillNodeFrameUrl('passive', level, max)}" alt="" />
        ${icon ? `<img class="node-icon" src="${icon}" alt="" loading="lazy" />` : ''}
        <span class="node-lv ${lvClass}">${level}</span>
        <div class="node-controls">
          <button type="button" data-action="passive-dec" data-key="${node.key}">−</button>
          <button type="button" data-action="passive-inc" data-key="${node.key}" data-max="${max}">+</button>
        </div>
      </div>`;
  }

  function drawActiveNode(node: PassiveNode): string {
    const icon = skillIconUrl(node.icon);
    return `
      <div class="skill-node active-only" title="${node.name ?? 'Skill'}">
        <img class="node-frame" src="${skillNodeFrameUrl('active', 0, 1)}" alt="" />
        ${icon ? `<img class="node-icon" src="${icon}" alt="" loading="lazy" />` : ''}
      </div>`;
  }

  function drawSkillTree(): string {
    const hero = heroDef();
    const save = heroSave();
    if (!hero || !save) return '';

    const heroLevel = heroLevelFromSave(save);
    const unlockedGroups = new Set(save.unlockedAttributeGroupKeys ?? []);
    const groups = hero.tree;
    const maxGate = Math.max(...groups.map((g) => g.levelGate), 1);
    const fillPct = Math.min(100, (heroLevel / maxGate) * 100);

    const rows = groups
      .map((group) => {
        const hasPoints = group.nodes.some(
          (n) => n.kind === 'passive' && passiveLevel(n.key) > 0,
        );
        const unlocked =
          heroLevel >= group.levelGate || unlockedGroups.has(group.group) || hasPoints;
        const passives = group.nodes.filter((n) => n.kind === 'passive' && n.stat && n.stat !== 'NONE');
        const actives = group.nodes.filter((n) => n.kind === 'active');
        const nodes = [...passives.map(drawSkillNode), ...actives.map(drawActiveNode)].join('');

        return `
          <div class="tree-row${unlocked ? '' : ' locked'}">
            <div class="rail-row">
              <span class="${unlocked ? 'active' : ''}">${group.levelGate}</span>
              <i class="rail-tick"></i>
              <i class="row-arrow"></i>
            </div>
            <div class="skill-section">
              <img class="section-bg" src="${skillSectionBgUrl(unlocked)}" alt="" />
              <div class="nodes">${nodes}</div>
              ${unlocked ? '' : `<img class="locked-icon" src="${skillSectionLockedIconUrl()}" alt="" />`}
            </div>
          </div>`;
      })
      .join('');

    return `
      <aside class="skill-tree-panel forge-panel" id="panel-passives" aria-label="Skill tree">
        <header class="forge-panel-head">
          <h3 class="forge-panel-title">Passive Tree</h3>
          <p class="forge-panel-desc">Hover nodes to adjust · Lv.${heroLevel} hero</p>
        </header>
        <div class="attr-tree">
          <div class="tree-content" style="--level-fill: ${fillPct}%; --level-top: ${fillPct}%">
            <div class="level-rail" aria-hidden="true">
              <div class="rail-bg"></div>
              <div class="rail-fill"></div>
              <i class="rail-handle"></i>
            </div>
            ${rows}
          </div>
        </div>
      </aside>`;
  }

  function drawRunePanel(): string {
    const cards = heroCombatRunesForPanel(ctx.runes.runes)
      .map((rune) => {
        const level = getRuneLevel(state.working, rune.key);
        const max = rune.maxLevel ?? 1;
        const icon = runeIconUrl(rune.icon);
        const lvClass = level >= max ? 'max' : level > 0 ? 'has' : '';

        return `
          <article class="rune-card">
            <div class="rune-card-icon">
              ${icon ? `<img class="rune-icon" src="${icon}" alt="" loading="lazy" />` : ''}
              <span class="rune-lv ${lvClass}">${level}/${max}</span>
            </div>
            <div class="rune-card-body">
              <strong>${rune.name}</strong>
              <div class="small">${rune.effect ?? rune.stat ?? ''}</div>
            </div>
            <div class="rune-card-controls">
              <button type="button" data-action="rune-dec" data-key="${rune.key}">−</button>
              <button type="button" data-action="rune-inc" data-key="${rune.key}" data-max="${max}">+</button>
            </div>
          </article>`;
      })
      .join('');

    return `
      <aside class="rune-panel forge-panel" id="panel-runes" aria-label="Hero runes">
        <header class="forge-panel-head">
          <h3 class="forge-panel-title">Hero Runes</h3>
          <p class="forge-panel-desc">Account-wide combat bonuses</p>
        </header>
        <div class="rune-grid">${cards}</div>
      </aside>`;
  }

  function drawWorkspaceNav(): string {
    return `
      <nav class="workspace-nav" aria-label="Jump to build section">
        <a class="workspace-nav-link" href="#panel-passives">Passives</a>
        <a class="workspace-nav-link" href="#panel-hero">Hero &amp; Gear</a>
        <a class="workspace-nav-link" href="#panel-runes">Runes</a>
      </nav>`;
  }

  function drawBuildLayout(): string {
    return `
      ${drawWorkspaceNav()}
      <div class="sim-build-row">
        ${drawSkillTree()}
        <div class="hero-column">${drawHeroWindow()}</div>
        ${drawRunePanel()}
      </div>`;
  }

  function draw(): void {
    stopPortraitAnim();
    root.innerHTML = `
      <div class="sim-page">
        ${drawCommandDeck()}
        ${drawStats()}
        ${drawBuildLayout()}
      </div>
      <div id="sim-modal"></div>
    `;
    bindEvents();
    startPortraitAnim();
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

      modalRoot.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal" role="presentation">
          <div class="modal gear-modal" role="dialog" aria-modal="true" aria-labelledby="gear-modal-title">
            <div class="modal-header">
              <div>
                <span class="eyebrow">Equipment</span>
                <h3 id="gear-modal-title">Pick ${PART_LABELS[part]}</h3>
              </div>
              <button type="button" class="btn btn-ghost btn-icon" data-action="close-modal" aria-label="Close">✕</button>
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
                <p class="gear-modal-count small">${filtered.length} items match</p>
              </aside>
              <div class="gear-modal-results">
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
                      <button type="button" class="btn btn-primary btn-sm" data-action="equip" data-key="${item.key}">Equip</button>
                    </article>`,
                    )
                    .join('')}
                </div>
                ${visible.length < filtered.length ? `<button type="button" class="btn btn-secondary gear-load-more" data-action="more">Load more</button>` : ''}
              </div>
            </div>
          </div>
        </div>`;

      modalRoot.querySelector('.modal')?.addEventListener('click', (ev) => ev.stopPropagation());
      modalRoot.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
        el.addEventListener('click', () => {
          modalRoot.innerHTML = '';
        });
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
            <div class="modal-header">
              <div>
                <span class="eyebrow">Socket editor</span>
                <h3 id="socket-modal-title">${item!.name}</h3>
              </div>
              <button type="button" class="btn btn-ghost btn-icon" data-action="close-modal" aria-label="Close">✕</button>
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
                        ${
                          mat
                            ? itemIconHtml(mat.icon, mat.name, 'socket-mat-icon')
                            : '<span class="socket-mat-empty" aria-hidden="true">—</span>'
                        }
                        <div class="socket-mat-meta">
                          <span class="socket-mat-name">${mat?.name ?? 'Empty'}</span>
                          ${group ? `<span class="socket-roll-hint">${rollHint}</span>` : ''}
                        </div>
                      </div>
                    </div>
                    <div class="socket-mat-label">Material</div>
                    <div class="material-picker" role="listbox" aria-label="${slot.category} ${slot.index + 1} material">
                      <button
                        type="button"
                        class="material-chip${slot.materialKey == null ? ' selected' : ''}"
                        data-action="pick-material"
                        data-slot="${idx}"
                        data-key=""
                        data-label="Empty"
                        title="Empty"
                        role="option"
                        aria-selected="${slot.materialKey == null}"
                      >
                        <span class="material-chip-empty">∅</span>
                      </button>
                      ${mats
                        .map((m) => {
                          const label = m.name.replace(/"/g, '&quot;');
                          return `
                        <button
                          type="button"
                          class="material-chip${slot.materialKey === m.key ? ' selected' : ''}"
                          data-action="pick-material"
                          data-slot="${idx}"
                          data-key="${m.key}"
                          data-label="${label}"
                          title="${label}"
                          role="option"
                          aria-selected="${slot.materialKey === m.key}"
                        >
                          ${itemIconHtml(m.icon, m.name, 'material-chip-icon')}
                          <span class="material-chip-tooltip">${m.name}</span>
                        </button>`;
                        })
                        .join('')}
                    </div>
                    <div class="socket-options">
                    ${
                      groups.length > 1
                        ? `<label class="socket-field">Stat
                            <select data-slot="${idx}" data-field="group">${groups.map((g, gi) => `<option value="${gi}" ${slot.groupIndex === gi ? 'selected' : ''}>${g.stat} ${g.disp ?? ''}</option>`).join('')}</select>
                          </label>`
                        : ''
                    }
                    <label class="socket-field">Roll
                      <select data-slot="${idx}" data-field="roll">
                        <option value="min" ${slot.roll === 'min' ? 'selected' : ''}>Min${group ? ` (${group.min})` : ''}</option>
                        <option value="mid" ${slot.roll === 'mid' ? 'selected' : ''}>Mid</option>
                        <option value="max" ${slot.roll === 'max' ? 'selected' : ''}>Max${group ? ` (${group.max})` : ''}</option>
                        <option value="custom" ${slot.roll === 'custom' ? 'selected' : ''}>Custom</option>
                      </select>
                    </label>
                    ${
                      slot.roll === 'custom' && group
                        ? `<label class="socket-field socket-custom-field">Value
                            <input
                              type="number"
                              step="any"
                              data-slot="${idx}"
                              data-field="customValue"
                              value="${slot.customValue ?? group.max}"
                              min="${group.min}"
                              max="${group.max}"
                            />
                            <span class="socket-roll-range">${group.min} – ${group.max}</span>
                          </label>`
                        : ''
                    }
                    </div>
                  </div>`;
              })
              .join('')}
            </div>
            <footer class="modal-footer">
              <button type="button" class="btn btn-primary" data-action="apply-sockets">Apply &amp; recompute stats</button>
            </footer>
          </div>
        </div>`;

      modalRoot.querySelector('.modal')?.addEventListener('click', (ev) => ev.stopPropagation());
      modalRoot.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
        el.addEventListener('click', () => {
          modalRoot.innerHTML = '';
        });
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

          if (field === 'group') {
            slot.groupIndex = Number((el as HTMLSelectElement).value);
          } else if (field === 'roll') {
            slot.roll = (el as HTMLSelectElement).value as SocketSlotState['roll'];
            if (slot.roll === 'custom' && group && slot.customValue == null) {
              slot.customValue = group.max;
            }
            renderModal();
            return;
          } else if (field === 'customValue') {
            slot.customValue = Number((el as HTMLInputElement).value);
            if (group) {
              slot.customValue = Math.max(group.min, Math.min(group.max, slot.customValue));
            }
            return;
          }
          renderModal();
        };
        el.addEventListener('change', handler);
        if (el.getAttribute('data-field') === 'customValue') {
          el.addEventListener('input', handler);
        }
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
        draw();
      } catch (err) {
        alert(isSaveFileError(err) ? err.message : String(err));
      }
    });

    root.querySelector('[data-action="new-build"]')?.addEventListener('click', () => {
      state.working = createEmptySave(state.heroKey);
      state.baseline = clonePlayerSave(state.working);
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
        const cur = getPassiveLevel(state.working, key);
        setPassiveLevel(state.working, key, cur + 1, max);
        draw();
      });
    });

    root.querySelectorAll('[data-action="passive-dec"]').forEach((el) => {
      el.addEventListener('click', () => {
        const key = Number(el.getAttribute('data-key'));
        const cur = getPassiveLevel(state.working, key);
        setPassiveLevel(state.working, key, cur - 1, 999);
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
  }

  draw();
}
