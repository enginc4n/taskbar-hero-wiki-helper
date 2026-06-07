import type { EnrichedItem, MetaData } from '../types';
import { itemIconHtml } from '../data/icons';
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
              <p class="text-kicker">Armory</p>
              <h1 class="page-title">Gear Database</h1>
              <p class="page-lead">Browse and filter all equipment — same data as taskbarhero.wiki/gear.</p>
            </div>
          </div>
        </header>

        <div class="gear-db-layout">
          <aside class="gear-db-filters rpg-panel">
            <div class="rpg-panel-inner">
              <p class="text-kicker">Filters</p>
              <h2 class="rpg-panel-title">Refine Search</h2>
              <div class="gear-db-filter-fields">
                <label class="field">
                  <span class="field-label">Rarity</span>
                  <select data-field="grade">
                    <option value="ALL">All</option>
                    ${ctx.meta.grades.map((g) => `<option value="${g}" ${filter.grade === g ? 'selected' : ''}>${g[0] + g.slice(1).toLowerCase()}</option>`).join('')}
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">Type</span>
                  <select data-field="category">
                    <option value="all">All</option>
                    <option value="weapon" ${filter.category === 'weapon' ? 'selected' : ''}>Weapon</option>
                    <option value="off_hand" ${filter.category === 'off_hand' ? 'selected' : ''}>Off-hand</option>
                    <option value="armor" ${filter.category === 'armor' ? 'selected' : ''}>Armor</option>
                    <option value="accessory" ${filter.category === 'accessory' ? 'selected' : ''}>Accessory</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">Level min</span>
                  <input type="number" data-field="levelMin" value="${filter.levelMin}" min="1" max="100" />
                </label>
                <label class="field">
                  <span class="field-label">Level max</span>
                  <input type="number" data-field="levelMax" value="${filter.levelMax}" min="1" max="100" />
                </label>
                <label class="field">
                  <span class="field-label">Search</span>
                  <input type="search" data-field="search" value="${filter.search}" placeholder="Item name…" />
                </label>
              </div>
            </div>
          </aside>

          <div class="gear-db-results rpg-panel">
            <div class="rpg-panel-inner">
              <p class="gear-db-count text-muted">${filtered.length.toLocaleString()} results · showing ${visible.length.toLocaleString()}</p>
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
                  ? `<button type="button" class="rpg-btn rpg-btn--gold gear-db-load-more" data-action="load-more">Load more (${(filtered.length - visible.length).toLocaleString()} left)</button>`
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
