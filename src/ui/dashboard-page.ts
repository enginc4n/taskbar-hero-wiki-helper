import { localeFlagHtml } from '../i18n/flags';
import { heroClassLabel, heroNameLabel } from '../i18n/hero-class';
import { getLocale, LOCALE_OPTIONS, setLocale, t, type Locale } from '../i18n';
import { navHref } from '../router';
import { loadPreparedBuildIndex, type PreparedBuildManifestEntry } from '../data/prepared-builds';
import { classGlyph } from '../data/rpg-ui';
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
        ${localeFlagHtml(current.value)}
        <span class="page-hero-locale-caret" aria-hidden="true">▾</span>
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

export function renderDashboardPage(root: HTMLElement, ctx: SimulatorContext): void {
  const locale = getLocale();

  root.innerHTML = `
    <div class="page-dashboard">
      <header class="page-hero rpg-panel">
        <div class="rpg-panel-inner page-hero-inner">
          <div class="page-hero-copy">
            <p class="text-kicker">${t('dashboard.kicker')}</p>
            <h1 class="page-title">${t('dashboard.title')}</h1>
            <p class="page-lead">${t('dashboard.lead')}</p>
          </div>
          <div class="page-hero-actions">
            ${localePickerHtml(locale)}
            <a class="rpg-btn rpg-btn--gold" href="${navHref('build', 'forge')}">
              <span class="rpg-btn-shine" aria-hidden="true"></span>
              ⚔ ${t('dashboard.openForge')}
            </a>
            <a class="rpg-btn rpg-btn--ghost" href="${navHref('guides')}">📖 ${t('dashboard.browseGuides')}</a>
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
          ${ctx.heroes
            .map((h) => {
              const name = heroNameLabel(h.name);
              const cls = heroClassLabel(h.class);
              return `
            <div class="dash-hero-card rpg-panel">
              <div class="rpg-panel-inner dash-hero-card-inner">
                <span class="dash-hero-glyph" aria-hidden="true">${classGlyph(h.class ?? '')}</span>
                <h3 class="dash-hero-name">${name}</h3>
                ${cls && cls !== name ? `<p class="dash-hero-class">${cls}</p>` : ''}
              </div>
            </div>`;
            })
            .join('')}
        </div>
      </section>

      <section class="dash-section" aria-labelledby="dash-builds-heading">
        <div class="dash-section-head">
          <h2 id="dash-builds-heading" class="dash-section-title">${t('dashboard.preparedBuildsSection')}</h2>
          <a class="rpg-btn rpg-btn--ghost rpg-btn--sm" href="${navHref('build', 'prepared')}">${t('dashboard.viewAll')}</a>
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

function bindLocalePicker(root: HTMLElement): void {
  const picker = root.querySelector<HTMLElement>('[data-locale-picker]');
  if (!picker) return;

  const triggerBtn = picker.querySelector<HTMLButtonElement>('[data-action="locale-toggle"]');
  const menuList = picker.querySelector<HTMLUListElement>('.page-hero-locale-menu');
  if (!triggerBtn || !menuList) return;

  const closeMenu = (): void => {
    menuList.hidden = true;
    triggerBtn.setAttribute('aria-expanded', 'false');
  };

  const openMenu = (): void => {
    menuList.hidden = false;
    triggerBtn.setAttribute('aria-expanded', 'true');
  };

  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!menuList.hidden) {
      closeMenu();
      return;
    }
    openMenu();
    requestAnimationFrame(() => {
      document.addEventListener('click', closeMenu, { once: true });
    });
  });

  picker.querySelectorAll('[data-action="locale-pick"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const value = el.getAttribute('data-locale');
      if (value === 'en' || value === 'tr') setLocale(value);
      closeMenu();
    });
  });
}

function buildCardHtml(entry: PreparedBuildManifestEntry): string {
  const glyph = classGlyph(entry.heroClass ?? '');
  return `
    <a class="prepared-build-card dash-build-card" href="${navHref('build', 'prepared')}">
      <span class="prepared-build-glyph" aria-hidden="true">${glyph}</span>
      <span class="prepared-build-name">${entry.name}</span>
      <span class="prepared-build-class">${heroClassLabel(entry.heroClass)}</span>
      ${entry.description ? `<span class="prepared-build-desc">${entry.description}</span>` : ''}
    </a>`;
}
