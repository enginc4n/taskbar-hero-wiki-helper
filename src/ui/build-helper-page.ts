import { mergeRefMaps, buildRefMaps, enrichedItemToDetail } from '../data/adapters';
import {
  HERO_GEAR_LEFT,
  HERO_GEAR_RIGHT,
  renderGearSlotHtml,
} from '../data/game-ui';
import { itemIconHtml } from '../data/icons';
import {
  PREPARED_LEVEL_STEPS,
  applyPreparedMilestone,
  type PreparedBuild,
  type PreparedBuildMilestone,
} from '../data/prepared-builds';
import {
  downloadJsonFile,
  manifestEntryFromBuild,
  milestoneFromWorking,
  normalizeMilestone,
  slugifyBuildId,
} from '../data/prepared-build-export';
import { passiveNodeLabel, skillIconUrl, skillNodeFrameUrl } from '../data/skill-ui';
import { heroNameLabel } from '../i18n/hero-class';
import { t } from '../i18n';
import { classGlyph } from '../data/rpg-ui';
import {
  createEmptySave,
  equipItem,
  getPassiveLevel,
  getSelectedHero,
  heroLevelFromSave,
  isAttributeGroupUnlocked,
  setPassiveLevel,
  partIndex,
  syncAttributeGroupUnlocks,
  syncSaveItemKeys,
  unequipPart,
} from '../simulator/build-state';
import type { SimulatorContext } from './simulator-page';
import type { EnrichedHero, EnrichedItem, HeroPart, PassiveNode } from '../types';
import { PART_LABELS } from '../types';
import { filterGear, DEFAULT_GEAR_FILTER, itemMatchesHeroClass } from '../gear/filter';

function emptyMilestones(): PreparedBuildMilestone[] {
  return PREPARED_LEVEL_STEPS.map((level) => ({
    level,
    heroLevel: level,
  }));
}

function isMilestoneEmpty(m: PreparedBuildMilestone): boolean {
  return !m.passives?.length && !m.gear?.length;
}

function milestoneWithoutRunes(m: PreparedBuildMilestone): PreparedBuildMilestone {
  const out = { ...m };
  delete out.runes;
  return out;
}

function inheritMilestoneFromPrevious(
  milestones: PreparedBuildMilestone[],
  index: number,
): PreparedBuildMilestone {
  const step = PREPARED_LEVEL_STEPS[index];
  const current = milestones[index];
  if (!isMilestoneEmpty(current) || index === 0) return current;

  for (let i = index - 1; i >= 0; i--) {
    if (!isMilestoneEmpty(milestones[i])) {
      const inherited = JSON.parse(JSON.stringify(milestones[i])) as PreparedBuildMilestone;
      inherited.level = step;
      inherited.heroLevel = step;
      return inherited;
    }
  }
  return current;
}

