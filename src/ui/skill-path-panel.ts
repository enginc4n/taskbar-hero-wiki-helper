import {
  canInvestMoreSkillPoints,
  chapterLevelGate,
  getPassiveLevel,
  heroLevelFromSave,
  isAttributeGroupUnlocked,
  totalInvestedSkillPoints,
} from '../simulator/build-state';
import {
  canDecrementSkillAtKey,
  canIncrementSkillAtKey,
} from '../simulator/skill-invest';
import {
  passiveNodeLabel,
  skillIconUrl,
  skillNodeFrameUrl,
  skillSectionLockedIconUrl,
} from '../data/skill-ui';
import { heroNameLabel } from '../i18n/hero-class';
import { t } from '../i18n';
import type { EnrichedHero, HeroSaveData, PassiveNode, PlayerSaveData } from '../types';

export type SkillPathPanelVariant = 'author' | 'simulator';

export interface SkillPathPanelContext {
  variant: SkillPathPanelVariant;
  hero: EnrichedHero;
  working: PlayerSaveData;
  heroData: HeroSaveData;
  /** Author mode: max skill points for current milestone. */
  skillBudget?: number;
  /** Author mode: LIFO invest order for decrement rules. */
  investHistory?: number[];
  /** Simulator mode: prepared-build read-only preview. */
  readOnly?: boolean;
}

export interface SkillPathPanelRenderOptions extends SkillPathPanelContext {
  panelId?: string;
  extraPanelClass?: string;
  ariaLabel?: string;
}

export function maxSkillColsForTree(groups: { nodes: PassiveNode[] }[]): number {
  return Math.max(
    4,
    ...groups.map((group) => {
      const passives = group.nodes.filter((n) => n.kind === 'passive' && n.stat && n.stat !== 'NONE');
      const actives = group.nodes.filter((n) => n.kind === 'active');
      return passives.length + actives.length;
    }),
  );
}

function skillNodeMutedClass(tierUnlocked: boolean, level: number, readOnly: boolean): string {
  if (readOnly) return level > 0 ? '' : ' is-muted';
  return tierUnlocked ? '' : ' is-muted';
}

function authorCanIncrement(
  ctx: SkillPathPanelContext,
  node: PassiveNode,
  tierUnlocked: boolean,
): boolean {
  if (!tierUnlocked || ctx.skillBudget == null) return false;
  return canIncrementSkillAtKey(
    node.key,
    ctx.working,
    ctx.hero,
    ctx.heroData,
    ctx.skillBudget,
  );
}

function authorCanDecrement(ctx: SkillPathPanelContext, node: PassiveNode, tierUnlocked: boolean): boolean {
  if (!tierUnlocked || !ctx.investHistory) return false;
  return canDecrementSkillAtKey(node.key, ctx.investHistory);
}

