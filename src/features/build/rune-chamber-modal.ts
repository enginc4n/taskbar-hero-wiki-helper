import { heroCombatRuneGroups, runeBenefitDescription, runeBenefitLabel } from '@/presentation/runes';
import { runeIconUrl } from '@/presentation/icons';
import { rarityClass } from '@/presentation/rpg-ui';
import { statIconHtml, type StatIconKey } from '@/presentation/stat-icons';
import { t, type TranslationKey } from '@/i18n';
import type { RuneGraph, RuneNode } from '@/core/types';

const RUNE_STAT_LABEL_KEYS: Partial<Record<string, TranslationKey>> = {
  AllHeroAttackDamage: 'stat.attackDamage',
  AllHeroAttackDamagePercent: 'stat.attackDamage',
  AllHeroArmor: 'stat.armor',
  AllHeroArmorPercent: 'stat.armor',
  AllHeroAttackSpeed: 'stat.attackSpeed',
  AllHeroMoveSpeed: 'stat.movementSpeed',
};

const RUNE_STAT_ENGINE_KEYS: Partial<Record<string, StatIconKey>> = {
  AllHeroAttackDamage: 'AttackDamage',
  AllHeroAttackDamagePercent: 'AttackDamage',
  AllHeroArmor: 'Armor',
  AllHeroArmorPercent: 'Armor',
  AllHeroAttackSpeed: 'AttackSpeed',
  AllHeroMoveSpeed: 'MovementSpeed',
};

export interface RuneChamberModalOptions {
  modalRoot: HTMLElement;
  runes: RuneGraph;
  getLevel: (key: number) => number;
  setLevel: (key: number, level: number, maxLevel: number) => void;
  readOnly?: boolean;
  /** Shown below the header (e.g. prepared preview session note). */
  hint?: string;
  onChanged?: () => void;
}

function localizedBenefit(rune: RuneNode, level: number): string {
  const description = runeBenefitDescription(rune, level);
  if (!rune.stat) return description;
  const labelKey = RUNE_STAT_LABEL_KEYS[rune.stat];
  if (!labelKey) return description;
  return description.replace(runeBenefitLabel(rune), t(labelKey));
}

function sectionLabel(stat: string): string {
  const labelKey = RUNE_STAT_LABEL_KEYS[stat];
  const base = labelKey ? t(labelKey) : stat;
  return stat.endsWith('Percent') ? `${base} %` : base;
}

function sectionIcon(stat: string): string {
  const engineKey = RUNE_STAT_ENGINE_KEYS[stat];
  return engineKey ? statIconHtml(engineKey, 'rune-section-icon') : '';
}

function renderRuneCard(rune: RuneNode, level: number, readOnly: boolean): string {
  const max = rune.maxLevel ?? 1;
  const icon = runeIconUrl(rune.icon);
  const rarity = rarityClass(level, max);
  const benefit = localizedBenefit(rune, level);

  const controls = readOnly
    ? `<span class="rune-card-level ${rarity}">${level}/${max}</span>`
    : `
      <button type="button" class="node-btn rune-card-btn" data-action="rune-dec" data-key="${rune.key}" aria-label="${t('build.decrease', { name: rune.name })}">−</button>
      <span class="rune-card-level ${rarity}">${level}/${max}</span>
      <button type="button" class="node-btn rune-card-btn" data-action="rune-inc" data-key="${rune.key}" data-max="${max}" aria-label="${t('build.increase', { name: rune.name })}">+</button>`;

  return `
    <article class="rune-card ${rarity}" aria-label="${rune.name}, ${benefit}, level ${level} of ${max}">
      <div class="rune-card-top">
        <div class="rune-card-gem" title="${rune.name}">
          ${icon ? `<img class="rune-card-gem-icon pixel-art" src="${icon}" alt="" loading="lazy" />` : '<span class="rune-card-gem-fallback" aria-hidden="true">◆</span>'}
        </div>
        <div class="rune-card-meta">
          <h4 class="rune-card-name">${rune.name}</h4>
          <p class="rune-card-benefit${level > 0 ? ' is-active' : ''}">${benefit}</p>
        </div>
      </div>
      <div class="rune-card-controls">${controls}</div>
    </article>`;
}

function renderModalBody(runes: RuneGraph, getLevel: (key: number) => number, readOnly: boolean): string {
  const groups = heroCombatRuneGroups(runes.runes);

  return groups
    .map(
      (group) => `
      <section class="rune-chamber-section" aria-labelledby="rune-section-${group.stat}">
        <header class="rune-chamber-section-head" id="rune-section-${group.stat}">
          ${sectionIcon(group.stat)}
          <h4 class="rune-chamber-section-title">${sectionLabel(group.stat)}</h4>
          <span class="rune-chamber-section-count">${group.runes.length}</span>
        </header>
        <div class="rune-chamber-grid">
          ${group.runes.map((rune) => renderRuneCard(rune, getLevel(rune.key), readOnly)).join('')}
        </div>
      </section>`,
    )
    .join('');
}

export function openRuneChamberModal(options: RuneChamberModalOptions): void {
  const { modalRoot, runes, getLevel, setLevel, readOnly = false, hint, onChanged } = options;

  function close(): void {
    modalRoot.innerHTML = '';
  }

  function render(): void {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-action="close-rune-modal" role="presentation">
        <div class="modal rune-chamber-modal" role="dialog" aria-modal="true" aria-labelledby="rune-chamber-title">
          <div class="modal-frame">
            <div class="modal-header">
              <div>
                <p class="text-kicker">${t('build.arcaneRelics')}</p>
                <h3 id="rune-chamber-title">${t('build.runeChamber')}</h3>
                ${hint ? `<p class="rune-chamber-hint">${hint}</p>` : ''}
              </div>
              <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--icon" data-action="close-rune-modal" aria-label="${t('build.closeRuneChamber')}">✕</button>
            </div>
            <div class="rune-chamber-modal-body">${renderModalBody(runes, getLevel, readOnly)}</div>
          </div>
        </div>
      </div>`;

    modalRoot.querySelector('.modal')?.addEventListener('click', (ev) => ev.stopPropagation());

    modalRoot.querySelectorAll('[data-action="close-rune-modal"]').forEach((el) => {
      el.addEventListener('click', close);
    });

    if (!readOnly) {
      modalRoot.querySelectorAll('[data-action="rune-inc"]').forEach((el) => {
        el.addEventListener('click', () => {
          const key = Number(el.getAttribute('data-key'));
          const max = Number(el.getAttribute('data-max'));
          setLevel(key, getLevel(key) + 1, max);
          onChanged?.();
          render();
        });
      });

      modalRoot.querySelectorAll('[data-action="rune-dec"]').forEach((el) => {
        el.addEventListener('click', () => {
          const key = Number(el.getAttribute('data-key'));
          setLevel(key, getLevel(key) - 1, 999);
          onChanged?.();
          render();
        });
      });
    }
  }

  render();
}
