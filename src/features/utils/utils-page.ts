import { t, type TranslationKey } from '@/i18n';
import { navHref } from '@/app/router';
import type { AppContext } from '@/app/context';
import { renderGearPage } from '@/features/gear/gear-page';
import { renderBuildHelperPage } from '@/features/build/build-helper-page';

const UTIL_TILES: {
  id: string;
  href: string;
  icon: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}[] = [
  {
    id: 'gear',
    href: navHref('utils', 'gear'),
    icon: '🗡',
    titleKey: 'utils.gearDb.title',
    descKey: 'utils.gearDb.desc',
  },
  {
    id: 'build-author',
    href: navHref('utils', 'build-author'),
    icon: '✎',
    titleKey: 'utils.buildAuthor.title',
    descKey: 'utils.buildAuthor.desc',
  },
];

export function renderUtilsHub(root: HTMLElement, _ctx: AppContext): void {
  root.innerHTML = `
    <div class="page-utils">
      <header class="page-hero rpg-panel">
        <div class="rpg-panel-inner page-hero-inner">
          <div class="page-hero-copy">
            <p class="text-kicker">${t('utils.kicker')}</p>
            <h1 class="page-title">${t('utils.title')}</h1>
            <p class="page-lead">${t('utils.lead')}</p>
          </div>
        </div>
      </header>

      <div class="util-tile-grid">
        ${UTIL_TILES.map(
          (tile) => `
          <a class="util-tile rpg-panel" href="${tile.href}">
            <div class="rpg-panel-inner util-tile-inner">
              <span class="util-tile-icon" aria-hidden="true">${tile.icon}</span>
              <h2 class="util-tile-title">${t(tile.titleKey)}</h2>
              <p class="util-tile-desc">${t(tile.descKey)}</p>
            </div>
          </a>`,
        ).join('')}
      </div>
    </div>`;
}

export function renderUtilsPage(
  root: HTMLElement,
  ctx: AppContext,
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
