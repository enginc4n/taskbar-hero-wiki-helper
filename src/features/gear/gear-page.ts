import type { EnrichedItem, MetaData } from '../types';
import { itemIconHtml } from '../data/icons';
import { t } from '../i18n';
import {
  DEFAULT_GEAR_FILTER,
  filterGear,
  gearAffixLabel,
  gradeClass,
  paginate,
  type GearFilterState,
} from '../gear/filter';

export interface GearPageContext {
  items: EnrichedItem[];
  meta: MetaData;
}

export function renderGearPage(root: HTMLElement, ctx: GearPageContext): void {
  let filter: GearFilterState = { ...DEFAULT_GEAR_FILTER };
  let page = 1;

  if (ctx.meta.gearLevels?.length) {
    filter.levelMin = ctx.meta.gearLevels[0];
    filter.levelMax = ctx.meta.gearLevels[ctx.meta.gearLevels.length - 1];
  }

  const gear = ctx.items.filter((i) => i.type === 'GEAR');

  function draw(): void {
    const filtered = filterGear(gear, filter);
    const visible = paginate(filtered, page, 60);

    root.innerHTML = `
      <div class="page-gear">
        <header class="page-hero rpg-panel">
          <div class="rpg-panel-inner page-hero-inner">
            <div class="page-hero-copy">
              <p class="text-kicker">${t('gear.kicker')}</p>
              <h1 class="page-title">${t('gear.title')}</h1>
              <p class="page-lead">${t('gear.lead')}</p>
            </div>
          </div>
        </header>

        <div class="gear-db-layout">
          <aside class="gear-db-filters rpg-panel">
            <div class="rpg-panel-inner">
              <p class="text-kicker">${t('gear.filters')}</p>
              <h2 class="rpg-panel-title">${t('gear.refineSearch')}</h2>
              <div class="gear-db-filter-fields">
                <label class="field">
                  <span class="field-label">${t('gear.rarity')}</span>
                  <select data-field="grade">
                    <option value="ALL">${t('gear.all')}</option>
                    ${ctx.meta.grades.map((g) => `<option value="${g}" ${filter.grade === g ? 'selected' : ''}>${g[0] + g.slice(1).toLowerCase()}</option>`).join('')}
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">${t('gear.type')}</span>
                  <select data-field="category">
                    <option value="all">${t('gear.all')}</option>
                    <option value="weapon" ${filter.category === 'weapon' ? 'selected' : ''}>${t('gear.weapon')}</option>
                    <option value="off_hand" ${filter.category === 'off_hand' ? 'selected' : ''}>${t('gear.offHand')}</option>
                    <option value="armor" ${filter.category === 'armor' ? 'selected' : ''}>${t('gear.armor')}</option>
                    <option value="accessory" ${filter.category === 'accessory' ? 'selected' : ''}>${t('gear.accessory')}</option>
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
            </div>
          </aside>

          <div class="gear-db-results rpg-panel">
            <div class="rpg-panel-inner">
              <p class="gear-db-count text-muted">${t('gear.results', { total: filtered.length.toLocaleString(), visible: visible.length.toLocaleString() })}</p>
              <div class="gear-grid">
                ${visible
                  .map((item) => {
                    const affix = gearAffixLabel(item);
                    return `
                  <article class="gear-card ${gradeClass(item.grade)}">
                    ${itemIconHtml(item.icon, item.name)}
                    <div class="gear-card-body">
                      <h4 class="${gradeClass(item.grade)}">${item.name}${item.variant ? ` (${item.variant})` : ''}</h4>
                      <p class="meta">${item.grade} · Lv${item.level ?? '?'} · ${item.gearType ?? 'Gear'}</p>
                      ${affix ? `<p class="meta">${affix}</p>` : ''}
                      ${item.slots ? `<p class="meta">Sockets D${item.slots.decoration} E${item.slots.engraving} I${item.slots.inscription}</p>` : ''}
                    </div>
                  </article>`;
                  })
                  .join('')}
              </div>
              ${
                visible.length < filtered.length
                  ? `<button type="button" class="rpg-btn rpg-btn--gold gear-db-load-more" data-action="load-more">${t('gear.loadMore', { left: (filtered.length - visible.length).toLocaleString() })}</button>`
                  : ''
              }
            </div>
          </div>
        </div>
      </div>`;

    root.querySelector('[data-field="category"]')?.addEventListener('change', (e) => {
      filter.category = (e.target as HTMLSelectElement).value as GearFilterState['category'];
      page = 1;
      draw();
    });

    for (const el of root.querySelectorAll('[data-field]')) {
      if (el.getAttribute('data-field') === 'category') continue;
      el.addEventListener('input', () => {
        const field = el.getAttribute('data-field')!;
        if (field === 'grade') {
          filter.grade = (el as HTMLSelectElement).value;
        } else if (field === 'search') {
          filter.search = (el as HTMLInputElement).value;
        } else if (field === 'levelMin') {
          filter.levelMin = Number((el as HTMLInputElement).value);
        } else if (field === 'levelMax') {
          filter.levelMax = Number((el as HTMLInputElement).value);
        }
        page = 1;
        draw();
      });
    }

    root.querySelector('[data-action="load-more"]')?.addEventListener('click', () => {
      page += 1;
      draw();
    });
  }

  draw();
}
