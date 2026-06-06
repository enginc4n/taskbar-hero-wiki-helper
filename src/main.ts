import { loadAllData } from './data/api';
import { renderGearPage } from './ui/gear-page';
import { renderSimulatorPage } from './ui/simulator-page';

type Tab = 'gear' | 'simulator';

async function main(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <header class="app-header">
      <h1>TBH Wiki Helper</h1>
      <nav class="tabs">
        <button data-tab="gear" class="active">Gear Database</button>
        <button data-tab="simulator">Build Simulator</button>
      </nav>
    </header>
    <main id="content"><div class="loading">Loading game data…</div></main>
  `;

  const content = app.querySelector('#content') as HTMLElement;
  let activeTab: Tab = 'gear';
  let data: Awaited<ReturnType<typeof loadAllData>> | null = null;

  function renderActiveTab(): void {
    if (!data) return;
    if (activeTab === 'gear') {
      renderGearPage(content, { items: data.items, meta: data.meta });
    } else {
      renderSimulatorPage(content, {
        items: data.items,
        heroes: data.heroes,
        effects: data.effects,
        runes: data.runes,
        meta: data.meta,
        wiki: data.wiki,
      });
    }
  }

  app.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab') as Tab;
      app.querySelectorAll('[data-tab]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderActiveTab();
    });
  });

  try {
    data = await loadAllData();
    renderActiveTab();
  } catch (err) {
    content.innerHTML = `<div class="error">Failed to load data: ${err instanceof Error ? err.message : String(err)}</div>`;
  }
}

main();