function drawSkillNode(
  ctx: SkillPathPanelContext,
  node: PassiveNode,
  tierUnlocked: boolean,
  linkBefore: boolean,
): string {
  const level = getPassiveLevel(ctx.working, node.key);
  const max = node.maxLevel ?? 1;
  const icon = skillIconUrl(node.icon);
  const lvClass = level >= max ? 'max' : level > 0 ? 'has' : '';
  const label = passiveNodeLabel(node);
  const readOnly = ctx.readOnly ?? false;
  const isAuthor = ctx.variant === 'author';

  let canInc = false;
  let canDec = false;
  if (isAuthor) {
    canInc = authorCanIncrement(ctx, node, tierUnlocked);
    canDec = authorCanDecrement(ctx, node, tierUnlocked);
  } else {
    canInc = tierUnlocked && !readOnly && level < max && canInvestMoreSkillPoints(ctx.working);
    canDec = tierUnlocked && !readOnly && level > 0;
  }

  const atMax = !canInc;
  const atMin = !canDec;
  const muted = isAuthor
    ? tierUnlocked ? '' : ' is-muted'
    : skillNodeMutedClass(tierUnlocked, level, readOnly);
  const investable = isAuthor && canInc ? ' is-investable' : '';
  const perPoint = node.perPoint ?? '';
  const title = isAuthor ? '' : ` title="${label} · ${perPoint}/lvl"`;

  const linkWrap = (inner: string): string => `
      <div class="tree-node-link">
        ${linkBefore ? '<span class="tree-link-h" aria-hidden="true"></span>' : ''}
        ${inner}
      </div>`;

  const controls =
    tierUnlocked && !readOnly
      ? `
          <div class="tree-skill-controls" role="group"${isAuthor ? '' : ` aria-label="${label} level"`}>
            <button type="button" class="node-btn" data-action="passive-dec" data-key="${node.key}"${
              isAuthor ? '' : ` aria-label="${t('build.decrease', { name: label })}"`
            }${atMin ? ' disabled' : ''}>−</button>
            <button type="button" class="node-btn" data-action="passive-inc" data-key="${node.key}" data-max="${max}"${
              isAuthor ? '' : ` aria-label="${t('build.increase', { name: label })}"`
            }${atMax ? ' disabled' : ''}>+</button>
          </div>`
      : '';

  return linkWrap(`
        <div class="tree-skill skill-node-wrap ${lvClass}${muted}${investable}"${title}>
          <div class="skill-node">
            <img class="node-frame pixel-art" src="${skillNodeFrameUrl('passive', level, max)}" alt="" />
            ${icon ? `<img class="node-icon pixel-art" src="${icon}" alt="" loading="lazy" />` : ''}
            <span class="node-lv ${lvClass}">${level}<span class="node-lv-max">/${max}</span></span>
          </div>
          <span class="tree-skill-name">${label}</span>
          ${controls}
        </div>`);
}

function drawActiveNode(
  ctx: SkillPathPanelContext,
  node: PassiveNode,
  tierUnlocked: boolean,
  linkBefore: boolean,
): string {
  const level = getPassiveLevel(ctx.working, node.key);
  const max = node.maxLevel ?? 1;
  const icon = skillIconUrl(node.icon);
  const lvClass = level >= max ? 'max' : level > 0 ? 'has' : '';
  const name = node.name ?? (ctx.variant === 'author' ? 'Active Skill' : t('build.activeSkill'));
  const readOnly = ctx.readOnly ?? false;
  const isAuthor = ctx.variant === 'author';

  let canInc = false;
  let canDec = false;
  if (isAuthor) {
    canInc = authorCanIncrement(ctx, node, tierUnlocked);
    canDec = authorCanDecrement(ctx, node, tierUnlocked);
  } else {
    canInc = tierUnlocked && !readOnly && level < max && canInvestMoreSkillPoints(ctx.working);
    canDec = tierUnlocked && !readOnly && level > 0;
  }

  const atMax = !canInc;
  const atMin = !canDec;
  const muted = isAuthor
    ? tierUnlocked ? '' : ' is-muted'
    : skillNodeMutedClass(tierUnlocked, level, readOnly);
  const investable = isAuthor && canInc ? ' is-investable' : '';
  const title = isAuthor ? '' : ` title="${name}"`;

  const linkWrap = (inner: string): string => `
      <div class="tree-node-link">
        ${linkBefore ? '<span class="tree-link-h" aria-hidden="true"></span>' : ''}
        ${inner}
      </div>`;

  const controls =
    tierUnlocked && !readOnly
      ? `
          <div class="tree-skill-controls" role="group"${isAuthor ? '' : ` aria-label="${name} level"`}>
            <button type="button" class="node-btn" data-action="passive-dec" data-key="${node.key}"${
              isAuthor ? '' : ` aria-label="${t('build.decrease', { name })}"`
            }${atMin ? ' disabled' : ''}>−</button>
            <button type="button" class="node-btn" data-action="passive-inc" data-key="${node.key}" data-max="${max}"${
              isAuthor ? '' : ` aria-label="${t('build.increase', { name })}"`
            }${atMax ? ' disabled' : ''}>+</button>
          </div>`
      : '';

  return linkWrap(`
        <div class="tree-skill tree-skill--active ${lvClass}${muted}${investable}"${title}>
          <div class="skill-node">
            <img class="node-frame pixel-art" src="${skillNodeFrameUrl('active', level, max)}" alt="" />
            ${icon ? `<img class="node-icon pixel-art" src="${icon}" alt="" loading="lazy" />` : ''}
            <span class="node-lv ${lvClass}">${level}<span class="node-lv-max">/${max}</span></span>
            <span class="tree-skill-tag text-ui">Active</span>
          </div>
          <span class="tree-skill-name">${name}</span>
          ${controls}
        </div>`);
}

