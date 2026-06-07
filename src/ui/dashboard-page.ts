import { navHref } from '../router';
import { loadPreparedBuildIndex, type PreparedBuildManifestEntry } from '../data/prepared-builds';
import { classGlyph } from '../data/rpg-ui';
import type { SimulatorContext } from './simulator-page';

export function renderDashboardPage(root: HTMLElement, ctx: SimulatorContext): void {
  root.innerHTML = `
    <div class="page-dashboard">
      <header class="page-hero rpg-panel">
        <div class="rpg-panel-inner page-hero-inner">
          <div class="page-hero-copy">
            <p class="text-kicker">Guild Hall</p>
            <h1 class="page-title">Welcome, Adventurer</h1>
            <p class="page-lead">Plan gear, passives, and runes before you commit gold in Taskbar Hero.</p>
          </div>
          <div class="page-hero-actions">
            <a class="rpg-btn rpg-btn--gold" href="${navHref('build', 'forge')}">
              <span class="rpg-btn-shine" aria-hidden="true"></span>
              ⚔ Open Build Forge
            </a>
            <a class="rpg-btn rpg-btn--ghost" href="${navHref('guides')}">📖 Browse Guides</a>
          </div>
        </div>
      </header>

      <section class="dash-section" aria-labelledby="dash-quick-heading">
        <h2 id="dash-quick-heading" class="dash-section-title">Quick Actions</h2>
        <div class="dash-action-grid">
          <a class="dash-action-card rpg-panel" href="${navHref('build', 'forge')}">
            <span class="dash-action-icon" aria-hidden="true">🛠</span>
            <span class="dash-action-label">Build Forge</span>
            <span class="dash-action-desc">Edit gear, skills, and runes</span>
          </a>
          <a class="dash-action-card rpg-panel" href="${navHref('build', 'prepared')}">
            <span class="dash-action-icon" aria-hidden="true">📜</span>
            <span class="dash-action-label">Prepared Builds</span>
            <span class="dash-action-desc">Preview curated progression paths</span>
          </a>
          <a class="dash-action-card rpg-panel" href="${navHref('utils', 'gear')}">
            <span class="dash-action-icon" aria-hidden="true">🗡</span>
            <span class="dash-action-label">Gear Database</span>
            <span class="dash-action-desc">Search all equipment</span>
          </a>
          <a class="dash-action-card rpg-panel" href="${navHref('utils', 'build-author')}">
            <span class="dash-action-icon" aria-hidden="true">✎</span>
            <span class="dash-action-label">Build Author</span>
            <span class="dash-action-desc">Create prepared build JSON</span>
          </a>
        </div>
      </section>

      <section class="dash-section" aria-labelledby="dash-heroes-heading">
        <h2 id="dash-heroes-heading" class="dash-section-title">Heroes</h2>
        <div class="dash-hero-grid">
          ${ctx.heroes
            .map(
              (h) => `
            <div class="dash-hero-card rpg-panel">
              <div class="rpg-panel-inner dash-hero-card-inner">
                <span class="dash-hero-glyph" aria-hidden="true">${classGlyph(h.class ?? '')}</span>
                <h3 class="dash-hero-name">${h.name}</h3>
                <p class="dash-hero-class">${h.class ?? ''}</p>
              </div>
            </div>`,
            )
            .join('')}
        </div>
      </section>

      <section class="dash-section" aria-labelledby="dash-builds-heading">
        <div class="dash-section-head">
          <h2 id="dash-builds-heading" class="dash-section-title">Prepared Builds</h2>
          <a class="rpg-btn rpg-btn--ghost rpg-btn--sm" href="${navHref('build', 'prepared')}">View all</a>
        </div>
        <div class="dash-builds-rail" id="dash-builds-rail">
          <p class="dash-loading text-muted">Loading guild archives…</p>
        </div>
      </section>
    </div>`;

  const rail = root.querySelector('#dash-builds-rail');
  if (!rail) return;

  loadPreparedBuildIndex()
    .then((builds) => {
      rail.innerHTML = builds.length
        ? builds.map((entry) => buildCardHtml(entry)).join('')
        : '<p class="dash-empty text-muted">No prepared builds in <code>public/prepared-builds/</code>.</p>';
    })
    .catch(() => {
      rail.innerHTML = '<p class="dash-empty text-muted">Could not load prepared builds.</p>';
    });
}

function buildCardHtml(entry: PreparedBuildManifestEntry): string {
  const glyph = classGlyph(entry.heroClass ?? '');
  return `
    <a class="prepared-build-card dash-build-card" href="${navHref('build', 'prepared')}">
      <span class="prepared-build-glyph" aria-hidden="true">${glyph}</span>
      <span class="prepared-build-name">${entry.name}</span>
      <span class="prepared-build-class">${entry.heroClass ?? ''}</span>
      ${entry.description ? `<span class="prepared-build-desc">${entry.description}</span>` : ''}
    </a>`;
}
