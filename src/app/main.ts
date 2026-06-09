import { loadAllData } from '@/data/api';
import { initLocale, onLocaleChange } from '@/i18n';
import { parseRoute, type ParsedRoute } from '@/app/router';
import type { AppContext } from '@/app/context';
import { renderDashboardPage } from '@/features/dashboard/dashboard-page';
import { renderCubeLevelLogicGuidePage } from '@/features/guides/cube-level-logic-guide-page';
import { renderPetsFarmingGuidePage } from '@/features/guides/pets-farming-guide-page';
import { renderGuidesPage } from '@/features/guides/guides-page';
import { renderPreparedBuildGuidesPage } from '@/features/guides/prepared-build-guides-page';
import {
  mountAppShell,
  refreshShellTranslations,
  renderShellError,
  renderShellLoading,
  updateShellNav,
} from '@/shared/shell';
import { renderSimulatorPage } from '@/features/build/simulator-page';
import { ensureGearSlotTooltips } from '@/shared/gear-slot-tooltips';
import { renderAboutPage } from '@/features/about/about-page';
import { renderUtilsPage } from '@/features/utils/utils-page';
import '@/styles/style.css';

function publicAssetUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}${relativePath}`.replace(/\/{2,}/g, '/');
}

function applyShellTheme(): void {
  document.documentElement.style.setProperty(
    '--rpg-bg-image',
    `url("${publicAssetUrl('assets/ui/background.png')}")`,
  );
}

applyShellTheme();
initLocale();
ensureGearSlotTooltips();

let appContext: AppContext | null = null;
let pageRoot: HTMLElement | null = null;

function renderRoute(route: ParsedRoute): void {
  if (!pageRoot || !appContext) return;

  updateShellNav(route);
  pageRoot.innerHTML = '';

  switch (route.section) {
    case 'dashboard':
      renderDashboardPage(pageRoot, appContext);
      break;
    case 'build': {
      const heroParam = route.query.get('hero');
      const parsedHeroKey = heroParam ? Number(heroParam) : NaN;
      const initialHeroKey =
        Number.isFinite(parsedHeroKey) &&
        appContext.heroes.some((h) => h.key === parsedHeroKey)
          ? parsedHeroKey
          : undefined;
      const preparedBuildId = route.query.get('build') ?? undefined;
      renderSimulatorPage(pageRoot, appContext, {
        initialMode: route.sub === 'prepared' ? 'prepared' : 'forge',
        runesOpen: route.query.get('runes') === '1',
        initialHeroKey,
        initialPreparedBuildId: preparedBuildId,
      });
      break;
    }
    case 'guides':
      if (route.sub === 'prepared-builds') {
        renderPreparedBuildGuidesPage(pageRoot, appContext);
      } else if (route.sub === 'cube-level-logic') {
        renderCubeLevelLogicGuidePage(pageRoot, appContext);
      } else if (route.sub === 'pets-farming') {
        renderPetsFarmingGuidePage(pageRoot, appContext);
      } else {
        renderGuidesPage(pageRoot, appContext);
      }
      break;
    case 'utils':
      renderUtilsPage(pageRoot, appContext, route.sub);
      break;
    case 'about':
      renderAboutPage(pageRoot);
      break;
    default:
      renderDashboardPage(pageRoot, appContext);
      break;
  }
}

function onNavigate(): void {
  renderRoute(parseRoute());
}

async function boot(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  if (!pageRoot) {
    pageRoot = mountAppShell(app);
    renderShellLoading(pageRoot);
  }

  if (!appContext) {
    try {
      const data = await loadAllData();
      appContext = {
        items: data.items,
        allItems: data.allItems,
        heroes: data.heroes,
        effects: data.effects,
        runes: data.runes,
        meta: data.meta,
        pets: data.pets,
        wiki: data.wiki,
      };
    } catch (err) {
      renderShellError(
        pageRoot,
        err instanceof Error ? err.message : String(err),
      );
      return;
    }
  }

  onNavigate();
}

window.addEventListener('hashchange', () => onNavigate());
onLocaleChange(() => {
  if (!pageRoot || !appContext) return;
  refreshShellTranslations(parseRoute());
  renderRoute(parseRoute());
});
boot();
