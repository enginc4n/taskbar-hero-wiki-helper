import {
  isKillUnlock,
  petSlotDisplay,
  petSlotIconUrl,
  petStatCategory,
  PET_FARM_ROUTES,
  type EnrichedPet,
  type EnrichedPetStat,
  type PetFarmSpot,
  type PetStatCategory,
} from '../data/pets-farming';
import { t } from '../i18n';
import type { TranslationKey } from '../i18n/en';
import { navHref } from '../router';
import type { SimulatorContext } from './simulator-page';

const DIFFICULTY_LABEL_KEYS = {
  torment: 'guides.cubeLevelLogic.difficulty.torment',
  hell: 'guides.cubeLevelLogic.difficulty.hell',
  nightmare: 'guides.cubeLevelLogic.difficulty.nightmare',
} as const satisfies Record<PetFarmSpot['difficulty'], TranslationKey>;

const CHIP_LABEL_KEYS = {
  exp: 'guides.petsFarming.chipExp',
  gold: 'guides.petsFarming.chipGold',
  chest: 'guides.petsFarming.chipChest',
  rare: 'guides.petsFarming.chipRare',
} as const satisfies Record<PetStatCategory, TranslationKey>;

const STEAM_SUPPORTER_URL = 'https://store.steampowered.com/app/2828860/Taskbar_Hero/';

function bonusChipHtml(stat: EnrichedPetStat): string {
  const category = petStatCategory(stat.stat);
  const chipLabel = t(CHIP_LABEL_KEYS[category]);
  return `
    <span class="pet-stat-chip pet-stat-chip--${category}">
      <span class="pet-stat-chip__value">${stat.disp}</span>
      <span class="pet-stat-chip__label">${chipLabel}</span>
    </span>`;
}

function bonusChipsHtml(stats: EnrichedPetStat[]): string {
  return stats.map(bonusChipHtml).join('');
}

function getBestFarmSpot(routes: PetFarmSpot[]): PetFarmSpot | undefined {
  if (!routes.length) return undefined;
  return routes.reduce((best, spot) => (spot.runsPerHour > best.runsPerHour ? spot : best));
}

function getAltFarmSpots(routes: PetFarmSpot[]): PetFarmSpot[] {
  const best = getBestFarmSpot(routes);
  if (!best) return [];
  return routes.filter((spot) => spot !== best);
}

function bestFarmRunsForPet(pet: EnrichedPet): number {
  const routes = PET_FARM_ROUTES[pet.key] ?? [];
  return getBestFarmSpot(routes)?.runsPerHour ?? 0;
}

function sortFarmableByBestRuns(pets: EnrichedPet[]): EnrichedPet[] {
  return [...pets].sort((a, b) => bestFarmRunsForPet(b) - bestFarmRunsForPet(a));
}

function petIconHtml(pet: EnrichedPet): string {
  const slot = petSlotDisplay(pet.key);
  return `
    <div
      class="pets-db-table__icon-wrap"
      style="--pet-slot-scale-x: ${slot.scaleX}; --pet-slot-scale-y: ${slot.scaleY}"
      aria-hidden="true"
    >
      <img
        class="pets-db-table__icon pixel-art"
        src="${petSlotIconUrl(pet.icon)}"
        alt=""
        loading="lazy"
      />
    </div>`;
}

function petIdentityCellHtml(pet: EnrichedPet): string {
  const dlcTag = pet.dlc
    ? `<span class="guide-card-tag text-ui pets-db-table__dlc-tag">${t('guides.petsFarming.dlcTag')}</span>`
    : '';
  return `
    <div class="pets-db-table__pet">
      ${petIconHtml(pet)}
      <span class="pets-db-table__pet-name">${pet.name}</span>
      ${dlcTag}
    </div>`;
}

function zoneTagHtml(spot: PetFarmSpot): string {
  return `<span class="pet-zone-tag">A${spot.act}-${spot.stage} · ${spot.stageName}</span>`;
}

function farmSpotInlineHtml(spot: PetFarmSpot): string {
  const diff = t(DIFFICULTY_LABEL_KEYS[spot.difficulty]);
  return `<span class="pets-db-alt-route"><span class="cube-zone cube-zone--${spot.difficulty}">${diff}</span> A${spot.act}-${spot.stage} ~${spot.runsPerHour}</span>`;
}

function bestFarmCellHtml(spot: PetFarmSpot): string {
  const diff = t(DIFFICULTY_LABEL_KEYS[spot.difficulty]);
  return `
    <div class="pets-db-best-farm">
      ${zoneTagHtml(spot)}
      <span class="cube-zone cube-zone--${spot.difficulty}">${diff}</span>
      <span class="pets-db-best-farm__runs">~${spot.runsPerHour} ${t('guides.petsFarming.colRuns')}</span>
    </div>`;
}

function altFarmCompactHtml(spots: PetFarmSpot[]): string {
  if (!spots.length) return '—';
  return spots.map(farmSpotInlineHtml).join('<span class="pets-db-alt-sep"> · </span>');
}

function killUnlockText(pet: EnrichedPet): string {
  if (!isKillUnlock(pet.unlock)) return '';
  return t('guides.petsFarming.killUnlock', {
    count: pet.unlock.count.toLocaleString(),
    monster: pet.unlock.monsterName,
  });
}

function dlcUnlockHtml(): string {
  return `
    <div class="pets-db-unlock">
      <span class="pets-db-unlock__text">${t('guides.petsFarming.dlcUnlock')}</span>
      <a class="pet-steam-link" href="${STEAM_SUPPORTER_URL}" target="_blank" rel="noopener noreferrer">
        ↗ ${t('guides.petsFarming.steamPack')}
      </a>
    </div>`;
}

