import { loadPreparedBuildIndex, type PreparedBuildManifestEntry } from '../data/prepared-builds';
import { classGlyph } from '../data/rpg-ui';
import { navHref } from '../router';
import type { SimulatorContext } from './simulator-page';

interface GuideCategory {
  id: string;
  label: string;
  icon: string;
}

const CATEGORIES: GuideCategory[] = [
  { id: 'all', label: 'All', icon: '◆' },
  { id: 'class', label: 'Class', icon: '⚔' },
  { id: 'general', label: 'General', icon: '📖' },
];

const PLACEHOLDER_GUIDES = [
  { id: 'beginner', title: 'Beginner Guide', icon: '📖', category: 'general', desc: 'Core systems and first milestones' },
  { id: 'knight', title: 'Knight Guide', icon: '⚔', category: 'class', desc: 'Melee fundamentals and tank paths' },
  { id: 'tank', title: 'Tank Guide', icon: '🛡', category: 'class', desc: 'Vitality, armor, and survivability' },
  { id: 'dps', title: 'DPS Guide', icon: '🔥', category: 'class', desc: 'Damage scaling and crit builds' },
  { id: 'farming', title: 'Farming Guide', icon: '💰', category: 'general', desc: 'Efficient resource routes' },
];

export function renderGuidesPage(root: HTMLElement, _ctx: SimulatorContext): void {
  let activeCategory = 'all';
  let searchQuery = '';
  let preparedBuilds: PreparedBuildManifestEntry[] = [];

  function draw(): void {
    const filteredPlaceholders = PLACEHOLDER_GUIDES.filter((g) => {
      const matchesCat = activeCategory === 'all' || g.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q || g.title.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });

    const filteredBuilds = preparedBuilds.filter((b) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.heroClass ?? '').toLowerCase().includes(q) ||
        (b.description ?? '').toLowerCase().includes(q)
      );
    });

    root.innerHTML = `
      <div class="page-guides">
        <header class="page-hero rpg-panel">
          <div class="rpg-panel-inner page-hero-inner">
            <div class="page-hero-copy">
              <p class="text-kicker">Chronicle</p>
              <h1 class="page-title">Guides</h1>
              <p class="page-lead">Class builds, progression paths, and curated strategies.</p>
            </div>
          </div>
        </header>

        <div class="guides-toolbar rpg-panel">
          <div class="rpg-panel-inner guides-toolbar-inner">
            <label class="guides-search field">
              <span class="field-label">Search</span>
              <input
                type="search"
                class="guides-search-input"
                placeholder="Search guides…"
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
                  <span aria-hidden="true">${cat.icon}</span> ${cat.label}
                </button>`,
              ).join('')}
            </div>
          </div>
        </div>

        <section class="guides-section" aria-labelledby="guides-featured-heading">
          <h2 id="guides-featured-heading" class="dash-section-title">Featured Guides</h2>
          <div class="guide-card-grid">
            ${filteredPlaceholders
              .map(
                (g) => `
              <article class="guide-card rpg-panel">
                <div class="rpg-panel-inner guide-card-inner">
                  <span class="guide-card-icon" aria-hidden="true">${g.icon}</span>
                  <h3 class="guide-card-title">${g.title}</h3>
                  <p class="guide-card-desc">${g.desc}</p>
                  <span class="guide-card-tag text-ui">${g.category}</span>
                  <p class="guide-card-soon text-muted">Coming soon</p>
                </div>
              </article>`,
              )
              .join('')}
          </div>
        </section>

        <section class="guides-section" aria-labelledby="guides-builds-heading">
          <h2 id="guides-builds-heading" class="dash-section-title">Prepared Build Guides</h2>
          <div class="guide-card-grid">
            ${
              filteredBuilds.length
                ? filteredBuilds.map((b) => preparedGuideCard(b)).join('')
                : '<p class="text-muted">No prepared builds match your search.</p>'
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
          <p class="guide-card-desc">${entry.description ?? `${entry.heroClass ?? 'Hero'} progression path`}</p>
          <span class="guide-card-tag text-ui">${entry.heroClass ?? 'Build'}</span>
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
