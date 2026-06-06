import type { EnrichedItem, MetaData } from '../types';
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
      <div class="panel">
        <h2>Gear Database</h2>
        <p class="small">Loads from taskbarherowiki.com/data/items.json — client-side filter and pagination (same approach as taskbarhero.wiki/gear).</p>
        <div class="filters">
          <label>Rarity
            <select data-field="grade">
              <option value="ALL">All</option>
              ${ctx.meta.grades.map((g) => `<option value="${g}" ${filter.grade === g ? 'selected' : ''}>${g[0] + g.slice(1).toLowerCase()}</option>`).join('')}
            </select>
          </label>
          <label>Type
            <select data-field="category">
              <option value="all">All</option>
              <option value="weapon">Weapon</option>
              <option value="off_hand">Off-hand</option>
              <option value="armor">Armor</option>
              <option value="accessory">Accessory</option>
            </select>
          </label>
          <label>Level min
            <input type="number" data-field="levelMin" value="${filter.levelMin}" min="1" max="100" />
          </label>
          <label>Level max
            <input type="number" data-field="levelMax" value="${filter.levelMax}" min="1" max="100" />
          </label>
          <label>Search
            <input type="search" data-field="search" value="${filter.search}" placeholder="Item name" />
          </label>
          <label style="flex-direction:row;align-items:center;gap:0.5rem;margin-top:1.4rem;">
            <input type="checkbox" data-field="obtainableOnly" ${filter.obtainableOnly ? 'checked' : ''} />
            Obtainable only
          </label>
        </div>
        <p class="small">${filtered.length.toLocaleString()} results · showing ${visible.length.toLocaleString()}</p>
        <div class="gear-grid">
          ${visible
            .map((item) => {
              const affix = gearAffixLabel(item);
              const unob = item.obtainable === false ? ' unobtainable' : '';
              return `
                <article class="gear-card${unob}">
                  <h3 class="${gradeClass(item.grade)}">${item.name}${item.variant ? ` (${item.variant})` : ''}</h3>
                  <div class="meta">${item.grade} · Lv${item.level ?? '?'} · ${item.gearType ?? 'Gear'}</div>
                  ${affix ? `<div class="meta">${affix}</div>` : ''}
                  ${item.obtainable === false ? '<div class="meta">No longer obtainable</div>' : ''}
                  ${item.slots ? `<div class="meta">Sockets D${item.slots.decoration} E${item.slots.engraving} I${item.slots.inscription}</div>` : ''}
                </article>`;
            })
            .join('')}
        </div>
        ${
          visible.length < filtered.length
            ? `<div style="margin-top:1rem"><button class="primary" data-action="load-more">Load more (${(filtered.length - visible.length).toLocaleString()} left)</button></div>`
            : ''
        }
      </div>
    `;

    root.querySelector('[data-field="category"]')?.addEventListener('change', (e) => {
      filter.category = (e.target as HTMLSelectElement).value as GearFilterState['category'];
      page = 1;
      draw();
    });

    for (const el of root.querySelectorAll('[data-field]')) {
      if (el.getAttribute('data-field') === 'category') continue;
      el.addEventListener('input', () => {
        const field = el.getAttribute('data-field')!;
        if (field === 'obtainableOnly') {
          filter.obtainableOnly = (el as HTMLInputElement).checked;
        } else if (field === 'grade') {
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
