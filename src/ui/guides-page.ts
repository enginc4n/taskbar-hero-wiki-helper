import { t, type TranslationKey } from '../i18n';
import { navHref } from '../router';
import type { SimulatorContext } from './simulator-page';

interface GuideCategory {
  id: string;
  labelKey: TranslationKey;
  icon: string;
}

const CATEGORIES: GuideCategory[] = [
  { id: 'all', labelKey: 'guides.category.all', icon: '◆' },
  { id: 'class', labelKey: 'guides.category.class', icon: '⚔' },
  { id: 'general', labelKey: 'guides.category.general', icon: '📖' },
];

const CATEGORY_LABEL_KEYS: Record<string, TranslationKey> = {
  class: 'guides.category.class',
  general: 'guides.category.general',
};

function guideCategoryLabel(categoryId: string): string {
  const key = CATEGORY_LABEL_KEYS[categoryId];
  return key ? t(key) : categoryId;
}

const LIVE_GUIDES: {
  id: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: string;
  category: string;
  href: string;
}[] = [
  {
    id: 'cube-level-logic',
    titleKey: 'guides.cubeLevelLogic.title',
    descKey: 'guides.cubeLevelLogic.desc',
    icon: '🧊',
    category: 'general',
    href: navHref('guides', 'cube-level-logic'),
  },
];

const PLACEHOLDER_GUIDES: {
  id: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: string;
  category: string;
}[] = [
  { id: 'beginner', titleKey: 'guides.beginner.title', descKey: 'guides.beginner.desc', icon: '📖', category: 'general' },
  { id: 'knight', titleKey: 'guides.knight.title', descKey: 'guides.knight.desc', icon: '⚔', category: 'class' },
  { id: 'tank', titleKey: 'guides.tank.title', descKey: 'guides.tank.desc', icon: '🛡', category: 'class' },
  { id: 'dps', titleKey: 'guides.dps.title', descKey: 'guides.dps.desc', icon: '🔥', category: 'class' },
  { id: 'farming', titleKey: 'guides.farming.title', descKey: 'guides.farming.desc', icon: '💰', category: 'general' },
];

export function renderGuidesPage(root: HTMLElement, _ctx: SimulatorContext): void {
  let activeCategory = 'all';
  let searchQuery = '';

  function draw(): void {
    const filteredLive = LIVE_GUIDES.filter((g) => {
      const matchesCat = activeCategory === 'all' || g.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const title = t(g.titleKey);
      const desc = t(g.descKey);
      const matchesSearch = !q || title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });

    const filteredPlaceholders = PLACEHOLDER_GUIDES.filter((g) => {
      const matchesCat = activeCategory === 'all' || g.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const title = t(g.titleKey);
      const desc = t(g.descKey);
      const matchesSearch = !q || title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });

    root.innerHTML = `
      <div class="page-guides">
        <header class="page-hero rpg-panel">
          <div class="rpg-panel-inner page-hero-inner">
            <div class="page-hero-copy">
              <p class="text-kicker">${t('guides.kicker')}</p>
              <h1 class="page-title">${t('guides.title')}</h1>
              <p class="page-lead">${t('guides.lead')}</p>
            </div>
          </div>
        </header>

        <div class="guides-toolbar rpg-panel">
          <div class="rpg-panel-inner guides-toolbar-inner">
            <label class="guides-search field">
              <span class="field-label">${t('guides.search')}</span>
              <input
                type="search"
                class="guides-search-input"
                placeholder="${escapeAttr(t('guides.searchPlaceholder'))}"
                value="${escapeAttr(searchQuery)}"
                data-field="search"
              />
            </label>
            <div class="guides-categories" role="tablist" aria-label="Guide categories">
              ${CATEGORIES.map(
                (cat) => `
                <button
                  type="button"
                  role="tab"
                  class="guides-category-tab${activeCategory === cat.id ? ' is-active' : ''}"
                  data-action="category"
                  data-id="${cat.id}"
                  aria-selected="${activeCategory === cat.id}"
                >
                  <span aria-hidden="true">${cat.icon}</span> ${t(cat.labelKey)}
                </button>`,
              ).join('')}
            </div>
          </div>
        </div>

        <section class="guides-section" aria-labelledby="guides-featured-heading">
          <h2 id="guides-featured-heading" class="dash-section-title">${t('guides.featured')}</h2>
          <div class="guide-card-grid">
            ${[
              ...filteredLive.map(
                (g) => `
              <a class="guide-card rpg-panel guide-card--link" href="${g.href}">
                <div class="rpg-panel-inner guide-card-inner">
                  <span class="guide-card-icon" aria-hidden="true">${g.icon}</span>
                  <h3 class="guide-card-title">${t(g.titleKey)}</h3>
                  <p class="guide-card-desc">${t(g.descKey)}</p>
                  <span class="guide-card-tag text-ui">${guideCategoryLabel(g.category)}</span>
                </div>
              </a>`,
              ),
              ...filteredPlaceholders.map(
                (g) => `
              <article class="guide-card rpg-panel">
                <div class="rpg-panel-inner guide-card-inner">
                  <span class="guide-card-icon" aria-hidden="true">${g.icon}</span>
                  <h3 class="guide-card-title">${t(g.titleKey)}</h3>
                  <p class="guide-card-desc">${t(g.descKey)}</p>
                  <span class="guide-card-tag text-ui">${guideCategoryLabel(g.category)}</span>
                  <p class="guide-card-soon text-muted">${t('guides.comingSoon')}</p>
                </div>
              </article>`,
              ),
            ].join('')}
          </div>
        </section>
      </div>`;

    bindEvents();
  }

  function bindEvents(): void {
    root.querySelector('[data-field="search"]')?.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value;
      draw();
    });

    root.querySelectorAll('[data-action="category"]').forEach((el) => {
      el.addEventListener('click', () => {
        activeCategory = el.getAttribute('data-id') ?? 'all';
        draw();
      });
    });
  }

  draw();
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
