import { gameUiUrl } from '@/presentation/game-ui';
import { itemIconUrl } from '@/presentation/icons';
import { loadPreparedBuildIndex, type PreparedBuildManifestEntry } from '@/data/prepared-builds';
import { classGlyph } from '@/presentation/rpg-ui';
import { heroClassLabel, heroNameLabel } from '@/i18n/hero-class';
import { t } from '@/i18n';
import { navHref } from '@/app/router';
import type { EnrichedHero } from '@/core/types';
import type { AppContext } from '@/app/context';

const HERO_MENU_MIN_WIDTH = 220;

export function renderPreparedBuildGuidesPage(root: HTMLElement, ctx: AppContext): void {
  let searchQuery = '';
  let heroFilterKey: number | null = null;
  let preparedBuilds: PreparedBuildManifestEntry[] = [];

  function manifestHeroes(): EnrichedHero[] {
    const keys = new Set(preparedBuilds.map((entry) => entry.heroKey));
    return ctx.heroes.filter((h) => keys.has(h.key));
  }

  function filterBuilds(): PreparedBuildManifestEntry[] {
    const q = searchQuery.trim().toLowerCase();
    return preparedBuilds.filter((b) => {
      if (q && !b.name.toLowerCase().includes(q)) return false;
      if (heroFilterKey != null && b.heroKey !== heroFilterKey) return false;
      return true;
    });
  }

  function heroPortraitUrl(hero: EnrichedHero | undefined): string | null {
    if (!hero) return null;
    return itemIconUrl(hero.icon ?? hero.art);
  }

  function drawHeroPortraitMini(hero: EnrichedHero | undefined, fallbackLetter: string): string {
    const portrait = heroPortraitUrl(hero);
    return `
      <span class="build-hero-portrait" aria-hidden="true">
        ${
          portrait
            ? `<img class="build-hero-portrait-img pixel-art" src="${portrait}" alt="" loading="lazy" />`
            : `<span class="build-hero-portrait-fallback">${fallbackLetter}</span>`
        }
        <img class="build-hero-portrait-frame pixel-art" src="${gameUiUrl('HeroSlot_OuterBoader_Arranged.png')}" alt="" />
      </span>`;
  }

  function drawHeroFilter(): string {
    const heroes = manifestHeroes();
    const activeHero =
      heroFilterKey != null ? ctx.heroes.find((h) => h.key === heroFilterKey) : undefined;
    const triggerName = activeHero ? heroNameLabel(activeHero.name) : t('build.filterAllHeroes');
    const triggerPortrait = activeHero
      ? drawHeroPortraitMini(activeHero, heroNameLabel(activeHero.name)[0] ?? '?')
      : `
      <span class="build-hero-portrait" aria-hidden="true">
        <span class="build-hero-portrait-fallback">★</span>
        <img class="build-hero-portrait-frame pixel-art" src="${gameUiUrl('HeroSlot_OuterBoader_Arranged.png')}" alt="" />
      </span>`;

    const allOption = `
      <li role="presentation">
        <button
          type="button"
          role="option"
          class="build-hero-option${heroFilterKey === null ? ' is-selected' : ''}"
          data-action="guides-hero-filter"
          data-hero-key=""
          aria-selected="${heroFilterKey === null}"
        >
          <span class="build-hero-portrait" aria-hidden="true">
            <span class="build-hero-portrait-fallback">★</span>
            <img class="build-hero-portrait-frame pixel-art" src="${gameUiUrl('HeroSlot_OuterBoader_Arranged.png')}" alt="" />
          </span>
          <span class="build-hero-option-copy">
            <span class="build-hero-option-name">${t('build.filterAllHeroes')}</span>
          </span>
        </button>
      </li>`;

    const menuOptions = heroes
      .map((h) => {
        const name = heroNameLabel(h.name);
        const cls = heroClassLabel(h.class);
        const selected = h.key === heroFilterKey;
        const showClass = cls && cls !== name;

        return `
          <li role="presentation">
            <button
              type="button"
              role="option"
              class="build-hero-option${selected ? ' is-selected' : ''}"
              data-action="guides-hero-filter"
              data-hero-key="${h.key}"
              aria-selected="${selected}"
            >
              ${drawHeroPortraitMini(h, name[0] ?? '?')}
              <span class="build-hero-option-copy">
                <span class="build-hero-option-name">${name}</span>
                ${showClass ? `<span class="build-hero-option-meta">${cls}</span>` : ''}
              </span>
            </button>
          </li>`;
      })
      .join('');

    return `
      <div class="build-hero-picker prepared-guides-hero-filter" data-hero-picker>
        <button
          type="button"
          class="build-hero-trigger"
          data-action="hero-toggle"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-label="${t('build.filterByHero')}"
        >
          ${triggerPortrait}
          <span class="build-hero-trigger-name">${triggerName}</span>
          <span class="build-hero-trigger-caret" aria-hidden="true">▾</span>
        </button>
        <ul class="build-hero-menu" role="listbox" aria-label="${t('build.filterByHero')}" hidden>
          ${allOption}
          ${menuOptions}
        </ul>
      </div>`;
  }

  function draw(): void {
    const filteredBuilds = filterBuilds();
    const emptyMessage = !preparedBuilds.length
      ? t('guides.noPreparedBuilds')
      : heroFilterKey != null
        ? t('build.noPreparedBuildsForHero')
        : t('guides.noMatch');

    root.innerHTML = `
      <div class="page-guides">
        <header class="page-hero rpg-panel">
          <div class="rpg-panel-inner page-hero-inner page-hero-inner--stacked">
            <div class="page-hero-copy">
              <p class="text-kicker">${t('guides.kicker')}</p>
              <h1 class="page-title">${t('guides.preparedBuildGuides')}</h1>
              <p class="page-lead">${t('guides.preparedBuildGuidesLead')}</p>
            </div>
          </div>
        </header>

        <div class="guides-toolbar rpg-panel">
          <div class="rpg-panel-inner guides-toolbar-inner">
            <label class="guides-search field">
              <span class="field-label">${t('guides.searchByName')}</span>
              <div class="guides-filter-control guides-search-control">
                <input
                  type="search"
                  class="guides-search-input"
                  placeholder="${escapeAttr(t('guides.preparedBuildNameSearchPlaceholder'))}"
                  value="${escapeAttr(searchQuery)}"
                  data-field="search"
                />
              </div>
            </label>
            <div class="guides-hero-filter field">
              <span class="field-label">${t('build.filterByHero')}</span>
              ${drawHeroFilter()}
            </div>
          </div>
        </div>

        <section class="guides-section" aria-labelledby="guides-builds-heading">
          <div class="guide-card-grid">
            ${
              filteredBuilds.length
                ? filteredBuilds.map((b) => preparedGuideCard(b)).join('')
                : `<p class="text-muted">${emptyMessage}</p>`
            }
          </div>
        </section>
      </div>`;

    bindEvents();
  }

  function preparedGuideCard(entry: PreparedBuildManifestEntry): string {
    return `
      <a class="guide-card rpg-panel guide-card--link" href="${navHref('build', 'prepared', { build: entry.id })}">
        <div class="rpg-panel-inner guide-card-inner">
          <span class="guide-card-icon" aria-hidden="true">${classGlyph(entry.heroClass ?? '')}</span>
          <h3 class="guide-card-title">${entry.name}</h3>
          <p class="guide-card-desc">${
            entry.description ?? t('guides.progressionPath', { hero: heroClassLabel(entry.heroClass) || t('build.heroFallback') })
          }</p>
          <span class="guide-card-tag text-ui">${heroClassLabel(entry.heroClass) || t('guides.buildTag')}</span>
        </div>
      </a>`;
  }

  function bindHeroPicker(picker: HTMLElement): void {
    const triggerBtn = picker.querySelector<HTMLButtonElement>('[data-action="hero-toggle"]');
    const menuList = picker.querySelector<HTMLUListElement>('.build-hero-menu');
    if (!triggerBtn || !menuList) return;

    let dismissListener: ((event: MouseEvent) => void) | null = null;
    let escapeListener: ((event: KeyboardEvent) => void) | null = null;

    const positionMenu = (): void => {
      const rect = triggerBtn.getBoundingClientRect();
      const width = Math.max(rect.width, HERO_MENU_MIN_WIDTH);
      menuList.style.position = 'fixed';
      menuList.style.top = `${rect.bottom + 6}px`;
      menuList.style.left = `${rect.left}px`;
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
      if (dismissListener) {
        document.removeEventListener('mousedown', dismissListener);
        dismissListener = null;
      }
      if (escapeListener) {
        document.removeEventListener('keydown', escapeListener);
        escapeListener = null;
      }
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
      escapeListener = (event: KeyboardEvent) => {
        if (event.key === 'Escape') closeMenu();
      };
      document.addEventListener('mousedown', dismissListener);
      document.addEventListener('keydown', escapeListener);
    };

    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!menuList.hidden) {
        closeMenu();
        return;
      }
      openMenu();
    });

    picker.querySelectorAll<HTMLButtonElement>('[data-action="guides-hero-filter"]').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rawKey = el.getAttribute('data-hero-key');
        heroFilterKey = rawKey === '' || rawKey == null ? null : Number(rawKey);
        if (rawKey != null && rawKey !== '' && Number.isNaN(heroFilterKey)) return;
        closeMenu();
        draw();
      });
    });
  }

  function bindEvents(): void {
    root.querySelector('[data-field="search"]')?.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value;
      draw();
    });

    root.querySelectorAll<HTMLElement>('[data-hero-picker]').forEach((picker) => {
      bindHeroPicker(picker);
    });
  }

  loadPreparedBuildIndex()
    .then((builds) => {
      preparedBuilds = builds;
      draw();
    })
    .catch(() => {
      preparedBuilds = [];
      draw();
    });

  draw();
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
