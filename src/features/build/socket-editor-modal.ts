import { formatStatLabel } from '@/core/engine/stats';
import { itemIconHtml } from '@/presentation/icons';
import { t, type TranslationKey } from '@/i18n';
import {
  applySocketsToItem,
  getEffectGroupsForGear,
  getSocketSlots,
  type SocketSlotState,
} from '@/core/simulator/build-state';
import type { EffectGroup, EffectMaterial, EnrichedItem, ItemSaveData } from '@/core/types';

export interface SocketEditorModalOptions {
  modalRoot: HTMLElement;
  item: EnrichedItem;
  inst: ItemSaveData;
  effects: EffectMaterial[];
  effectsByKey: Map<number, EffectMaterial>;
  socketDraft: Map<string, SocketSlotState[]>;
  onApplied: () => void;
}

const CATEGORY_ORDER = ['DECORATION', 'ENGRAVING', 'INSCRIPTION'] as const;

const CATEGORY_LABEL_KEYS: Record<SocketSlotState['category'], TranslationKey> = {
  DECORATION: 'socketModal.category.decoration',
  ENGRAVING: 'socketModal.category.engraving',
  INSCRIPTION: 'socketModal.category.inscription',
};

function formatRollHint(group: EffectGroup): string {
  return group.disp ?? `${group.min} – ${group.max}`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const MATERIAL_TOOLTIP_EFFECT_LIMIT = 5;

function formatMaterialEffectLines(material: EffectMaterial, item: EnrichedItem): string[] {
  const groups = getEffectGroupsForGear(material, item);
  const lines = groups.map((group) => {
    const range = formatRollHint(group);
    return `${formatStatLabel(group.stat)} ${range}`;
  });
  if (lines.length <= MATERIAL_TOOLTIP_EFFECT_LIMIT) return lines;
  const shown = lines.slice(0, MATERIAL_TOOLTIP_EFFECT_LIMIT - 1);
  shown.push(`+${lines.length - (MATERIAL_TOOLTIP_EFFECT_LIMIT - 1)} more`);
  return shown;
}

function renderMaterialChipTooltip(material: EffectMaterial, item: EnrichedItem): string {
  const effects = formatMaterialEffectLines(material, item);
  return `
    <span class="material-chip-tooltip">
      <span class="material-chip-tooltip-name">${escapeHtml(material.name)}</span>
      ${effects.length ? `<span class="material-chip-tooltip-effects">${effects.map(escapeHtml).join('<br>')}</span>` : ''}
    </span>`;
}

function draftForItem(
  item: EnrichedItem,
  inst: ItemSaveData,
  socketDraft: Map<string, SocketSlotState[]>,
): SocketSlotState[] {
  const draftKey = String(inst.UniqueId);
  let draft = socketDraft.get(draftKey);
  if (!draft) {
    draft = [];
    for (const { category, count } of getSocketSlots(item)) {
      for (let i = 0; i < count; i++) {
        draft.push({ category, index: i, materialKey: null, groupIndex: 0, roll: 'max' });
      }
    }
    socketDraft.set(draftKey, draft);
  }
  return draft;
}

function renderSlotNav(draft: SocketSlotState[], effectsByKey: Map<number, EffectMaterial>, activeSlotIndex: number): string {
  const groups = CATEGORY_ORDER.filter((cat) => draft.some((s) => s.category === cat));

  return groups
    .map((category) => {
      const slots = draft
        .map((slot, idx) => ({ slot, idx }))
        .filter(({ slot }) => slot.category === category);

      return `
        <div class="socket-slot-group">
          <p class="socket-slot-group-label">${t(CATEGORY_LABEL_KEYS[category])}</p>
          ${slots
            .map(({ slot, idx }) => {
              const mat = slot.materialKey ? effectsByKey.get(slot.materialKey) : null;
              const label = `${t(CATEGORY_LABEL_KEYS[category])} ${slot.index + 1}`;
              return `
                <button
                  type="button"
                  class="socket-slot-btn${idx === activeSlotIndex ? ' active' : ''}"
                  role="tab"
                  aria-selected="${idx === activeSlotIndex}"
                  data-action="select-slot"
                  data-slot="${idx}"
                >
                  <span class="socket-slot-btn-label">${label}</span>
                  <span class="socket-slot-btn-icon">
                    ${mat ? itemIconHtml(mat.icon, mat.name, 'socket-slot-btn-thumb') : '<span class="socket-mat-empty" aria-hidden="true">—</span>'}
                  </span>
                </button>`;
            })
            .join('')}
        </div>`;
    })
    .join('');
}

function renderActiveSlotEditor(
  slot: SocketSlotState,
  slotIdx: number,
  item: EnrichedItem,
  effects: EffectMaterial[],
  effectsByKey: Map<number, EffectMaterial>,
  materialSearch: string,
): string {
  const mats = effects.filter((e) => e.category === slot.category);
  const query = materialSearch.trim().toLowerCase();
  const filteredMats = query ? mats.filter((m) => m.name.toLowerCase().includes(query)) : mats;
  const mat = slot.materialKey ? effectsByKey.get(slot.materialKey) : null;
  const groups = mat ? getEffectGroupsForGear(mat, item) : [];
  const group = groups[slot.groupIndex] ?? groups[0];
  const rollHint = group ? formatRollHint(group) : '';
  const slotTitle = `${t(CATEGORY_LABEL_KEYS[slot.category])} ${slot.index + 1}`;

  return `
    <div class="socket-slot-panel-head">
      <h4 class="socket-slot-panel-title">${slotTitle}</h4>
      <div class="socket-slot-summary">
        ${mat ? itemIconHtml(mat.icon, mat.name, 'socket-mat-icon') : '<span class="socket-mat-empty" aria-hidden="true">—</span>'}
        <div class="socket-mat-meta">
          <span class="socket-mat-name">${mat?.name ?? t('build.empty')}</span>
          ${group ? `<span class="socket-roll-hint">${rollHint}</span>` : ''}
        </div>
      </div>
    </div>
    <label class="socket-material-search-wrap field">
      <span class="field-label">${t('socketModal.search')}</span>
      <input
        type="search"
        class="socket-material-search"
        data-field="materialSearch"
        value="${materialSearch.replace(/"/g, '&quot;')}"
        placeholder="${t('socketModal.searchPlaceholder')}"
        autocomplete="off"
      />
    </label>
    <div class="socket-mat-label">${t('socketModal.material')}</div>
    <div class="material-picker" role="listbox" aria-label="${slotTitle} ${t('socketModal.material')}">
      <button type="button" class="material-chip${slot.materialKey == null ? ' selected' : ''}" data-action="pick-material" data-key="" role="option" aria-selected="${slot.materialKey == null}">
        <span class="material-chip-empty">∅</span>
      </button>
      ${filteredMats
        .map((m) => {
          const label = m.name.replace(/"/g, '&quot;');
          const effectHint = formatMaterialEffectLines(m, item).join(' · ').replace(/"/g, '&quot;');
          const ariaLabel = effectHint ? `${m.name} — ${effectHint}` : m.name;
          return `
        <button type="button" class="material-chip${slot.materialKey === m.key ? ' selected' : ''}" data-action="pick-material" data-key="${m.key}" data-label="${label}" aria-label="${ariaLabel.replace(/"/g, '&quot;')}" role="option" aria-selected="${slot.materialKey === m.key}">
          ${itemIconHtml(m.icon, m.name, 'material-chip-icon')}
          ${renderMaterialChipTooltip(m, item)}
        </button>`;
        })
        .join('')}
    </div>
    <div class="socket-options">
      ${
        groups.length > 1
          ? `<label class="socket-field">${t('socketModal.stat')}<select data-slot="${slotIdx}" data-field="group">${groups.map((g, gi) => `<option value="${gi}" ${slot.groupIndex === gi ? 'selected' : ''}>${formatStatLabel(g.stat)} ${g.disp ?? ''}</option>`).join('')}</select></label>`
          : ''
      }
      <label class="socket-field">${t('socketModal.roll')}
        <select data-slot="${slotIdx}" data-field="roll">
          <option value="min" ${slot.roll === 'min' ? 'selected' : ''}>Min${group ? ` (${group.min})` : ''}</option>
          <option value="mid" ${slot.roll === 'mid' ? 'selected' : ''}>Mid</option>
          <option value="max" ${slot.roll === 'max' ? 'selected' : ''}>Max${group ? ` (${group.max})` : ''}</option>
          <option value="custom" ${slot.roll === 'custom' ? 'selected' : ''}>Custom</option>
        </select>
      </label>
      ${
        slot.roll === 'custom' && group
          ? `<label class="socket-field socket-custom-field">${t('socketModal.value')}<input type="number" step="any" data-slot="${slotIdx}" data-field="customValue" value="${slot.customValue ?? group.max}" min="${group.min}" max="${group.max}" /><span class="socket-roll-range">${group.min} – ${group.max}</span></label>`
          : ''
      }
    </div>`;
}

