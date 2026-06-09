import { gameUiUrl } from '../data/game-ui';
import { itemIconUrl } from '../data/icons';
import { localeFlagHtml } from '../i18n/flags';
import { heroClassLabel, heroNameLabel } from '../i18n/hero-class';
import { getLocale, LOCALE_OPTIONS, setLocale, t, type Locale } from '../i18n';
import { navHref } from '../router';
import { loadPreparedBuildIndex, type PreparedBuildManifestEntry } from '../data/prepared-builds';
import { classGlyph } from '../data/rpg-ui';
import type { EnrichedHero } from '../types';
import type { SimulatorContext } from './simulator-page';

function localePickerHtml(locale: Locale): string {
  const current = LOCALE_OPTIONS.find((opt) => opt.value === locale) ?? LOCALE_OPTIONS[0];

  return `
    <div class="page-hero-locale-picker" data-locale-picker>
      <button
        type="button"
        class="rpg-btn rpg-btn--ghost page-hero-locale-trigger"
        data-action="locale-toggle"
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-label="${t('dashboard.language')}"
        title="${t('dashboard.settings')}"
      >
        <span class="page-hero-locale-icon" aria-hidden="true">⚙</span>
        <span class="page-hero-locale-label">${current.label}</span>
        <span class="page-hero-locale-suffix">
          ${localeFlagHtml(current.value)}
          <span class="page-hero-locale-caret" aria-hidden="true">▾</span>
        </span>
      </button>
      <ul class="page-hero-locale-menu" role="listbox" aria-label="${t('dashboard.language')}" hidden>
        ${LOCALE_OPTIONS.map(
          (opt) => `
          <li role="presentation">
            <button
              type="button"
              role="option"
              class="page-hero-locale-option${opt.value === locale ? ' is-selected' : ''}"
              data-action="locale-pick"
              data-locale="${opt.value}"
              aria-selected="${opt.value === locale}"
            >
              <span class="page-hero-locale-option-label">${opt.label}</span>
              ${localeFlagHtml(opt.value)}
            </button>
          </li>`,
        ).join('')}
      </ul>
    </div>`;
}

function heroCardHtml(hero: EnrichedHero): string {
  const name = heroNameLabel(hero.name);
  const portrait = itemIconUrl(hero.icon ?? hero.art);

  return `
    <a class="dash-hero-card rpg-panel" href="${navHref('build', 'forge', { hero: String(hero.key) })}" title="${name}">
      <div class="rpg-panel-inner dash-hero-card-inner">
        <div class="dash-hero-portrait" aria-hidden="true">
          ${
            portrait
              ? `<img class="dash-hero-portrait-img pixel-art" src="${portrait}" alt="" loading="lazy" />`
              : `<span class="dash-hero-glyph">${classGlyph(hero.class ?? '')}</span>`
          }
          <img class="dash-hero-portrait-frame pixel-art" src="${gameUiUrl('HeroSlot_OuterBoader_Arranged.png')}" alt="" />
        </div>
        <h3 class="dash-hero-name">${name}</h3>
      </div>
    </a>`;
}

export function renderDashboardPage(root: HTMLElement, ctx: SimulatorContext): void {
  const locale = getLocale();

  root.innerHTML = `
    <div class="page-dashboard">
      <header class="dash-hall rpg-panel" aria-labelledby="dash-hall-title">
        <div class="rpg-panel-inner dash-hall-inner">
          <span class="dash-hall-crest" aria-hidden="true">⚜</span>
          <div class="dash-hall-top">
            <p class="text-kicker dash-hall-kicker">${t('dashboard.kicker')}</p>
            ${localePickerHtml(locale)}
          </div>
          <div class="dash-hall-main">
            <div class="dash-hall-copy">
              <h1 id="dash-hall-title" class="dash-hall-title">${t('dashboard.title')}</h1>
              <p class="dash-hall-lead">${t('dashboard.lead')}</p>
            </div>
            <div class="dash-hall-actions">
              <a class="rpg-btn rpg-btn--gold dash-hall-cta" href="${navHref('build', 'forge')}">
                <span class="rpg-btn-shine" aria-hidden="true"></span>
                ⚔ ${t('dashboard.openForge')}
              </a>
              <a class="rpg-btn rpg-btn--ghost dash-hall-cta" href="${navHref('guides')}">📖 ${t('dashboard.browseGuides')}</a>
            </div>
          </div>
        </div>
      </header>

      <section class="dash-section" aria-labelledby="dash-quick-heading">
        <h2 id="dash-quick-heading" class="dash-section-title">${t('dashboard.quickActions')}</h2>
        <div class="dash-action-grid">
          <a class="dash-action-card rpg-panel" href="${navHref('build', 'forge')}">
            <span class="dash-action-icon" aria-hidden="true">🛠</span>
            <span class="dash-action-label">${t('dashboard.buildForge')}</span>
            <span class="dash-action-desc">${t('dashboard.buildForgeDesc')}</span>
          </a>
          <a class="dash-action-card rpg-panel" href="${navHref('build', 'prepared')}">
            <span class="dash-action-icon" aria-hidden="true">📜</span>
            <span class="dash-action-label">${t('dashboard.preparedBuilds')}</span>
            <span class="dash-action-desc">${t('dashboard.preparedBuildsDesc')}</span>
          </a>
          <a class="dash-action-card rpg-panel" href="${navHref('utils', 'gear')}">
            <span class="dash-action-icon" aria-hidden="true">🗡</span>
            <span class="dash-action-label">${t('dashboard.gearDb')}</span>
            <span class="dash-action-desc">${t('dashboard.gearDbDesc')}</span>
          </a>
          <a class="dash-action-card rpg-panel" href="${navHref('utils', 'build-author')}">
            <span class="dash-action-icon" aria-hidden="true">✎</span>
            <span class="dash-action-label">${t('dashboard.buildAuthor')}</span>
            <span class="dash-action-desc">${t('dashboard.buildAuthorDesc')}</span>
          </a>
        </div>
      </section>

      <section class="dash-section" aria-labelledby="dash-heroes-heading">
        <h2 id="dash-heroes-heading" class="dash-section-title">${t('dashboard.heroes')}</h2>
        <div class="dash-hero-grid">
          ${ctx.heroes.map((h) => heroCardHtml(h)).join('')}
        </div>
      </section>

      <section class="dash-section" aria-labelledby="dash-builds-heading">
        <div class="dash-section-head">
          <h2 id="dash-builds-heading" class="dash-section-title">${t('dashboard.preparedBuildsSection')}</h2>
          <a class="rpg-btn rpg-btn--gold dash-hall-cta" href="${navHref('build', 'prepared')}">${t('dashboard.viewAll')}</a>
        </div>
        <div class="dash-builds-rail" id="dash-builds-rail">
          <p class="dash-loading text-muted">${t('dashboard.loadingBuilds')}</p>
        </div>
      </section>

    </div>`;

  bindLocalePicker(root);

  const rail = root.querySelector('#dash-builds-rail');
  if (!rail) return;

  loadPreparedBuildIndex()
    .then((builds) => {
      rail.innerHTML = builds.length
        ? builds.map((entry) => buildCardHtml(entry)).join('')
        : `<p class="dash-empty text-muted">${t('dashboard.noBuilds')}</p>`;
    })
    .catch(() => {
      rail.innerHTML = `<p class="dash-empty text-muted">${t('dashboard.buildsLoadError')}</p>`;
    });
}

