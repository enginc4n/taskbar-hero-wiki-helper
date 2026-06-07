import { navHref, parseRoute, type AppSection, type ParsedRoute } from '../router';

export interface NavItem {
  section: AppSection;
  label: string;
  icon: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { section: 'dashboard', label: 'Dashboard', icon: '⚔', href: navHref('dashboard') },
  { section: 'build', label: 'Build', icon: '🛠', href: navHref('build', 'forge') },
  { section: 'guides', label: 'Guides', icon: '📖', href: navHref('guides') },
  { section: 'utils', label: 'Utils', icon: '🧰', href: navHref('utils') },
];

const SECTION_TITLES: Record<AppSection, string> = {
  dashboard: 'Dashboard',
  build: 'Build',
  guides: 'Guides',
  utils: 'Utilities',
};

const SUB_TITLES: Partial<Record<string, string>> = {
  forge: 'Build Forge',
  prepared: 'Prepared Builds',
  gear: 'Gear Database',
  'build-author': 'Build Author',
};

function breadcrumbLabel(route: ParsedRoute): string {
  const base = SECTION_TITLES[route.section];
  if (!route.sub) return base;
  const sub = SUB_TITLES[route.sub];
  if (sub) return `${base} › ${sub}`;
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
    <a class="skip-link" href="#page-content">Skip to main content</a>
    <div class="rpg-shell">
      <aside class="rpg-nav" aria-label="Guild menu">
        <div class="rpg-nav-brand">
          <div class="rpg-nav-crest" aria-hidden="true">⚜</div>
          <div class="rpg-nav-brand-text">
            <p class="rpg-nav-title">Wiki Helper</p>
            <p class="rpg-nav-sub">Taskbar Hero</p>
          </div>
        </div>
        <nav class="rpg-nav-list" aria-label="Main navigation">
          ${NAV_ITEMS.map(
            (item) => `
            <a
              class="rpg-nav-item"
              href="${item.href}"
              data-nav-section="${item.section}"
              aria-label="${item.label}"
            >
              <span class="rpg-nav-icon" aria-hidden="true">${item.icon}</span>
              <span class="rpg-nav-label">${item.label}</span>
            </a>`,
          ).join('')}
        </nav>
        <div class="rpg-nav-foot">
          <p class="rpg-nav-foot-note">Guild Hall v1</p>
        </div>
      </aside>
      <div class="rpg-main">
        <header class="rpg-topbar" aria-label="Page context">
          <p class="rpg-breadcrumb" id="shell-breadcrumb">Dashboard</p>
        </header>
        <main id="page-content" class="rpg-page" tabindex="-1"></main>
        <footer class="rpg-footer">
          <p>Not affiliated with Tesseract Studio · Game assets &amp; data from community wikis</p>
        </footer>
      </div>
    </div>
  `;

  updateShellNav(parseRoute());
  return appRoot.querySelector('#page-content') as HTMLElement;
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
        <p class="loading-label text-title">Summoning guild records…</p>
        <p class="loading-hint">Heroes · Gear · Runes · Chronicle</p>
      </div>
    </div>`;
}

export function renderShellError(pageRoot: HTMLElement, message: string): void {
  pageRoot.innerHTML = `
    <div class="error-state" role="alert">
      <div class="error-state-inner">
        <h2 class="text-title" style="color:var(--ruby)">Could not load game data</h2>
        <p>${message}</p>
        <p class="small">Check your connection and refresh the page.</p>
      </div>
    </div>`;
}
