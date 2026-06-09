import { itemIconHtml } from '../data/icons';
import { partLabel, t } from '../i18n';
import {
  DEFAULT_GEAR_FILTER,
  filterGear,
  gearAffixLabel,
  gradeClass,
  itemMatchesHeroClass,
  paginate,
  type GearFilterState,
} from '../gear/filter';
import type { EnrichedItem, HeroPart, MetaData } from '../types';

const GEAR_PAGE_SIZE = 60;

export interface GearPickerModalOptions {
  modalRoot: HTMLElement;
  part: HeroPart;
  heroClass: string;
  items: EnrichedItem[];
  meta: MetaData;
  equipped?: EnrichedItem;
  onEquip: (item: EnrichedItem) => void;
  onUnequip: () => void;
}

function gradeOptionLabel(grade: string): string {
  return grade[0] + grade.slice(1).toLowerCase();
}

function renderGearCard(item: EnrichedItem): string {
  const affix = gearAffixLabel(item);
  return `
    <article class="gear-card ${gradeClass(item.grade)}">
      ${itemIconHtml(item.icon, item.name)}
      <div class="gear-card-body">
        <h4 class="${gradeClass(item.grade)}">${item.name}${item.variant ? ` (${item.variant})` : ''}</h4>
        <p class="meta">${item.grade} · Lv${item.level ?? '?'} · ${item.gearType ?? 'Gear'}</p>
        ${affix ? `<p class="meta">${affix}</p>` : ''}
        ${
          item.slots
            ? `<p class="meta">Sockets D${item.slots.decoration} E${item.slots.engraving} I${item.slots.inscription}</p>`
            : ''
        }
      </div>
      <button type="button" class="rpg-btn rpg-btn--gold rpg-btn--sm" data-action="equip" data-key="${item.key}">${t('gearModal.equip')}</button>
    </article>`;
}