function drawSkillNodesLayout(
  ctx: SkillPathPanelContext,
  passives: PassiveNode[],
  actives: PassiveNode[],
  unlocked: boolean,
): string {
  type SkillEntry = { node: PassiveNode; kind: 'passive' | 'active' };
  const all: SkillEntry[] = [
    ...passives.map((n) => ({ node: n, kind: 'passive' as const })),
    ...actives.map((n) => ({ node: n, kind: 'active' as const })),
  ];
  if (!all.length) return '';

  const readOnly = ctx.readOnly ?? false;
  const tierUnlocked = ctx.variant === 'author' ? unlocked : readOnly || unlocked;

  const items = all
    .map((item, i) =>
      item.kind === 'passive'
        ? drawSkillNode(ctx, item.node, tierUnlocked, i > 0)
        : drawActiveNode(ctx, item.node, tierUnlocked, i > 0),
    )
    .join('');

  return `
      <div class="tree-nodes-layout tree-nodes-layout--line">
        <div class="tree-nodes-row">${items}</div>
      </div>`;
}

export function buildSkillPathTiersHtml(ctx: SkillPathPanelContext): string {
  const { hero, working, heroData } = ctx;
  const heroLevel = heroLevelFromSave(heroData);
  const groups = hero.tree;
  const readOnly = ctx.readOnly ?? false;
  const isAuthor = ctx.variant === 'author';

  return groups
    .map((group, index) => {
      const unlocked = isAttributeGroupUnlocked(index, groups, heroLevel, working, heroData);
      const hasPoints = group.nodes.some((n) => getPassiveLevel(working, n.key) > 0);
      const gate = chapterLevelGate(index);
      const reached = heroLevel >= gate;
      const passives = group.nodes.filter((n) => n.kind === 'passive' && n.stat && n.stat !== 'NONE');
      const actives = group.nodes.filter((n) => n.kind === 'active');

      if (isAuthor) {
        const nodesHtml = drawSkillNodesLayout(ctx, passives, actives, unlocked);

        return `
          <article class="tree-tier ${unlocked ? 'is-unlocked' : 'is-locked'}" data-gate="${gate}">
            <div class="tree-tier-gate">
              <div class="tree-gate-stone">
                <span>${gate}</span>
              </div>
            </div>
            <div class="tree-tier-page">
              <header class="tree-tier-head">
                <h4 class="tree-tier-title">
                  <span class="tree-chapter">${t('build.chapter', { chapter: index + 1 })}</span>
                  <span class="tree-tier-sep" aria-hidden="true">*</span>
                  <span class="tree-tier-level">${t('build.level', { level: gate })}</span>
                </h4>
              </header>
              <div class="tree-branch">
                ${nodesHtml}
              </div>
            </div>
          </article>`;
      }

      const nodesHtml = drawSkillNodesLayout(ctx, passives, actives, unlocked);
      const stateClass = readOnly
        ? ['is-prepared-tier', hasPoints ? 'is-invested' : '', reached ? 'is-reached' : '']
            .filter(Boolean)
            .join(' ')
        : [
            unlocked ? 'is-unlocked' : 'is-locked',
            reached ? 'is-reached' : '',
            hasPoints ? 'is-invested' : '',
            reached && unlocked && !hasPoints ? 'is-current' : '',
          ]
            .filter(Boolean)
            .join(' ');

      return `
          <article class="tree-tier ${stateClass}" data-gate="${gate}">
            <div class="tree-tier-gate">
              <div class="tree-gate-stone">
                <span>${gate}</span>
              </div>
            </div>
            <div class="tree-tier-page">
              <header class="tree-tier-head">
                <h4 class="tree-tier-title">
                  <span class="tree-chapter">${t('build.chapter', { chapter: index + 1 })}</span>
                  <span class="tree-tier-sep" aria-hidden="true">*</span>
                  <span class="tree-tier-level">${t('build.level', { level: gate })}</span>
                </h4>
              </header>
              <div class="tree-branch">
                ${nodesHtml}
              </div>
              ${readOnly || unlocked ? '' : `
                <div class="tree-tier-seal" aria-hidden="true">
                  <img src="${skillSectionLockedIconUrl()}" alt="" class="pixel-art" />
                  <span class="text-ui">Sealed</span>
                </div>`}
            </div>
          </article>`;
    })
    .join('');
}

