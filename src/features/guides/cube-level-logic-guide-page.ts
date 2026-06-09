import { bundledGameUiUrl } from '@/presentation/game-ui';
import { t } from '@/i18n';
import { navHref } from '@/app/router';
import type { AppContext } from '@/app/context';

type Difficulty = 'normal' | 'nightmare' | 'hell' | 'torment';

interface ZoneRef {
  difficulty: Difficulty;
  map: string;
}

interface CubeLevelRow {
  rangeFrom: number;
  rangeTo: number;
  cubeLevel: number;
  chestLevel: number;
  farmFrom: ZoneRef;
  farmTo?: ZoneRef;
}

const CUBE_ROWS: CubeLevelRow[] = [
  {
    rangeFrom: 1,
    rangeTo: 10,
    cubeLevel: 1,
    chestLevel: 10,
    farmFrom: { difficulty: 'normal', map: '1-8' },
    farmTo: { difficulty: 'normal', map: '2-2' },
  },
  {
    rangeFrom: 10,
    rangeTo: 20,
    cubeLevel: 2,
    chestLevel: 20,
    farmFrom: { difficulty: 'normal', map: '2-8' },
    farmTo: { difficulty: 'normal', map: '3-7' },
  },
  {
    rangeFrom: 20,
    rangeTo: 30,
    cubeLevel: 3,
    chestLevel: 30,
    farmFrom: { difficulty: 'normal', map: '3-8' },
    farmTo: { difficulty: 'nightmare', map: '1-8' },
  },
  {
    rangeFrom: 30,
    rangeTo: 40,
    cubeLevel: 4,
    chestLevel: 40,
    farmFrom: { difficulty: 'nightmare', map: '1-9' },
    farmTo: { difficulty: 'nightmare', map: '3-4' },
  },
  {
    rangeFrom: 40,
    rangeTo: 50,
    cubeLevel: 5,
    chestLevel: 50,
    farmFrom: { difficulty: 'nightmare', map: '3-5' },
    farmTo: { difficulty: 'hell', map: '2-4' },
  },
  {
    rangeFrom: 50,
    rangeTo: 60,
    cubeLevel: 6,
    chestLevel: 65,
    farmFrom: { difficulty: 'hell', map: '2-5' },
    farmTo: { difficulty: 'torment', map: '1-2' },
  },
  {
    rangeFrom: 60,
    rangeTo: 70,
    cubeLevel: 7,
    chestLevel: 80,
    farmFrom: { difficulty: 'torment', map: '1-3' },
  },
  {
    rangeFrom: 70,
    rangeTo: 100,
    cubeLevel: 8,
    chestLevel: 100,
    farmFrom: { difficulty: 'torment', map: '1-3' },
  },
];

const DIFFICULTY_LABEL_KEYS = {
  normal: 'guides.cubeLevelLogic.difficulty.normal',
  nightmare: 'guides.cubeLevelLogic.difficulty.nightmare',
  hell: 'guides.cubeLevelLogic.difficulty.hell',
  torment: 'guides.cubeLevelLogic.difficulty.torment',
} as const;

function zoneHtml(zone: ZoneRef): string {
  const label = t(DIFFICULTY_LABEL_KEYS[zone.difficulty]);
  return `<span class="cube-zone cube-zone--${zone.difficulty}">${label} ${zone.map}</span>`;
}

function maxXpItemLevel(row: CubeLevelRow): number {
  return row.rangeFrom === 1 ? 1 : row.rangeTo;
}

function farmAdviceHtml(row: CubeLevelRow): string {
  const from = zoneHtml(row.farmFrom);
  if (!row.farmTo) {
    return t('guides.cubeLevelLogic.farmBeyond', {
      from,
      level: row.chestLevel,
    });
  }
  return t('guides.cubeLevelLogic.farmRange', {
    from,
    to: zoneHtml(row.farmTo),
    level: row.chestLevel,
  });
}

function cubeImageUrl(level: number): string {
  return bundledGameUiUrl(`cube/cube-level-${level}.jpeg`);
}

function renderTableRow(row: CubeLevelRow): string {
  return `
    <div class="cube-logic-table__row" role="row">
      <div class="cube-logic-table__cell cube-logic-table__range" role="cell">
        ${t('guides.cubeLevelLogic.levelRange', { from: row.rangeFrom, to: row.rangeTo })}
      </div>
      <div class="cube-logic-table__cell cube-logic-table__cube" role="cell">
        <img
          class="cube-logic-table__cube-img pixel-art"
          src="${cubeImageUrl(row.cubeLevel)}"
          alt=""
          width="72"
          height="72"
          loading="lazy"
        />
        <span class="cube-logic-table__cube-label">
          ${t('guides.cubeLevelLogic.cubeLevel', { level: row.cubeLevel })}
        </span>
      </div>
      <div class="cube-logic-table__cell cube-logic-table__feed" role="cell">
        ${t('guides.cubeLevelLogic.feedItem', { level: maxXpItemLevel(row) })}
      </div>
      <div class="cube-logic-table__cell cube-logic-table__farm" role="cell">
        ${farmAdviceHtml(row)}
      </div>
    </div>`;
}

export function renderCubeLevelLogicGuidePage(root: HTMLElement, _ctx: AppContext): void {
  root.innerHTML = `
    <div class="page-guides page-cube-logic">
      <header class="page-hero rpg-panel">
        <div class="rpg-panel-inner page-hero-inner">
          <div class="page-hero-copy">
            <a class="guide-back-link" href="${navHref('guides')}">← ${t('guides.cubeLevelLogic.back')}</a>
            <p class="text-kicker">${t('guides.kicker')}</p>
            <h1 class="page-title">${t('guides.cubeLevelLogic.title')}</h1>
            <p class="page-lead">${t('guides.cubeLevelLogic.lead')}</p>
          </div>
        </div>
      </header>

      <section class="guides-section cube-logic-section" aria-labelledby="cube-logic-table-heading">
        <h2 id="cube-logic-table-heading" class="visually-hidden">${t('guides.cubeLevelLogic.title')}</h2>
        <div class="cube-logic-table rpg-panel" role="table" aria-label="${escapeAttr(t('guides.cubeLevelLogic.title'))}">
          <div class="cube-logic-table__head" role="row">
            <div class="cube-logic-table__cell" role="columnheader">${t('guides.cubeLevelLogic.colRange')}</div>
            <div class="cube-logic-table__cell" role="columnheader">${t('guides.cubeLevelLogic.colCube')}</div>
            <div class="cube-logic-table__cell" role="columnheader">${t('guides.cubeLevelLogic.colFeed')}</div>
            <div class="cube-logic-table__cell" role="columnheader">${t('guides.cubeLevelLogic.colFarm')}</div>
          </div>
          ${CUBE_ROWS.map(renderTableRow).join('')}
        </div>
      </section>
    </div>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