function renderFarmableRow(pet: EnrichedPet, rank: number): string {
  const routes = PET_FARM_ROUTES[pet.key] ?? [];
  const best = getBestFarmSpot(routes);
  const alts = getAltFarmSpots(routes);

  return `
    <div class="pets-db-table__row" role="row">
      <div class="pets-db-table__cell pets-db-table__cell--rank" role="cell" data-label="${t('guides.petsFarming.colRank')}">${rank}</div>
      <div class="pets-db-table__cell pets-db-table__cell--pet" role="cell" data-label="${t('guides.petsFarming.colPet')}">
        ${petIdentityCellHtml(pet)}
      </div>
      <div class="pets-db-table__cell pets-db-table__cell--bonus" role="cell" data-label="${t('guides.petsFarming.bonus')}">
        ${bonusChipsHtml(pet.stats)}
      </div>
      <div class="pets-db-table__cell pets-db-table__cell--farm" role="cell" data-label="${t('guides.petsFarming.colBestFarm')}">
        ${best ? bestFarmCellHtml(best) : '—'}
      </div>
      <div class="pets-db-table__cell pets-db-table__cell--alt" role="cell" data-label="${t('guides.petsFarming.colAltRoutes')}">
        ${altFarmCompactHtml(alts)}
      </div>
      <div class="pets-db-table__cell pets-db-table__cell--unlock" role="cell" data-label="${t('guides.petsFarming.unlock')}">
        <span class="pets-db-unlock__text">${killUnlockText(pet)}</span>
      </div>
    </div>`;
}

function renderDlcRow(pet: EnrichedPet): string {
  return `
    <div class="pets-db-table__row" role="row">
      <div class="pets-db-table__cell pets-db-table__cell--pet" role="cell" data-label="${t('guides.petsFarming.colPet')}">
        ${petIdentityCellHtml(pet)}
      </div>
      <div class="pets-db-table__cell pets-db-table__cell--bonus" role="cell" data-label="${t('guides.petsFarming.bonus')}">
        ${bonusChipsHtml(pet.stats)}
      </div>
      <div class="pets-db-table__cell pets-db-table__cell--unlock" role="cell" data-label="${t('guides.petsFarming.unlock')}">
        ${dlcUnlockHtml()}
      </div>
    </div>`;
}

function renderFarmableTable(pets: EnrichedPet[]): string {
  const sorted = sortFarmableByBestRuns(pets);
  return `
    <div class="pets-db-table rpg-panel" role="table" aria-label="${t('guides.petsFarming.sectionFarmable')}">
      <div class="pets-db-table__head" role="row">
        <div class="pets-db-table__cell pets-db-table__cell--rank" role="columnheader">${t('guides.petsFarming.colRank')}</div>
        <div class="pets-db-table__cell pets-db-table__cell--pet" role="columnheader">${t('guides.petsFarming.colPet')}</div>
        <div class="pets-db-table__cell pets-db-table__cell--bonus" role="columnheader">${t('guides.petsFarming.bonus')}</div>
        <div class="pets-db-table__cell pets-db-table__cell--farm" role="columnheader">${t('guides.petsFarming.colBestFarm')}</div>
        <div class="pets-db-table__cell pets-db-table__cell--alt" role="columnheader">${t('guides.petsFarming.colAltRoutes')}</div>
        <div class="pets-db-table__cell pets-db-table__cell--unlock" role="columnheader">${t('guides.petsFarming.unlock')}</div>
      </div>
      ${sorted.map((pet, i) => renderFarmableRow(pet, i + 1)).join('')}
    </div>`;
}

function renderDlcTable(pets: EnrichedPet[]): string {
  return `
    <div class="pets-db-table pets-db-table--dlc rpg-panel" role="table" aria-label="${t('guides.petsFarming.sectionDlc')}">
      <div class="pets-db-table__head" role="row">
        <div class="pets-db-table__cell pets-db-table__cell--pet" role="columnheader">${t('guides.petsFarming.colPet')}</div>
        <div class="pets-db-table__cell pets-db-table__cell--bonus" role="columnheader">${t('guides.petsFarming.bonus')}</div>
        <div class="pets-db-table__cell pets-db-table__cell--unlock" role="columnheader">${t('guides.petsFarming.unlock')}</div>
      </div>
      ${pets.map(renderDlcRow).join('')}
    </div>`;
}

function renderSection(
  pets: EnrichedPet[],
  headingId: string,
  titleKey: TranslationKey,
  tableHtml: string,
): string {
  if (!pets.length) return '';
  return `
      <section class="guides-section pets-farming-section" aria-labelledby="${headingId}">
        <h2 id="${headingId}" class="dash-section-title">${t(titleKey)}</h2>
        ${tableHtml}
      </section>`;
}

export function renderPetsFarmingGuidePage(root: HTMLElement, ctx: SimulatorContext): void {
  const pets = ctx.pets ?? [];
  const farmable = pets.filter((p) => !p.dlc);
  const dlc = pets.filter((p) => p.dlc);

  root.innerHTML = `
    <div class="page-guides page-pets-farming">
      <header class="pets-farming-header">
        <a class="guide-back-link" href="${navHref('guides')}">← ${t('guides.petsFarming.back')}</a>
        <h1 class="pets-farming-title">${t('guides.petsFarming.title')}</h1>
        <p class="pets-farming-lead">${t('guides.petsFarming.lead')}</p>
      </header>

      ${renderSection(farmable, 'pets-farmable-heading', 'guides.petsFarming.sectionFarmable', renderFarmableTable(farmable))}
      ${renderSection(dlc, 'pets-dlc-heading', 'guides.petsFarming.sectionDlc', renderDlcTable(dlc))}
    </div>`;
}