export function renderBuildHelperPage(root: HTMLElement, ctx: SimulatorContext): void {
  let buildId = 'my-prepared-build';
  let buildName = 'My Prepared Build';
  let buildDescription = '';
  let heroKey = ctx.heroes[0]?.key ?? 101;
  let milestoneIndex = 0;
  let milestones = emptyMilestones();
  let working = createEmptySave(heroKey);
  let itemsByKey = syncSaveItemKeys(working, ctx.allItems);
  const refs = mergeRefMaps(buildRefMaps(ctx.wiki), {
    items: ctx.items,
    heroes: ctx.heroes,
    runes: ctx.runes,
  });

  function heroDef(): EnrichedHero | undefined {
    return ctx.heroes.find((h) => h.key === heroKey);
  }

  function heroSave() {
    return getSelectedHero(working, heroKey);
  }

  function persistMilestone(): void {
    milestones[milestoneIndex] = milestoneWithoutRunes(
      normalizeMilestone(
        milestoneFromWorking(working, heroKey, PREPARED_LEVEL_STEPS[milestoneIndex]),
      ),
    );
  }

  function loadMilestone(index: number, options?: { skipInherit?: boolean }): void {
    persistMilestone();
    milestoneIndex = index;
    const def = heroDef();
    const milestone = milestoneWithoutRunes(
      options?.skipInherit
        ? milestones[milestoneIndex]
        : inheritMilestoneFromPrevious(milestones, milestoneIndex),
    );
    if (!def) return;
    working = createEmptySave(heroKey);
    itemsByKey = syncSaveItemKeys(working, ctx.allItems);
    applyPreparedMilestone(working, def, milestone, ctx.allItems, itemsByKey);
    syncHeroUnlocks();
    draw();
  }

  function syncHeroUnlocks(): void {
    const h = heroSave();
    const def = heroDef();
    if (h && def) syncAttributeGroupUnlocks(working, h, def);
  }

  function switchHero(key: number): void {
    persistMilestone();
    heroKey = key;
    working = createEmptySave(heroKey);
    itemsByKey = syncSaveItemKeys(working, ctx.allItems);
    milestones = emptyMilestones();
    milestoneIndex = 0;
    syncHeroUnlocks();
    draw();
  }

  function buildExport(): PreparedBuild {
    persistMilestone();
    return {
      id: buildId.trim() || slugifyBuildId(buildName),
      name: buildName.trim() || 'Prepared Build',
      description: buildDescription.trim() || undefined,
      heroKey,
      milestones: milestones.map(normalizeMilestone),
    };
  }

  function importBuild(build: PreparedBuild): void {
    buildId = build.id;
    buildName = build.name;
    buildDescription = build.description ?? '';
    heroKey = build.heroKey;
    milestones = PREPARED_LEVEL_STEPS.map((level) => {
      const found = build.milestones.find((m) => m.level === level);
      return found
        ? milestoneWithoutRunes(normalizeMilestone(found))
        : { level, heroLevel: level };
    });
    milestoneIndex = 0;
    working = createEmptySave(heroKey);
    itemsByKey = syncSaveItemKeys(working, ctx.allItems);
    const def = heroDef();
    if (def) applyPreparedMilestone(working, def, milestones[0], ctx.allItems, itemsByKey);
    syncHeroUnlocks();
    draw();
  }

  function drawSkillNode(node: PassiveNode, tierUnlocked: boolean): string {
    const level = getPassiveLevel(working, node.key);
    const max = node.maxLevel ?? 1;
    const icon = skillIconUrl(node.icon);
    const lvClass = level >= max ? 'max' : level > 0 ? 'has' : '';
    const label = passiveNodeLabel(node);
    const atMax = level >= max;
    const atMin = level <= 0;

    return `
      <div class="tree-skill skill-node-wrap ${lvClass}${tierUnlocked ? '' : ' is-muted'}">
        <div class="skill-node">
          <img class="node-frame pixel-art" src="${skillNodeFrameUrl('passive', level, max)}" alt="" />
          ${icon ? `<img class="node-icon pixel-art" src="${icon}" alt="" loading="lazy" />` : ''}
          <span class="node-lv ${lvClass}">${level}<span class="node-lv-max">/${max}</span></span>
        </div>
        <span class="tree-skill-name">${label}</span>
        ${tierUnlocked ? `
          <div class="tree-skill-controls" role="group">
            <button type="button" class="node-btn" data-action="passive-dec" data-key="${node.key}"${atMin ? ' disabled' : ''}>−</button>
            <button type="button" class="node-btn" data-action="passive-inc" data-key="${node.key}" data-max="${max}"${atMax ? ' disabled' : ''}>+</button>
          </div>` : ''}
      </div>`;
  }

  function drawActiveNode(node: PassiveNode, tierUnlocked: boolean): string {
    const level = getPassiveLevel(working, node.key);
    const max = node.maxLevel ?? 1;
    const icon = skillIconUrl(node.icon);
    const lvClass = level >= max ? 'max' : level > 0 ? 'has' : '';
    const name = node.name ?? 'Active Skill';
    const atMax = level >= max;
    const atMin = level <= 0;

    return `
      <div class="tree-skill tree-skill--active ${lvClass}${tierUnlocked ? '' : ' is-muted'}">
        <div class="skill-node">
          <img class="node-frame pixel-art" src="${skillNodeFrameUrl('active', level, max)}" alt="" />
          ${icon ? `<img class="node-icon pixel-art" src="${icon}" alt="" loading="lazy" />` : ''}
          <span class="node-lv ${lvClass}">${level}<span class="node-lv-max">/${max}</span></span>
          <span class="tree-skill-tag text-ui">Active</span>
        </div>
        <span class="tree-skill-name">${name}</span>
        ${tierUnlocked ? `
          <div class="tree-skill-controls" role="group">
            <button type="button" class="node-btn" data-action="passive-dec" data-key="${node.key}"${atMin ? ' disabled' : ''}>−</button>
            <button type="button" class="node-btn" data-action="passive-inc" data-key="${node.key}" data-max="${max}"${atMax ? ' disabled' : ''}>+</button>
          </div>` : ''}
      </div>`;
  }

  function buildChronicleTiersHtml(): string {
    const def = heroDef();
    const heroData = heroSave();
    if (!def || !heroData) return '';

    const heroLevel = heroLevelFromSave(heroData);
    return def.tree
      .map((group, index) => {
        const unlocked = isAttributeGroupUnlocked(index, def.tree, heroLevel, working, heroData);
        const passives = group.nodes.filter((n) => n.kind === 'passive' && n.stat && n.stat !== 'NONE');
        const actives = group.nodes.filter((n) => n.kind === 'active');
        const nodes = [...passives.map((n) => drawSkillNode(n, unlocked)), ...actives.map((n) => drawActiveNode(n, unlocked))].join('');

        return `
          <article class="tree-tier ${unlocked ? 'is-unlocked' : 'is-locked'}">
            <div class="tree-tier-page">
              <header class="tree-tier-head">
                <h4 class="tree-tier-title">
                  <span class="tree-chapter">${t('build.chapter', { chapter: index + 1 })}</span>
                  <span class="tree-tier-sep" aria-hidden="true">*</span>
                  <span class="tree-tier-level">${t('build.level', { level: group.levelGate })}</span>
                </h4>
              </header>
              <div class="tree-branch helper-skill-row">
                <div class="tree-nodes-layout tree-nodes-layout--line">
                  <div class="tree-nodes-row">${nodes}</div>
                </div>
              </div>
            </div>
          </article>`;
      })
      .join('');
  }

  function drawChronicle(): string {
    const def = heroDef();
    if (!def) return '';

    return `
      <div class="rpg-panel chronicle-panel helper-chronicle">
        <div class="rpg-panel-inner">
          <header class="rpg-panel-head">
            <p class="text-kicker">Skill Path</p>
            <h3 class="rpg-panel-title">${t('build.pathOf', { name: heroNameLabel(def.name) })}</h3>
          </header>
          <div class="chronicle-scroll"><div class="chronicle-tiers">${buildChronicleTiersHtml()}</div></div>
        </div>
      </div>`;
  }

  function captureScrollState(): { chronicleScrollTop: number; windowScrollY: number } {
    return {
      chronicleScrollTop: root.querySelector<HTMLElement>('.chronicle-scroll')?.scrollTop ?? 0,
      windowScrollY: window.scrollY,
    };
  }

  function restoreScrollState(saved: ReturnType<typeof captureScrollState>): void {
    requestAnimationFrame(() => {
      const chronicle = root.querySelector<HTMLElement>('.chronicle-scroll');
      if (chronicle) chronicle.scrollTop = saved.chronicleScrollTop;
      if (window.scrollY !== saved.windowScrollY) window.scrollTo(0, saved.windowScrollY);
    });
  }

  function updateJsonPreview(): void {
    persistMilestone();
    const preview = JSON.stringify(
      {
        id: buildId.trim() || slugifyBuildId(buildName),
        name: buildName.trim() || 'Prepared Build',
        description: buildDescription.trim() || undefined,
        heroKey,
        milestones: milestones.map(normalizeMilestone),
      },
      null,
      2,
    );
    const pre = root.querySelector('.helper-json');
    if (pre) pre.textContent = preview;
  }

  function refreshWorkspace(): void {
    const scrollState = captureScrollState();

    const tiersEl = root.querySelector('.chronicle-tiers');
    if (tiersEl) tiersEl.innerHTML = buildChronicleTiersHtml();

    const equipment = root.querySelector('.helper-equipment');
    if (equipment) equipment.outerHTML = drawEquipment();

    const heroLevelInput = root.querySelector<HTMLInputElement>('[data-field="hero-level"]');
    const heroData = heroSave();
    if (heroLevelInput && heroData) heroLevelInput.value = String(heroLevelFromSave(heroData));

    updateJsonPreview();
    restoreScrollState(scrollState);
  }

  function itemForPart(part: HeroPart): EnrichedItem | undefined {
    const hero = heroSave();
    if (!hero) return undefined;
    const uid = hero.equippedItemIds[partIndex(part)];
    const inst = uid ? working.itemSaveDatas.find((i) => String(i.UniqueId) === String(uid)) : null;
    return inst ? itemsByKey.get(inst.ItemKey) : undefined;
  }

  function drawEquipment(): string {
    function side(rows: HeroPart[][]): string {
      return rows
        .map(
          (row) => `
        <div class="equip-row">${row
          .map((part) => renderGearSlotHtml({ part, item: itemForPart(part) }))
          .join('')}</div>`,
        )
        .join('');
    }

    return `
      <section class="helper-equipment">
        <p class="text-kicker">Gear (optional)</p>
        <div class="equipment-layout equipment-layout--compact">
          <div class="equip-side equip-side--left">${side(HERO_GEAR_LEFT)}</div>
          <div class="equip-side equip-side--right">${side(HERO_GEAR_RIGHT)}</div>
        </div>
      </section>`;
  }

  function draw(): void {
    const def = heroDef();

    root.innerHTML = `
      <div class="helper-page">
        <header class="helper-header rpg-panel">
          <div class="helper-header-inner">
            <div>
              <p class="text-kicker">${t('buildHelper.kicker')}</p>
              <h1 class="helper-title page-title">${t('buildHelper.title')}</h1>
              <p class="helper-sub">${t('buildHelper.sub')}</p>
            </div>
          </div>
        </header>

        <section class="helper-meta rpg-panel">
          <div class="rpg-panel-inner helper-meta-grid">
            <label class="helper-field">
              <span class="field-label">${t('buildHelper.buildId')}</span>
              <input data-field="build-id" value="${buildId}" placeholder="my-prepared-build" />
            </label>
            <label class="helper-field">
              <span class="field-label">${t('buildHelper.displayName')}</span>
              <input data-field="build-name" value="${buildName}" />
            </label>
            <label class="helper-field helper-field--wide">
              <span class="field-label">${t('buildHelper.description')}</span>
              <input data-field="build-desc" value="${buildDescription}" placeholder="${t('buildHelper.descriptionPlaceholder')}" />
            </label>
            <label class="helper-field">
              <span class="field-label">${t('buildHelper.hero')}</span>
              <select data-field="hero-key">
                ${ctx.heroes.map((h) => `<option value="${h.key}"${h.key === heroKey ? ' selected' : ''}>${heroNameLabel(h.name)}</option>`).join('')}
              </select>
            </label>
            <label class="helper-field">
              <span class="field-label">${t('buildHelper.milestoneLevel')}</span>
              <input type="number" min="1" max="70" data-field="hero-level" value="${heroLevelFromSave(heroSave() ?? { heroKey, equippedItemIds: [] })}" />
            </label>
          </div>
        </section>

        <section class="helper-milestone-bar">
          <div class="helper-milestone-tabs" role="tablist">
            ${PREPARED_LEVEL_STEPS.map(
              (level, i) => `
              <button type="button" role="tab" class="helper-milestone-tab${i === milestoneIndex ? ' is-active' : ''}" data-action="milestone-pick" data-index="${i}">Lv.${level}</button>`,
            ).join('')}
          </div>
          <div class="helper-milestone-actions">
            <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--sm" data-action="copy-prev-milestone"${milestoneIndex === 0 ? ' disabled' : ''}>${t('buildHelper.copyPrevious')}</button>
            <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--sm" data-action="clear-milestone">${t('buildHelper.clearMilestone')}</button>
          </div>
        </section>

        <div class="helper-workspace">
          ${drawChronicle()}
          <div class="helper-side">
            <div class="rpg-panel helper-hero-card">
              <div class="rpg-panel-inner">
                <span class="helper-hero-glyph">${classGlyph(def?.class ?? '')}</span>
                <h3 class="rpg-panel-title">${def ? heroNameLabel(def.name) : t('build.heroFallback')}</h3>
                <p class="rpg-panel-sub">${t('buildHelper.editingMilestone', { level: PREPARED_LEVEL_STEPS[milestoneIndex] })}</p>
              </div>
            </div>
            ${drawEquipment()}
          </div>
        </div>

        <section class="helper-export rpg-panel">
          <div class="rpg-panel-inner">
            <div class="helper-export-actions">
              <label class="rpg-btn rpg-btn--ghost">
                ${t('buildHelper.importJson')}
                <input type="file" accept=".json,application/json" data-action="import-json" hidden />
              </label>
              <button type="button" class="rpg-btn rpg-btn--gold" data-action="export-build">${t('buildHelper.downloadBuild')}</button>
              <button type="button" class="rpg-btn rpg-btn--ghost" data-action="export-manifest">${t('buildHelper.downloadManifest')}</button>
            </div>
            <details class="helper-json-preview">
              <summary>${t('buildHelper.previewJson')}</summary>
              <pre class="helper-json"></pre>
            </details>
          </div>
        </section>
      </div>
      <div id="helper-modal" class="modal-root"></div>
    `;

    ensureEvents();
    updateJsonPreview();
  }

  function openGearPicker(part: HeroPart): void {
    const hero = heroDef();
    if (!hero) return;
    const modalRoot = root.querySelector('#helper-modal') as HTMLElement;

    function renderModal(): void {
      const pool = ctx.items.filter(
        (item) =>
          item.type === 'GEAR' &&
          (!item.parts || item.parts === part) &&
          itemMatchesHeroClass(item, hero!.class),
      );
      const filtered = filterGear(pool, DEFAULT_GEAR_FILTER);
      const visible = filtered.slice(0, 40);
      const heroData = heroSave();
      const equippedUid = heroData?.equippedItemIds[partIndex(part)];

      modalRoot.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal">
          <div class="modal" role="dialog">
            <div class="modal-frame">
              <header class="modal-header">
                <h3>Select ${PART_LABELS[part]}</h3>
                <button type="button" class="rpg-btn rpg-btn--ghost rpg-btn--icon" data-action="close-modal">✕</button>
              </header>
              <div class="gear-modal-results" style="padding:1rem;max-height:60vh;overflow:auto;">
                ${equippedUid ? `<button type="button" class="rpg-btn rpg-btn--ghost" data-action="unequip" style="margin-bottom:0.5rem;">Remove gear</button>` : ''}
                <div class="gear-grid">
                  ${visible
                    .map(
                      (item) => `
                    <article class="gear-card">
                      ${itemIconHtml(item.icon, item.name)}
                      <h4>${item.name}</h4>
                      <button type="button" class="rpg-btn rpg-btn--gold rpg-btn--sm" data-action="equip" data-key="${item.key}">Equip</button>
                    </article>`,
                    )
                    .join('')}
                </div>
              </div>
            </div>
          </div>
        </div>`;

      modalRoot.querySelector('.modal')?.addEventListener('click', (e) => e.stopPropagation());
      modalRoot.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
        el.addEventListener('click', () => { modalRoot.innerHTML = ''; });
      });
      modalRoot.querySelector('[data-action="unequip"]')?.addEventListener('click', () => {
        const h = heroSave();
        if (h) unequipPart(working, h, part);
        modalRoot.innerHTML = '';
        refreshWorkspace();
      });
      modalRoot.querySelectorAll('[data-action="equip"]').forEach((el) => {
        el.addEventListener('click', () => {
          const key = Number(el.getAttribute('data-key'));
          const item = itemsByKey.get(key) ?? ctx.allItems.find((i) => i.key === key);
          const h = heroSave();
          if (!item || !h) return;
          equipItem(working, h, part, item, itemsByKey);
          const detail = enrichedItemToDetail(item);
          if (detail) refs.itemDetailById.set(String(item.key), detail);
          modalRoot.innerHTML = '';
          refreshWorkspace();
        });
      });
    }

    renderModal();
  }

  let eventsBound = false;

  function ensureEvents(): void {
    if (eventsBound) return;
    eventsBound = true;

    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!el || el.closest('#helper-modal')) return;

      const action = el.getAttribute('data-action');
      if (action === 'milestone-pick') {
        loadMilestone(Number(el.getAttribute('data-index')));
        return;
      }
      if (action === 'copy-prev-milestone') {
        if (milestoneIndex === 0) return;
        persistMilestone();
        milestones[milestoneIndex] = JSON.parse(JSON.stringify(milestones[milestoneIndex - 1])) as PreparedBuildMilestone;
        milestones[milestoneIndex].level = PREPARED_LEVEL_STEPS[milestoneIndex];
        milestones[milestoneIndex].heroLevel = PREPARED_LEVEL_STEPS[milestoneIndex];
        loadMilestone(milestoneIndex);
        return;
      }
      if (action === 'clear-milestone') {
        milestones[milestoneIndex] = {
          level: PREPARED_LEVEL_STEPS[milestoneIndex],
          heroLevel: PREPARED_LEVEL_STEPS[milestoneIndex],
        };
        loadMilestone(milestoneIndex, { skipInherit: true });
        return;
      }
      if (action === 'passive-inc') {
        const key = Number(el.getAttribute('data-key'));
        const max = Number(el.getAttribute('data-max'));
        setPassiveLevel(working, key, getPassiveLevel(working, key) + 1, max);
        syncHeroUnlocks();
        refreshWorkspace();
        return;
      }
      if (action === 'passive-dec') {
        const key = Number(el.getAttribute('data-key'));
        setPassiveLevel(working, key, getPassiveLevel(working, key) - 1, 999);
        syncHeroUnlocks();
        refreshWorkspace();
        return;
      }
      if (action === 'pick-gear') {
        openGearPicker(el.getAttribute('data-part') as HeroPart);
        return;
      }
      if (action === 'export-build') {
        const build = buildExport();
        downloadJsonFile(`${build.id}.json`, build);
        return;
      }
      if (action === 'export-manifest') {
        const build = buildExport();
        downloadJsonFile(`${build.id}-manifest-entry.json`, manifestEntryFromBuild(build));
      }
    });

    root.addEventListener('change', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-field]');
      if (!el) return;
      const field = el.getAttribute('data-field')!;
      if (field === 'build-id') buildId = (el as HTMLInputElement).value;
      if (field === 'build-name') buildName = (el as HTMLInputElement).value;
      if (field === 'build-desc') buildDescription = (el as HTMLInputElement).value;
      if (field === 'hero-key') switchHero(Number((el as HTMLSelectElement).value));
      if (field === 'hero-level') {
        const h = heroSave();
        const lv = Number((el as HTMLInputElement).value);
        if (h && Number.isFinite(lv)) {
          h.Level = lv;
          h.HeroLevel = lv;
          syncHeroUnlocks();
          refreshWorkspace();
        }
      }
      if (field === 'build-id' || field === 'build-name' || field === 'build-desc') {
        updateJsonPreview();
      }
    });

    root.addEventListener('input', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-field]');
      if (!el) return;
      const field = el.getAttribute('data-field')!;
      if (field === 'build-id') buildId = (el as HTMLInputElement).value;
      if (field === 'build-name') buildName = (el as HTMLInputElement).value;
      if (field === 'build-desc') buildDescription = (el as HTMLInputElement).value;
      if (field === 'build-id' || field === 'build-name' || field === 'build-desc') {
        updateJsonPreview();
      }
    });

    root.addEventListener('change', async (e) => {
      const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-action="import-json"]');
      if (!input) return;
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as PreparedBuild;
        if (!parsed.id || !parsed.heroKey || !Array.isArray(parsed.milestones)) {
          throw new Error('Invalid prepared build JSON');
        }
        importBuild(parsed);
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      } finally {
        input.value = '';
      }
    });
  }

  working = createEmptySave(heroKey);
  itemsByKey = syncSaveItemKeys(working, ctx.allItems);
  syncHeroUnlocks();
  draw();
}
