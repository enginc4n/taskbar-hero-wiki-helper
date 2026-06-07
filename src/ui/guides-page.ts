import { loadPreparedBuildIndex, type PreparedBuildManifestEntry } from '../data/prepared-builds';
import { classGlyph } from '../data/rpg-ui';
import { heroClassLabel } from '../i18n/hero-class';
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
  let preparedBuilds: PreparedBuildManifestEntry[] = [];

  function draw(): void {
    const filteredPlaceholders = PLACEHOLDER_GUIDES.filter((g) => {
      const matchesCat = activeCategory === 'all' || g.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const title = t(g.titleKey);
      const desc = t(g.descKey);
      const matchesSearch = !q || title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });

    const filteredBuilds = preparedBuilds.filter((b) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.heroClass ?? '').toLowerCase().includes(q) ||
        heroClassLabel(b.heroClass).toLowerCase().includes(q) ||
        (b.description ?? '').toLowerCase().includes(q)
      );
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
            ${filteredPlaceholders
              .map(
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
              )
              .join('')}
          </div>
        </section>

        <section class="guides-section" aria-labelledby="guides-builds-heading">
          <h2 id="guides-builds-heading" class="dash-section-title">${t('guides.preparedBuildGuides')}</h2>
          <div class="guide-card-grid">
            ${
              filteredBuilds.length
                ? filteredBuilds.map((b) => preparedGuideCard(b)).join('')
                : `<p class="text-muted">${t('guides.noMatch')}</p>`
            }
          </div>
        </section>
      </div>`;

    bindEvents();
  }

  function preparedGuideCard(entry: PreparedBuildManifestEntry): string {
    return `
      <a class="guide-card rpg-panel guide-card--link" href="${navHref('build', 'prepared')}">
        <div class="rpg-panel-inner guide-card-inner">
          <span class="guide-card-icon" aria-hidden="true">${classGlyph(entry.heroClass ?? '')}</span>
          <h3 class="guide-card-title">${entry.name}</h3>
          <p class="guide-card-desc">${
            entry.description ?? t('guides.progressionPath', { hero: heroClassLabel(entry.heroClass) || t('build.heroFallback') })
          }</p>
          <span class="guide-card-tag text-ui">${heroClassLabel(entry.heroClass) || t('guides.buildTag')}</span>
        </div>
      </a>`;
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

  loadPreparedBuildIndex()
    .then((builds) => {
      preparedBuilds = builds;
      draw();
    })
    .catch(() => {
      preparedBuilds = [];
      draw();
    });

  draw();
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
