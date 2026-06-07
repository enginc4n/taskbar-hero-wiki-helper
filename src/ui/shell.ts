import { t, type TranslationKey } from '../i18n';
import { navHref, parseRoute, type AppSection, type ParsedRoute } from '../router';

export interface NavItem {
  section: AppSection;
  labelKey: TranslationKey;
  icon: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { section: 'dashboard', labelKey: 'nav.dashboard', icon: '⚔', href: navHref('dashboard') },
  { section: 'build', labelKey: 'nav.build', icon: '🛠', href: navHref('build', 'forge') },
  { section: 'guides', labelKey: 'nav.guides', icon: '📖', href: navHref('guides') },
  { section: 'utils', labelKey: 'nav.utils', icon: '🧰', href: navHref('utils') },
];

const SECTION_TITLE_KEYS: Record<AppSection, TranslationKey> = {
  dashboard: 'nav.dashboard',
  build: 'nav.build',
  guides: 'nav.guides',
  utils: 'nav.utilities',
};

const SUB_TITLE_KEYS: Partial<Record<string, TranslationKey>> = {
  forge: 'nav.sub.forge',
  prepared: 'nav.sub.prepared',
  gear: 'nav.sub.gear',
  'build-author': 'nav.sub.buildAuthor',
};

function breadcrumbLabel(route: ParsedRoute): string {
  const base = t(SECTION_TITLE_KEYS[route.section]);
  if (!route.sub) return base;
  const subKey = SUB_TITLE_KEYS[route.sub];
  if (subKey) return `${base} › ${t(subKey)}`;
  if (route.section === 'guides') return `${base} › ${route.sub}`;
  return base;
}

function navItemActive(route: ParsedRoute, item: NavItem): boolean {
  if (route.section !== item.section) return false;
  if (item.section === 'build') {
    return route.section === 'build';
  }
  if (item.section === 'utils' && route.sub) {
    return route.section === 'utils';
  }
  return route.section === item.section && !route.sub;
}

export function mountAppShell(appRoot: HTMLElement): HTMLElement {
  appRoot.innerHTML = `
    <a class="skip-link" href="#page-content" id="shell-skip-link">${t('shell.skipLink')}</a>
    <div class="rpg-shell">
      <aside class="rpg-nav" aria-label="Guild menu">
        <div class="rpg-nav-brand">
          <div class="rpg-nav-crest" aria-hidden="true">⚜</div>
          <div class="rpg-nav-brand-text">
            <p class="rpg-nav-title" id="shell-brand-title">${t('shell.wikiHelper')}</p>
            <p class="rpg-nav-sub" id="shell-brand-sub">${t('shell.taskbarHero')}</p>
          </div>
        </div>
        <nav class="rpg-nav-list" aria-label="Main navigation">
          ${NAV_ITEMS.map(
            (item) => `
            <a
              class="rpg-nav-item"
              href="${item.href}"
              data-nav-section="${item.section}"
              aria-label="${t(item.labelKey)}"
            >
              <span class="rpg-nav-icon" aria-hidden="true">${item.icon}</span>
              <span class="rpg-nav-label" data-i18n="${item.labelKey}">${t(item.labelKey)}</span>
            </a>`,
          ).join('')}
        </nav>
        <div class="rpg-nav-foot">
          <p class="rpg-nav-foot-note" id="shell-version">${t('shell.version')}</p>
        </div>
      </aside>
      <div class="rpg-main">
        <header class="rpg-topbar" aria-label="Page context">
          <p class="rpg-breadcrumb" id="shell-breadcrumb">${t('nav.dashboard')}</p>
        </header>
        <main id="page-content" class="rpg-page" tabindex="-1"></main>
        <footer class="rpg-footer">
          <p id="shell-footer">${t('shell.footer')}</p>
        </footer>
      </div>
    </div>
  `;

  updateShellNav(parseRoute());
  return appRoot.querySelector('#page-content') as HTMLElement;
}

export function refreshShellTranslations(route: ParsedRoute): void {
  const skip = document.getElementById('shell-skip-link');
  if (skip) skip.textContent = t('shell.skipLink');

  const brandTitle = document.getElementById('shell-brand-title');
  if (brandTitle) brandTitle.textContent = t('shell.wikiHelper');

  const brandSub = document.getElementById('shell-brand-sub');
  if (brandSub) brandSub.textContent = t('shell.taskbarHero');

  const version = document.getElementById('shell-version');
  if (version) version.textContent = t('shell.version');

  const footer = document.getElementById('shell-footer');
  if (footer) footer.textContent = t('shell.footer');

  for (const item of NAV_ITEMS) {
    const el = document.querySelector<HTMLElement>(`.rpg-nav-item[data-nav-section="${item.section}"]`);
    if (!el) continue;
    el.setAttribute('aria-label', t(item.labelKey));
    const label = el.querySelector('.rpg-nav-label');
    if (label) label.textContent = t(item.labelKey);
  }

  updateShellNav(route);
}

export function updateShellNav(route: ParsedRoute): void {
  const breadcrumb = document.getElementById('shell-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = breadcrumbLabel(route);

  document.querySelectorAll<HTMLElement>('.rpg-nav-item').forEach((el) => {
    const section = el.getAttribute('data-nav-section') as AppSection;
    const item = NAV_ITEMS.find((n) => n.section === section);
    if (!item) return;
    const active = navItemActive(route, item);
    el.classList.toggle('is-active', active);
    el.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

export function renderShellLoading(pageRoot: HTMLElement): void {
  pageRoot.innerHTML = `
    <div class="loading-state">
      <div class="loading-state-inner">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p class="loading-label text-title">${t('shell.loading')}</p>
        <p class="loading-hint">${t('shell.loadingHint')}</p>
      </div>
    </div>`;
}

export function renderShellError(pageRoot: HTMLElement, message: string): void {
  pageRoot.innerHTML = `
    <div class="error-state" role="alert">
      <div class="error-state-inner">
        <h2 class="text-title" style="color:var(--ruby)">${t('shell.errorTitle')}</h2>
        <p>${message}</p>
        <p class="small">${t('shell.errorHint')}</p>
      </div>
    </div>`;
}