export function openSocketEditorModal(options: SocketEditorModalOptions): void {
  const { modalRoot, item, inst, effects, effectsByKey, socketDraft, onApplied } = options;
  const draft = draftForItem(item, inst, socketDraft);
  let activeSlotIndex = 0;
  let materialSearch = '';
  let refocusSearch = false;

  function close(): void {
    modalRoot.innerHTML = '';
  }

  function renderModal(): void {
    if (activeSlotIndex >= draft.length) activeSlotIndex = Math.max(0, draft.length - 1);
    const slot = draft[activeSlotIndex];

    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal" role="presentation">
        <div class="modal socket-modal" role="dialog" aria-modal="true" aria-labelledby="socket-modal-title">
          <div class="modal-frame">
            <header class="modal-header">
              <div>
                <p class="text-kicker">${t('socketModal.title')}</p>
                <h3 id="socket-modal-title">${item.name}</h3>
              </div>
              <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--icon" data-action="close-modal" aria-label="${t('build.close')}">✕</button>
            </header>
            <div class="socket-modal-body">
              <nav class="socket-slot-nav" role="tablist" aria-label="${t('socketModal.slots')}">
                <p class="text-kicker">${t('socketModal.slots')}</p>
                ${renderSlotNav(draft, effectsByKey, activeSlotIndex)}
              </nav>
              <div class="socket-slot-panel" role="tabpanel" aria-labelledby="socket-modal-title">
                ${renderActiveSlotEditor(slot, activeSlotIndex, item, effects, effectsByKey, materialSearch)}
              </div>
            </div>
            <footer class="modal-footer">
              <button type="button" class="rpg-btn rpg-btn--gold" data-action="apply-sockets">${t('gearModal.applySockets')}</button>
            </footer>
          </div>
        </div>
      </div>`;

    modalRoot.querySelector('.modal')?.addEventListener('click', (ev) => ev.stopPropagation());
    modalRoot.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
      el.addEventListener('click', close);
    });
    modalRoot.querySelectorAll('[data-action="select-slot"]').forEach((el) => {
      el.addEventListener('click', () => {
        activeSlotIndex = Number(el.getAttribute('data-slot'));
        materialSearch = '';
        renderModal();
      });
    });
    modalRoot.querySelectorAll('[data-action="pick-material"]').forEach((el) => {
      el.addEventListener('click', () => {
        const keyRaw = el.getAttribute('data-key');
        const slotState = draft[activeSlotIndex];
        slotState.materialKey = keyRaw ? Number(keyRaw) : null;
        slotState.groupIndex = 0;
        renderModal();
      });
    });
    modalRoot.querySelectorAll('[data-field]').forEach((el) => {
      const field = el.getAttribute('data-field')!;
      if (field === 'materialSearch') {
        const searchEl = el as HTMLInputElement;
        if (refocusSearch) {
          searchEl.focus();
          const len = searchEl.value.length;
          searchEl.setSelectionRange(len, len);
          refocusSearch = false;
        }
        searchEl.addEventListener('input', () => {
          materialSearch = searchEl.value;
          refocusSearch = true;
          renderModal();
        });
        return;
      }

      const handler = () => {
        const idx = Number(el.getAttribute('data-slot'));
        const slotState = draft[idx];
        const mat = slotState.materialKey ? effectsByKey.get(slotState.materialKey) : null;
        const groups = mat ? getEffectGroupsForGear(mat, item) : [];
        const group = groups[slotState.groupIndex] ?? groups[0];
        if (field === 'group') slotState.groupIndex = Number((el as HTMLSelectElement).value);
        else if (field === 'roll') {
          slotState.roll = (el as HTMLSelectElement).value as SocketSlotState['roll'];
          if (slotState.roll === 'custom' && group && slotState.customValue == null) slotState.customValue = group.max;
          renderModal();
          return;
        } else if (field === 'customValue') {
          slotState.customValue = Number((el as HTMLInputElement).value);
          if (group) slotState.customValue = Math.max(group.min, Math.min(group.max, slotState.customValue));
          return;
        }
        renderModal();
      };
      el.addEventListener('change', handler);
      if (field === 'customValue') el.addEventListener('input', handler);
    });
    modalRoot.querySelector('[data-action="apply-sockets"]')?.addEventListener('click', () => {
      applySocketsToItem(inst, item, draft, effectsByKey);
      onApplied();
      close();
    });
  }

  renderModal();
}
