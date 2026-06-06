import { loadAllData } from './data/api';
import { renderSimulatorPage } from './ui/simulator-page';

async function main(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <a class="skip-link" href="#main-content">Skip to build simulator</a>
    <div class="app-backdrop" aria-hidden="true"></div>
    <header class="app-header">
      <div class="app-header-inner">
        <div class="app-brand">
          <div class="app-crest" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4L28 14H38L30 20L33 30L24 24L15 30L18 20L10 14H20L24 4Z" fill="currentColor" opacity="0.9"/>
              <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>
            </svg>
          </div>
          <div class="app-brand-text">
            <h1>TBH Wiki Helper</h1>
            <p class="app-tagline">Build Forge — plan your hero before you spend gold</p>
          </div>
        </div>
        <p class="app-header-note">Local save · stats computed in your browser</p>
      </div>
    </header>
    <main id="main-content" class="app-main">
      <div class="loading-state panel">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Loading game data…</p>
      </div>
    </main>
    <footer class="app-footer">
      <p>Not affiliated with Tesseract Studio. Game assets & data from community wikis.</p>
    </footer>
  `;

  const content = app.querySelector('#main-content') as HTMLElement;

  try {
    const data = await loadAllData();
    renderSimulatorPage(content, {
      items: data.items,
      allItems: data.allItems,
      heroes: data.heroes,
      effects: data.effects,
      runes: data.runes,
      meta: data.meta,
      wiki: data.wiki,
    });
  } catch (err) {
    content.innerHTML = `
      <div class="error-state panel" role="alert">
        <h2>Could not load game data</h2>
        <p>${err instanceof Error ? err.message : String(err)}</p>
        <p class="small">Check your connection and refresh the page.</p>
      </div>`;
  }
}

main();