const LOCALE_MENU_MIN_WIDTH = 220;

function bindLocalePicker(root: HTMLElement): void {
  const picker = root.querySelector<HTMLElement>('[data-locale-picker]');
  if (!picker) return;

  const triggerBtn = picker.querySelector<HTMLButtonElement>('[data-action="locale-toggle"]');
  const menuList = picker.querySelector<HTMLUListElement>('.page-hero-locale-menu');
  if (!triggerBtn || !menuList) return;

  let dismissListener: ((event: MouseEvent) => void) | null = null;

  const positionMenu = (): void => {
    const rect = triggerBtn.getBoundingClientRect();
    const width = Math.max(rect.width, LOCALE_MENU_MIN_WIDTH);
    menuList.style.position = 'fixed';
    menuList.style.top = `${rect.bottom + 6}px`;
    menuList.style.left = `${rect.right - width}px`;
    menuList.style.right = 'auto';
    menuList.style.width = `${width}px`;
    menuList.style.zIndex = '10000';
  };

  const resetMenuPosition = (): void => {
    menuList.classList.remove('is-visible');
    menuList.style.position = '';
    menuList.style.top = '';
    menuList.style.left = '';
    menuList.style.right = '';
    menuList.style.width = '';
    menuList.style.zIndex = '';
  };

  const detachDismissListener = (): void => {
    if (!dismissListener) return;
    document.removeEventListener('mousedown', dismissListener);
    dismissListener = null;
  };

  const closeMenu = (): void => {
    menuList.classList.remove('is-visible');
    menuList.hidden = true;
    triggerBtn.setAttribute('aria-expanded', 'false');
    picker.classList.remove('is-open');
    resetMenuPosition();
    detachDismissListener();
    if (menuList.parentElement === document.body) {
      picker.appendChild(menuList);
    }
  };

  const openMenu = (): void => {
    if (menuList.parentElement !== document.body) {
      document.body.appendChild(menuList);
    }
    menuList.hidden = false;
    triggerBtn.setAttribute('aria-expanded', 'true');
    picker.classList.add('is-open');
    positionMenu();
    requestAnimationFrame(() => {
      positionMenu();
      menuList.classList.add('is-visible');
    });
    dismissListener = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && (picker.contains(target) || menuList.contains(target))) return;
      closeMenu();
    };
    document.addEventListener('mousedown', dismissListener);
  };

  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!menuList.hidden) {
      closeMenu();
      return;
    }
    openMenu();
  });

  picker.querySelectorAll<HTMLButtonElement>('[data-action="locale-pick"]').forEach((el) => {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const value = el.getAttribute('data-locale');
      if (value === 'en' || value === 'tr') setLocale(value);
      closeMenu();
    });
  });

  const repositionIfOpen = (): void => {
    if (!menuList.hidden) positionMenu();
  };

  window.addEventListener('resize', repositionIfOpen);
  window.addEventListener('scroll', repositionIfOpen, true);
}

function buildCardHtml(entry: PreparedBuildManifestEntry): string {
  const glyph = classGlyph(entry.heroClass ?? '');
  return `
    <a class="prepared-build-card dash-build-card" href="${navHref('build', 'prepared', { build: entry.id })}">
      <span class="prepared-build-glyph" aria-hidden="true">${glyph}</span>
      <span class="prepared-build-name">${entry.name}</span>
      <span class="prepared-build-class">${heroClassLabel(entry.heroClass)}</span>
      ${entry.description ? `<span class="prepared-build-desc">${entry.description}</span>` : ''}
    </a>`;
}
