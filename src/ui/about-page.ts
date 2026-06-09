import { t } from '../i18n';

export function renderAboutPage(root: HTMLElement): void {
  root.innerHTML = `
    <div class="page-about">
      <header class="page-hero rpg-panel">
        <div class="rpg-panel-inner page-hero-inner">
          <div class="page-hero-copy">
            <p class="text-kicker">${t('utils.about.kicker')}</p>
            <h1 class="page-title">${t('utils.about.title')}</h1>
            <p class="page-lead">${t('utils.about.lead')}</p>
          </div>
        </div>
      </header>

      <section class="about-section" aria-labelledby="about-heading">
        <h2 id="about-heading" class="visually-hidden">${t('utils.about.title')}</h2>
        <div class="about-content rpg-panel">
          <div class="rpg-panel-inner">
            <p class="about-credit">
              <span class="about-credit-label">${t('utils.about.madeBy')}</span>
              <span class="about-credit-name">Engin Can</span>
            </p>
            <p>${t('utils.about.p1')}</p>
            <p>${t('utils.about.p2')}</p>
            <p>${t('utils.about.p3')}</p>
            <div class="about-discord">
              <p class="about-discord-text">${t('utils.about.discordLead')}</p>
              <p class="about-discord-handle" aria-label="Discord: ${t('utils.about.discordHandle')}">
                <span class="about-discord-icon" aria-hidden="true">💬</span>
                <span>${t('utils.about.discordHandle')}</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>`;
}
