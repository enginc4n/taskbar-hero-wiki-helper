import { mergeRefMaps, buildRefMaps, enrichedItemToDetail } from '../data/adapters';
import { computeAllStats, computeBasicDps, compareStats, formatStatValue, formatDelta } from '../engine/stats';
import { parseSaveFile, isSaveFileError, DEFAULT_ES3_PASSWORD } from '../engine/save-decrypt';
import {
  applySocketsToItem,
  clonePlayerSave,
  createEmptySave,
  equipItem,
  getEffectGroupsForGear,
  getRuneLevel,
  getSelectedHero,
  getSocketSlots,
  listPassiveNodes,
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
  PlayerSaveData,
  RefMaps,
  RuneGraph,
} from '../types';
import { HERO_PARTS, PART_LABELS } from '../types';
import { filterGear, DEFAULT_GEAR_FILTER, type GearFilterState } from '../gear/filter';

export interface SimulatorContext {
  items: EnrichedItem[];
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
    itemsByKey: syncSaveItemKeys(createEmptySave(ctx.heroes[0]?.key ?? 101), ctx.items),
    effectsByKey: new Map(ctx.effects.map((e) => [e.key, e])),
    socketDraft: new Map(),
  };

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

    return `
      <div class="stats-bar">
        <div class="stat-box">
          <div class="label">Attack Damage</div>
          <div class="value">${formatStatValue('AttackDamage', current.AttackDamage)}</div>
          ${state.baseline && atkDelta ? `<div class="delta ${atkDelta.delta >= 0 ? 'positive' : 'negative'}">${formatDelta(atkDelta)}</div>` : ''}
        </div>
        <div class="stat-box">
          <div class="label">Basic Attack DPS</div>
          <div class="value">${Math.round(dps).toLocaleString()}</div>
          ${state.baseline ? `<div class="delta ${dpsDelta >= 0 ? 'positive' : 'negative'}">${dpsDelta >= 0 ? '+' : ''}${Math.round(dpsDelta).toLocaleString()} (${dpsPct >= 0 ? '+' : ''}${dpsPct.toFixed(1)}%)</div>` : ''}
        </div>
        <div class="stat-box"><div class="label">Attack Speed</div><div class="value">${formatStatValue('AttackSpeed', current.AttackSpeed)}</div></div>
        <div class="stat-box"><div class="label">Crit</div><div class="value">${formatStatValue('CriticalChance', current.CriticalChance)} / ${formatStatValue('CriticalDamage', current.CriticalDamage)}</div></div>
      </div>`;
  }

  function drawGearSlots(): string {
    const hero = heroSave();
    if (!hero) return '';
    return HERO_PARTS.map((part) => {
      const uid = hero.equippedItemIds[partIndex(part)];
      const inst = uid
        ? state.working.itemSaveDatas.find((i) => String(i.UniqueId) === String(uid))
        : null;
      const item = inst ? state.itemsByKey.get(inst.ItemKey) : undefined;
      const label = item ? `${item.name}${item.variant ? ` (${item.variant})` : ''}` : 'Empty';
      return `
        <div class="slot-row">
          <div><strong>${PART_LABELS[part]}</strong><div class="small">${label}</div></div>
          <div>
            <button data-action="pick-gear" data-part="${part}">Change</button>
            ${item ? `<button data-action="edit-sockets" data-part="${part}">Sockets</button>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  function drawPassives(): string {
    const hero = heroDef();
    if (!hero) return '';
    return listPassiveNodes(hero)
      .map((node) => {
        const level = state.working.attributeSaveDatas?.find((a) => a.Key === node.key)?.Level ?? 0;
        return `
          <div class="passive-row">
            <div><strong>${node.stat}</strong><div class="small">${node.perPoint ?? ''} per level · max ${node.maxLevel ?? 1}</div></div>
            <div>
              <button data-action="passive-dec" data-key="${node.key}">-</button>
              <span>${level}</span>
              <button data-action="passive-inc" data-key="${node.key}" data-max="${node.maxLevel ?? 1}">+</button>
            </div>
          </div>`;
      })
      .join('');
  }

  function drawRunes(): string {
    return ctx.runes.runes
      .slice(0, 40)
      .map((rune) => {
        const level = getRuneLevel(state.working, rune.key);
        const max = rune.maxLevel ?? 1;
        return `
          <div class="rune-row">
            <div><strong>${rune.name}</strong><div class="small">${rune.stat ?? ''}</div></div>
            <div>
              <button data-action="rune-dec" data-key="${rune.key}">-</button>
              <span>${level}/${max}</span>
              <button data-action="rune-inc" data-key="${rune.key}" data-max="${max}">+</button>
            </div>
          </div>`;
      })
      .join('');
  }

  function draw(): void {
    root.innerHTML = `
      <div class="toolbar">
        <label class="small">Load save (.es3)
          <input type="file" accept=".es3,.bak" data-action="load-save" />
        </label>
        <button data-action="new-build">New Build</button>
        <button data-action="set-baseline">Set Baseline</button>
        <label>Hero
          <select data-action="hero-select">
            ${ctx.heroes.map((h) => `<option value="${h.key}" ${h.key === state.heroKey ? 'selected' : ''}>${h.name}</option>`).join('')}
          </select>
        </label>
      </div>
      ${drawStats()}
      <div class="sim-layout">
        <div class="panel">
          <h3>Gear</h3>
          <div class="slot-list">${drawGearSlots()}</div>
        </div>
        <div>
          <div class="panel" style="margin-bottom:1rem">
            <h3>Passives</h3>
            <div class="passive-list">${drawPassives()}</div>
          </div>
          <div class="panel">
            <h3>Runes</h3>
            <p class="small">Showing first 40 rune nodes.</p>
            <div class="rune-list">${drawRunes()}</div>
          </div>
        </div>
      </div>
      <div id="sim-modal"></div>
    `;
    bindEvents();
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
      if (item.classes?.length && !item.classes.includes(hero!.class)) return false;
      return true;
    }

    function renderModal(): void {
      const pool = ctx.items.filter(allowedGear);
      const filtered = filterGear(pool, filter);
      const visible = filtered.slice(0, page * 40);

      modalRoot.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal">
          <div class="modal">
            <div class="modal-header">
              <h3>Pick ${PART_LABELS[part]}</h3>
              <button data-action="close-modal">Close</button>
            </div>
            <div class="filters">
              <label>Grade<select data-field="grade"><option value="ALL">All</option>${ctx.meta.grades.map((g) => `<option value="${g}">${g}</option>`).join('')}</select></label>
              <label>Search<input data-field="search" value="${filter.search}" /></label>
              <label style="flex-direction:row;align-items:center;gap:0.5rem;margin-top:1.4rem;"><input type="checkbox" data-field="obtainableOnly" ${filter.obtainableOnly ? 'checked' : ''}/> Obtainable</label>
            </div>
            <div class="gear-grid">
              ${visible
                .map(
                  (item) => `
                <article class="gear-card">
                  <h3>${item.name}${item.variant ? ` (${item.variant})` : ''}</h3>
                  <div class="meta">${item.grade} Lv${item.level}</div>
                  <button data-action="equip" data-key="${item.key}">Equip</button>
                </article>`,
                )
                .join('')}
            </div>
            ${visible.length < filtered.length ? `<button data-action="more">More</button>` : ''}
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
          const item = state.itemsByKey.get(key) ?? ctx.items.find((i) => i.key === key);
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
        el.addEventListener('input', () => {
          const field = el.getAttribute('data-field')!;
          if (field === 'grade') filter.grade = (el as HTMLSelectElement).value;
          if (field === 'search') filter.search = (el as HTMLInputElement).value;
          if (field === 'obtainableOnly') filter.obtainableOnly = (el as HTMLInputElement).checked;
          page = 1;
          renderModal();
        });
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

    function renderModal(): void {
      modalRoot.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal">
          <div class="modal">
            <div class="modal-header">
              <h3>Sockets — ${item!.name}</h3>
              <button data-action="close-modal">Close</button>
            </div>
            ${draft
              .map((slot, idx) => {
                const mats = ctx.effects.filter((e) => e.category === slot.category);
                const mat = slot.materialKey ? state.effectsByKey.get(slot.materialKey) : null;
                const groups = mat ? getEffectGroupsForGear(mat, item!) : [];
                return `
                  <div class="socket-editor">
                    <strong>${slot.category} ${slot.index + 1}</strong>
                    <label>Material
                      <select data-slot="${idx}" data-field="material">
                        <option value="">— Empty —</option>
                        ${mats.map((m) => `<option value="${m.key}" ${slot.materialKey === m.key ? 'selected' : ''}>${m.name}</option>`).join('')}
                      </select>
                    </label>
                    ${
                      groups.length > 1
                        ? `<label>Stat option<select data-slot="${idx}" data-field="group">${groups.map((g, gi) => `<option value="${gi}" ${slot.groupIndex === gi ? 'selected' : ''}>${g.stat} ${g.disp ?? ''}</option>`).join('')}</select></label>`
                        : ''
                    }
                    <label>Roll<select data-slot="${idx}" data-field="roll">
                      <option value="min" ${slot.roll === 'min' ? 'selected' : ''}>Min</option>
                      <option value="mid" ${slot.roll === 'mid' ? 'selected' : ''}>Mid</option>
                      <option value="max" ${slot.roll === 'max' ? 'selected' : ''}>Max</option>
                    </select></label>
                  </div>`;
              })
              .join('')}
            <button class="primary" data-action="apply-sockets">Apply & Recompute</button>
          </div>
        </div>`;

      modalRoot.querySelector('.modal')?.addEventListener('click', (ev) => ev.stopPropagation());
      modalRoot.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
        el.addEventListener('click', () => {
          modalRoot.innerHTML = '';
        });
      });
      modalRoot.querySelectorAll('[data-field]').forEach((el) => {
        el.addEventListener('change', () => {
          const idx = Number(el.getAttribute('data-slot'));
          const field = el.getAttribute('data-field')!;
          const slot = draft[idx];
          if (field === 'material') {
            const val = (el as HTMLSelectElement).value;
            slot.materialKey = val ? Number(val) : null;
            slot.groupIndex = 0;
          } else if (field === 'group') {
            slot.groupIndex = Number((el as HTMLSelectElement).value);
          } else if (field === 'roll') {
            slot.roll = (el as HTMLSelectElement).value as SocketSlotState['roll'];
          }
        });
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
        state.working = clonePlayerSave(parsed.PlayerSaveData);
        state.baseline = clonePlayerSave(parsed.PlayerSaveData);
        state.heroKey = state.working.heroSaveDatas.find((h) => h.IsUnLock)?.heroKey ?? state.heroKey;
        state.itemsByKey = syncSaveItemKeys(state.working, ctx.items);
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

    root.querySelector('[data-action="hero-select"]')?.addEventListener('change', (e) => {
      state.heroKey = Number((e.target as HTMLSelectElement).value);
      if (!getSelectedHero(state.working, state.heroKey)) {
        state.working.heroSaveDatas.push(...createEmptySave(state.heroKey).heroSaveDatas);
      }
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
        const key = Number(el.getAttribute('data-key'));
        const max = Number(el.getAttribute('data-max'));
        const cur = state.working.attributeSaveDatas?.find((a) => a.Key === key)?.Level ?? 0;
        setPassiveLevel(state.working, key, cur + 1, max);
        draw();
      });
    });

    root.querySelectorAll('[data-action="passive-dec"]').forEach((el) => {
      el.addEventListener('click', () => {
        const key = Number(el.getAttribute('data-key'));
        const cur = state.working.attributeSaveDatas?.find((a) => a.Key === key)?.Level ?? 0;
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
