import { gameUiUrl } from '@/presentation/game-ui';
import { itemIconUrl } from '@/presentation/icons';
import { heroClassLabel, heroNameLabel } from '@/i18n/hero-class';
import { t } from '@/i18n';
import { getSelectedHero } from '@/core/simulator/build-state';
import type { EnrichedHero, PlayerSaveData } from '@/core/types';

const HERO_MENU_MIN_WIDTH = 220;

export interface HeroPickerOptions {
  heroes: EnrichedHero[];
  selectedKey: number;
  menuLabel?: string;
  triggerLabel?: string;
  working?: PlayerSaveData;
  pickAction?: string;
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

export function drawHeroPicker(options: HeroPickerOptions): string {
  const {
    heroes,
    selectedKey,
    menuLabel = t('build.selectHero'),
    triggerLabel = menuLabel,
    working,
    pickAction = 'hero-pick',
  } = options;

  const selectedHero = heroes.find((h) => h.key === selectedKey);
  const heroName = selectedHero ? heroNameLabel(selectedHero.name) : t('build.heroFallback');

  const menuOptions = heroes
    .map((h) => {
      const name = heroNameLabel(h.name);
      const cls = heroClassLabel(h.class);
      const saveHero = working ? getSelectedHero(working, h.key) : null;
      const locked = saveHero ? !saveHero.IsUnLock : false;
      const selected = h.key === selectedKey;
      const showClass = cls && cls !== name;

      return `
        <li role="presentation">
          <button
            type="button"
            role="option"
            class="build-hero-option${selected ? ' is-selected' : ''}${locked ? ' is-locked' : ''}"
            data-action="${pickAction}"
            data-hero-key="${h.key}"
            aria-selected="${selected}"
            ${locked ? 'disabled aria-disabled="true"' : ''}
          >
            ${drawHeroPortraitMini(h, name[0] ?? '?')}
            <span class="build-hero-option-copy">
              <span class="build-hero-option-name">${name}</span>
              ${showClass ? `<span class="build-hero-option-meta">${cls}</span>` : ''}
            </span>
            ${locked ? '<span class="build-hero-option-lock" aria-hidden="true">🔒</span>' : ''}
          </button>
        </li>`;
    })
    .join('');

  return `
    <div class="build-hero-picker" data-hero-picker>
      <button
        type="button"
        class="build-hero-trigger"
        data-action="hero-toggle"
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-label="${triggerLabel}"
      >
        ${drawHeroPortraitMini(selectedHero, heroName[0] ?? '?')}
        <span class="build-hero-trigger-name">${heroName}</span>
        <span class="build-hero-trigger-caret" aria-hidden="true">▾</span>
      </button>
      <ul class="build-hero-menu" role="listbox" aria-label="${menuLabel}" hidden>
        ${menuOptions}
      </ul>
    </div>`;
}

export function bindHeroPicker(
  root: HTMLElement,
  onPick: (heroKey: number) => void,
  pickAction = 'hero-pick',
): void {
  root.querySelectorAll<HTMLElement>('[data-hero-picker]').forEach((picker) => {
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

    picker.querySelectorAll<HTMLButtonElement>(`[data-action="${pickAction}"]`).forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (el.disabled) return;
        const key = Number(el.getAttribute('data-hero-key'));
        if (Number.isNaN(key)) return;
        onPick(key);
        closeMenu();
      });
    });
  });
}
