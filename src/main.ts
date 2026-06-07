import { loadAllData } from './data/api';
import { renderBuildHelperPage } from './ui/build-helper-page';
import { renderSimulatorPage } from './ui/simulator-page';

function isHelperRoute(): boolean {
  return window.location.hash === '#helper' || window.location.hash === '#/helper';
}

async function boot(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <a class="skip-link" href="#main-content">Skip to character menu</a>
    <div class="rpg-backdrop" aria-hidden="true"></div>
    <main id="main-content">
      <div class="loading-state">
        <div class="loading-state-inner">
          <div class="loading-spinner" aria-hidden="true"></div>
          <p class="loading-label text-title">Summoning guild records…</p>
          <p class="loading-hint">Heroes · Gear · Runes · Chronicle</p>
        </div>
      </div>
    </main>
    <footer class="rpg-footer">
      <p>Not affiliated with Tesseract Studio · Game assets &amp; data from community wikis</p>
    </footer>
  `;

  const content = app.querySelector('#main-content') as HTMLElement;

  try {
    const data = await loadAllData();
    const ctx = {
      items: data.items,
      allItems: data.allItems,
      heroes: data.heroes,
      effects: data.effects,
      runes: data.runes,
      meta: data.meta,
      wiki: data.wiki,
    };

    if (isHelperRoute()) {
      renderBuildHelperPage(content, ctx);
    } else {
      renderSimulatorPage(content, ctx);
    }
  } catch (err) {
    content.innerHTML = `
      <div class="error-state" role="alert">
        <div class="error-state-inner">
          <h2 class="text-title" style="color:var(--ruby)">Could not load game data</h2>
          <p>${err instanceof Error ? err.message : String(err)}</p>
          <p class="small">Check your connection and refresh the page.</p>
        </div>
      </div>`;
  }
}

window.addEventListener('hashchange', () => boot());
boot();
