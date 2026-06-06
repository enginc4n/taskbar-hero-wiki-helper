import { loadAllData } from './data/api';
import { renderSimulatorPage } from './ui/simulator-page';

async function main(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <header class="app-header">
      <h1>TBH Wiki Helper</h1>
    </header>
    <main id="content"><div class="loading">Loading game data…</div></main>
  `;

  const content = app.querySelector('#content') as HTMLElement;

  try {
    const data = await loadAllData();
    renderSimulatorPage(content, {
      items: data.items,
      heroes: data.heroes,
      effects: data.effects,
      runes: data.runes,
      meta: data.meta,
      wiki: data.wiki,
    });
  } catch (err) {
    content.innerHTML = `<div class="error">Failed to load data: ${err instanceof Error ? err.message : String(err)}</div>`;
  }
}

main();