export function openGearPickerModal(options: GearPickerModalOptions): void {
  const { modalRoot, part, heroClass, items, meta, equipped, onEquip, onUnequip } = options;

  let filter: GearFilterState = { ...DEFAULT_GEAR_FILTER };
  if (meta.gearLevels?.length) {
    filter.levelMin = meta.gearLevels[0];
    filter.levelMax = meta.gearLevels[meta.gearLevels.length - 1];
  }
  let page = 1;

  function allowedGear(item: EnrichedItem): boolean {
    if (item.type !== 'GEAR') return false;
    if (item.parts && item.parts !== part) return false;
    if (!itemMatchesHeroClass(item, heroClass)) return false;
    return true;
  }

  function close(): void {
    modalRoot.innerHTML = '';
  }

  function renderModal(): void {
    const pool = items.filter(allowedGear);
    const filtered = filterGear(pool, filter);
    const visible = paginate(filtered, page, GEAR_PAGE_SIZE);

    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal" role="presentation">
        <div class="modal gear-picker-modal" role="dialog" aria-modal="true" aria-labelledby="gear-modal-title">
          <div class="modal-frame">
            <header class="modal-header">
              <div>
                <p class="text-kicker">${t('gearModal.equipment')}</p>
                <h3 id="gear-modal-title">${t('gearModal.selectPart', { part: partLabel(part) })}</h3>
              </div>
              <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--icon" data-action="close-modal" aria-label="${t('build.close')}">✕</button>
            </header>
            <div class="gear-modal-body">
              <aside class="gear-modal-filters">
                <p class="text-kicker">${t('gear.filters')}</p>
                <h2 class="rpg-panel-title">${t('gear.refineSearch')}</h2>
                <div class="gear-db-filter-fields">
                  <label class="field">
                    <span class="field-label">${t('gear.rarity')}</span>
                    <select data-field="grade">
                      <option value="ALL"${filter.grade === 'ALL' ? ' selected' : ''}>${t('gear.all')}</option>
                      ${meta.grades
                        .map(
                          (g) =>
                            `<option value="${g}"${filter.grade === g ? ' selected' : ''}>${gradeOptionLabel(g)}</option>`,
                        )
                        .join('')}
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label">${t('gear.type')}</span>
                    <select data-field="category">
                      <option value="all"${filter.category === 'all' ? ' selected' : ''}>${t('gear.all')}</option>
                      <option value="weapon"${filter.category === 'weapon' ? ' selected' : ''}>${t('gear.weapon')}</option>
                      <option value="off_hand"${filter.category === 'off_hand' ? ' selected' : ''}>${t('gear.offHand')}</option>
                      <option value="armor"${filter.category === 'armor' ? ' selected' : ''}>${t('gear.armor')}</option>
                      <option value="accessory"${filter.category === 'accessory' ? ' selected' : ''}>${t('gear.accessory')}</option>
                    </select>
                  </label>
                  <label class="field">
                    <span class="field-label">${t('gear.levelMin')}</span>
                    <input type="number" data-field="levelMin" value="${filter.levelMin}" min="1" max="100" />
                  </label>
                  <label class="field">
                    <span class="field-label">${t('gear.levelMax')}</span>
                    <input type="number" data-field="levelMax" value="${filter.levelMax}" min="1" max="100" />
                  </label>
                  <label class="field">
                    <span class="field-label">${t('gear.search')}</span>
                    <input type="search" data-field="search" value="${filter.search}" placeholder="${t('gear.searchPlaceholder')}" />
                  </label>
                </div>
                <p class="gear-db-count text-muted">${t('gear.results', { total: filtered.length.toLocaleString(), visible: visible.length.toLocaleString() })}</p>
              </aside>
              <div class="gear-modal-results">
                ${
                  equipped
                    ? `
                <div class="gear-equipped-bar">
                  <div class="gear-equipped-current">
                    ${itemIconHtml(equipped.icon, equipped.name, 'gear-equipped-icon')}
                    <div class="gear-equipped-meta">
                      <span class="gear-equipped-label">${t('gearModal.equipped')}</span>
                      <span class="gear-equipped-name">${equipped.name}${equipped.variant ? ` (${equipped.variant})` : ''}</span>
                    </div>
                  </div>
                  <button type="button" class="rpg-btn rpg-btn--ghost" data-action="unequip">${t('gearModal.remove')}</button>
                </div>`
                    : ''
                }
                <div class="gear-grid">
                  ${visible.map((item) => renderGearCard(item)).join('')}
                </div>
                ${
                  visible.length < filtered.length
                    ? `<button type="button" class="rpg-btn rpg-btn--gold gear-db-load-more" data-action="load-more">${t('gear.loadMore', { left: (filtered.length - visible.length).toLocaleString() })}</button>`
                    : ''
                }
              </div>
            </div>
          </div>
        </div>
      </div>`;

    modalRoot.querySelector('.modal')?.addEventListener('click', (ev) => ev.stopPropagation());
    modalRoot.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
      el.addEventListener('click', close);
    });
    modalRoot.querySelector('[data-action="unequip"]')?.addEventListener('click', () => {
      onUnequip();
      close();
    });
    modalRoot.querySelectorAll('[data-action="equip"]').forEach((el) => {
      el.addEventListener('click', () => {
        const key = Number(el.getAttribute('data-key'));
        const item = items.find((i) => i.key === key);
        if (!item) return;
        onEquip(item);
        close();
      });
    });
    modalRoot.querySelector('[data-action="load-more"]')?.addEventListener('click', () => {
      page += 1;
      renderModal();
    });

    const onFilterChange = (el: Element): void => {
      const field = el.getAttribute('data-field');
      if (!field) return;
      if (field === 'grade') filter.grade = (el as HTMLSelectElement).value;
      if (field === 'category') filter.category = (el as HTMLSelectElement).value as GearFilterState['category'];
      if (field === 'search') filter.search = (el as HTMLInputElement).value;
      if (field === 'levelMin') filter.levelMin = Number((el as HTMLInputElement).value);
      if (field === 'levelMax') filter.levelMax = Number((el as HTMLInputElement).value);
      page = 1;
      renderModal();
    };

    modalRoot.querySelectorAll('[data-field]').forEach((el) => {
      el.addEventListener('input', () => onFilterChange(el));
      el.addEventListener('change', () => onFilterChange(el));
    });
  }

  renderModal();
}