function drawPanelHeader(ctx: SkillPathPanelContext): string {
  const { hero, heroData } = ctx;
  const heroLevel = heroLevelFromSave(heroData);
  const groups = hero.tree;
  const readOnly = ctx.readOnly ?? false;

  if (ctx.variant === 'author') {
    const spent = totalInvestedSkillPoints(ctx.working);
    const budget = ctx.skillBudget ?? 0;
    return `
            <div class="rpg-panel-head-copy">
              <p class="text-kicker">Skill Path</p>
              <h3 class="rpg-panel-title">${t('build.pathOf', { name: heroNameLabel(hero.name) })}</h3>
              <p class="helper-skill-budget text-ui">${t('buildHelper.skillBudget', { spent, budget })}</p>
            </div>`;
  }

  return `
            <div class="rpg-panel-head-copy">
              <p class="text-kicker">${t('build.guildChronicle')}</p>
              <h3 class="rpg-panel-title">${t('build.pathOf', { name: heroNameLabel(hero.name) })}</h3>
              <p class="rpg-panel-sub">${
                readOnly
                  ? t('build.preparedPathChapters', { count: groups.length })
                  : t('build.levelChaptersRoad', { level: heroLevel, count: groups.length })
              }</p>
            </div>`;
}

export function renderSkillPathPanel(options: SkillPathPanelRenderOptions): string {
  const { hero, extraPanelClass = '', panelId, ariaLabel } = options;
  const tiers = buildSkillPathTiersHtml(options);
  const skillCols = maxSkillColsForTree(hero.tree);
  const isAuthor = options.variant === 'author';

  const panelClasses = [
    'rpg-panel',
    'chronicle-panel',
    isAuthor ? 'helper-chronicle' : '',
    extraPanelClass,
  ]
    .filter(Boolean)
    .join(' ');

  const tiersInner = `
            <div class="chronicle-book">
              <div class="chronicle-spine" aria-hidden="true"></div>
              <div class="chronicle-path" aria-hidden="true"></div>
              <div class="chronicle-tiers" style="--tier-skill-cols: ${skillCols}">${tiers}</div>
            </div>`;

  return `
      <div class="${panelClasses}"${panelId ? ` id="${panelId}"` : ''}${ariaLabel ? ` aria-label="${ariaLabel}"` : ''}>
        <div class="rpg-panel-inner">
          <header class="rpg-panel-head">
            ${drawPanelHeader(options)}
          </header>
          <div class="chronicle-scroll">
            ${tiersInner}
          </div>
        </div>
      </div>`;
}

export function refreshSkillPathTiers(root: ParentNode, ctx: SkillPathPanelContext): void {
  const tiersEl = root.querySelector('.chronicle-tiers');
  if (tiersEl) tiersEl.innerHTML = buildSkillPathTiersHtml(ctx);
}

export function refreshSkillPathBudget(root: ParentNode, spent: number, budget: number): void {
  const budgetEl = root.querySelector('.helper-skill-budget');
  if (budgetEl) {
    budgetEl.textContent = t('buildHelper.skillBudget', { spent, budget });
  }
}

export function captureSkillPathScrollTop(root: ParentNode): number {
  return root.querySelector<HTMLElement>('.chronicle-scroll')?.scrollTop ?? 0;
}

export function restoreSkillPathScrollTop(root: ParentNode, scrollTop: number): void {
  const chronicle = root.querySelector<HTMLElement>('.chronicle-scroll');
  if (chronicle) chronicle.scrollTop = scrollTop;
}
