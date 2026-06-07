import { navHref } from '../router';
import type { SimulatorContext } from './simulator-page';
import { renderGearPage } from './gear-page';
import { renderBuildHelperPage } from './build-helper-page';

const UTIL_TILES = [
  {
    id: 'gear',
    href: navHref('utils', 'gear'),
    icon: '🗡',
    title: 'Gear Database',
    desc: 'Browse and filter all equipment from the wiki data.',
  },
  {
    id: 'build-author',
    href: navHref('utils', 'build-author'),
    icon: '✎',
    title: 'Build Author',
    desc: 'Design milestone builds and export JSON for prepared-builds.',
  },
  {
    id: 'rune-ref',
    href: navHref('build', 'forge', { runes: '1' }),
    icon: '🎲',
    title: 'Rune Chamber',
    desc: 'Open the rune panel inside Build Forge.',
  },
  {
    id: 'forge',
    href: navHref('build', 'forge'),
    icon: '⚔',
    title: 'Build Forge',
    desc: 'Load a save and experiment with full build planning.',
  },
] as const;

export function renderUtilsHub(root: HTMLElement, _ctx: SimulatorContext): void {
  root.innerHTML = `
    <div class="page-utils">
      <header class="page-hero rpg-panel">
        <div class="rpg-panel-inner page-hero-inner">
          <div class="page-hero-copy">
            <p class="text-kicker">Workshop</p>
            <h1 class="page-title">Utilities</h1>
            <p class="page-lead">Tools for browsing data, authoring builds, and planning loadouts.</p>
          </div>
        </div>
      </header>

      <div class="util-tile-grid">
        ${UTIL_TILES.map(
          (tile) => `
          <a class="util-tile rpg-panel" href="${tile.href}">
            <div class="rpg-panel-inner util-tile-inner">
              <span class="util-tile-icon" aria-hidden="true">${tile.icon}</span>
              <h2 class="util-tile-title">${tile.title}</h2>
              <p class="util-tile-desc">${tile.desc}</p>
            </div>
          </a>`,
        ).join('')}
      </div>
    </div>`;
}

export function renderUtilsPage(
  root: HTMLElement,
  ctx: SimulatorContext,
  sub?: string,
): void {
  switch (sub) {
    case 'gear':
      renderGearPage(root, { items: ctx.items, meta: ctx.meta });
      break;
    case 'build-author':
      renderBuildHelperPage(root, ctx);
      break;
    default:
      renderUtilsHub(root, ctx);
  }
}
