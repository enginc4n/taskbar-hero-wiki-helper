import { mergeRefMaps, buildRefMaps, enrichedItemToDetail } from '../data/adapters';
import {
  HERO_GEAR_LEFT,
  HERO_GEAR_RIGHT,
  renderGearSlotHtml,
} from '../data/game-ui';
import {
  PREPARED_LEVEL_STEPS,
  applyPreparedMilestone,
  legacyMilestoneLevel,
  type PreparedBuild,
  type PreparedBuildMilestone,
  type PreparedLevelStep,
} from '../data/prepared-builds';
import {
  downloadJsonFile,
  manifestEntryFromBuild,
  milestoneFromWorking,
  normalizeMilestone,
} from '../data/prepared-build-export';
import { t } from '../i18n';
import {
  createEmptySave,
  equipItem,
  getPassiveLevel,
  getSelectedHero,
  setPassiveLevel,
  partIndex,
  syncAttributeGroupUnlocks,
  syncSaveItemKeys,
  totalInvestedSkillPoints,
  unequipPart,
  type SocketSlotState,
} from '../simulator/build-state';
import { canIncrementSkillAtKey, milestoneSkillBudget } from '../simulator/skill-invest';
import type { SimulatorContext } from './simulator-page';
import type { EnrichedHero, EnrichedItem, HeroPart } from '../types';
import { openGearPickerModal } from './gear-picker-modal';
import { bindHeroPicker, drawHeroPicker } from './hero-picker';
import { openSocketEditorModal } from './socket-editor-modal';
import {
  captureSkillPathScrollTop,
  refreshSkillPathBudget,
  refreshSkillPathTiers,
  renderSkillPathPanel,
  restoreSkillPathScrollTop,
  type SkillPathPanelContext,
} from './skill-path-panel';

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

function createBuildId(): string {
  return crypto.randomUUID();
}

export function renderBuildHelperPage(root: HTMLElement, ctx: SimulatorContext): void {
  let buildId = createBuildId();
  let buildName = 'My Prepared Build';
  let buildDescription = '';
  let heroKey = ctx.heroes[0]?.key ?? 101;
  let milestoneIndex = 0;
  let milestones = emptyMilestones();
  let working = createEmptySave(heroKey);
  let itemsByKey = syncSaveItemKeys(working, ctx.allItems);
  const socketDraft = new Map<string, SocketSlotState[]>();
  const effectsByKey = new Map(ctx.effects.map((e) => [e.key, e]));
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
    socketDraft.clear();
    applyPreparedMilestone(working, def, milestone, ctx.allItems, itemsByKey);
    syncHeroUnlocks();
    draw();
  }

  function milestoneLevel(): PreparedLevelStep {
    return PREPARED_LEVEL_STEPS[milestoneIndex];
  }

  function skillBudget(): number {
    return milestoneSkillBudget(milestoneLevel());
  }

  function syncHeroUnlocks(): void {
    const h = heroSave();
    const def = heroDef();
    if (h && def) syncAttributeGroupUnlocks(working, h, def, { ignoreHeroLevel: true });
  }

  function switchHero(key: number): void {
    persistMilestone();
    heroKey = key;
    working = createEmptySave(heroKey);
    itemsByKey = syncSaveItemKeys(working, ctx.allItems);
    socketDraft.clear();
    milestones = emptyMilestones();
    milestoneIndex = 0;
    syncHeroUnlocks();
    draw();
  }

  function buildExport(): PreparedBuild {
    persistMilestone();
    return {
      id: buildId,
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
    const byStep = new Map<PreparedLevelStep, PreparedBuildMilestone>();
    for (const m of build.milestones) {
      const step = legacyMilestoneLevel(m.level);
      const candidate = milestoneWithoutRunes(
        normalizeMilestone({ ...m, level: step, heroLevel: Math.max(step, m.heroLevel ?? step) }),
      );
      const existing = byStep.get(step);
      if (!existing || (candidate.passives?.length ?? 0) >= (existing.passives?.length ?? 0)) {
        byStep.set(step, candidate);
      }
    }
    milestones = PREPARED_LEVEL_STEPS.map((level) => byStep.get(level) ?? { level, heroLevel: level });
    milestoneIndex = 0;
    working = createEmptySave(heroKey);
    itemsByKey = syncSaveItemKeys(working, ctx.allItems);
    const def = heroDef();
    if (def) {
      applyPreparedMilestone(working, def, milestones[0], ctx.allItems, itemsByKey);
    }
    syncHeroUnlocks();
    draw();
  }

  function skillPathContext(): SkillPathPanelContext | null {
    const def = heroDef();
    const heroData = heroSave();
    if (!def || !heroData) return null;
    return {
      variant: 'author',
      hero: def,
      working,
      heroData,
      skillBudget: skillBudget(),
    };
  }

  function drawChronicle(): string {
    const ctx = skillPathContext();
    if (!ctx) return '';
    return renderSkillPathPanel(ctx);
  }

  function captureScrollState(): { chronicleScrollTop: number; windowScrollY: number } {
    return {
      chronicleScrollTop: captureSkillPathScrollTop(root),
      windowScrollY: window.scrollY,
    };
  }

  function restoreScrollState(saved: ReturnType<typeof captureScrollState>): void {
    requestAnimationFrame(() => {
      restoreSkillPathScrollTop(root, saved.chronicleScrollTop);
      if (window.scrollY !== saved.windowScrollY) window.scrollTo(0, saved.windowScrollY);
    });
  }

  function updateJsonPreview(): void {
    persistMilestone();
    const preview = JSON.stringify(
      {
        id: buildId,
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
    const ctx = skillPathContext();

    if (ctx) {
      refreshSkillPathTiers(root, ctx);
      refreshSkillPathBudget(root, totalInvestedSkillPoints(working), skillBudget());
    }

    const equipment = root.querySelector('.helper-equipment');
    if (equipment) equipment.outerHTML = drawEquipment();

    updateJsonPreview();
    restoreScrollState(scrollState);
  }

  function itemHasSockets(item: EnrichedItem): boolean {
    const slots = item.slots;
    if (!slots) return false;
    return slots.decoration + slots.engraving + slots.inscription > 0;
  }

  function itemForPart(part: HeroPart): EnrichedItem | undefined {
    const hero = heroSave();
    if (!hero) return undefined;
    const uid = hero.equippedItemIds[partIndex(part)];
    const inst = uid ? working.itemSaveDatas.find((i) => String(i.UniqueId) === String(uid)) : null;
    return inst ? itemsByKey.get(inst.ItemKey) : undefined;
  }

  function drawSideMeta(): string {
    return `
      <div class="rpg-panel helper-side-meta">
        <div class="rpg-panel-inner">
          <div class="helper-side-meta-grid">
            <label class="helper-side-meta-label" for="helper-build-name">${t('buildHelper.displayName')}</label>
            <span class="helper-side-meta-label">${t('buildHelper.hero')}</span>
            <input
              id="helper-build-name"
              type="text"
              class="helper-side-name-input"
              data-field="build-name"
              value="${buildName.replace(/"/g, '&quot;')}"
            />
            <div class="helper-side-hero-picker">
              ${drawHeroPicker({
                heroes: ctx.heroes,
                selectedKey: heroKey,
                working,
                menuLabel: t('buildHelper.hero'),
                triggerLabel: t('buildHelper.hero'),
              })}
            </div>
          </div>
        </div>
      </div>`;
  }

  function drawSideDescription(): string {
    return `
      <div class="rpg-panel helper-side-desc">
        <div class="rpg-panel-inner">
          <label class="helper-field">
            <span class="field-label">${t('buildHelper.description')}</span>
            <textarea
              class="helper-side-desc-input"
              data-field="build-desc"
              rows="4"
              placeholder="${t('buildHelper.descriptionPlaceholder')}"
            >${buildDescription.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
          </label>
        </div>
      </div>`;
  }

  function drawEquipment(): string {
    function side(rows: HeroPart[][]): string {
      return rows
        .map(
          (row) => `
        <div class="equip-row">${row
          .map((part) => {
            const item = itemForPart(part);
            return renderGearSlotHtml({
              part,
              item,
              hasSockets: item ? itemHasSockets(item) : false,
            });
          })
          .join('')}</div>`,
        )
        .join('');
    }

    return `
      <div class="rpg-panel helper-equipment">
        <div class="rpg-panel-inner">
          <p class="text-kicker helper-equipment-kicker">Gear (optional)</p>
          <div class="equipment-layout equipment-layout--compact">
            <div class="equip-side equip-side--left">${side(HERO_GEAR_LEFT)}</div>
            <div class="equip-side equip-side--right">${side(HERO_GEAR_RIGHT)}</div>
          </div>
        </div>
      </div>`;
  }

  function draw(): void {
    root.innerHTML = `
      <div class="helper-page">
        <section class="helper-toolbar rpg-panel">
          <div class="rpg-panel-inner helper-toolbar-inner">
            <div class="helper-toolbar-brand">
              <p class="text-kicker">${t('buildHelper.kicker')}</p>
              <h1 class="helper-title">${t('buildHelper.title')}</h1>
              <p class="helper-sub">${t('buildHelper.sub')}</p>
            </div>
            <div class="helper-toolbar-milestones">
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
            </div>
          </div>
        </section>

        <div class="helper-workspace">
          ${drawChronicle()}
          <div class="helper-side">
            ${drawSideMeta()}
            ${drawEquipment()}
            ${drawSideDescription()}
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
    bindHeroPicker(root, (key) => switchHero(key));
    updateJsonPreview();
  }

  function openSocketEditor(part: HeroPart): void {
    const hero = heroSave();
    if (!hero) return;
    const uid = hero.equippedItemIds[partIndex(part)];
    const inst = working.itemSaveDatas.find((i) => String(i.UniqueId) === String(uid));
    const item = inst ? itemsByKey.get(inst.ItemKey) : undefined;
    if (!inst || !item) return;
    const modalRoot = root.querySelector('#helper-modal') as HTMLElement;

    openSocketEditorModal({
      modalRoot,
      item,
      inst,
      effects: ctx.effects,
      effectsByKey,
      socketDraft,
      onApplied: () => {
        persistMilestone();
        refreshWorkspace();
      },
    });
  }

  function openGearPicker(part: HeroPart): void {
    const hero = heroDef();
    if (!hero) return;
    const modalRoot = root.querySelector('#helper-modal') as HTMLElement;

    openGearPickerModal({
      modalRoot,
      part,
      heroClass: hero.class,
      items: ctx.items,
      meta: ctx.meta,
      equipped: itemForPart(part),
      onEquip: (item) => {
        const h = heroSave();
        if (!h) return;
        itemsByKey.set(item.key, item);
        equipItem(working, h, part, item, itemsByKey);
        const detail = enrichedItemToDetail(item);
        if (detail) refs.itemDetailById.set(String(item.key), detail);
        refreshWorkspace();
      },
      onUnequip: () => {
        const h = heroSave();
        if (h) unequipPart(working, h, part);
        refreshWorkspace();
      },
    });
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
        const def = heroDef();
        const heroData = heroSave();
        if (!def || !heroData) return;
        const key = Number(el.getAttribute('data-key'));
        const max = Number(el.getAttribute('data-max'));
        if (!canIncrementSkillAtKey(key, working, def, heroData, skillBudget())) return;
        setPassiveLevel(working, key, getPassiveLevel(working, key) + 1, max);
        syncHeroUnlocks();
        refreshWorkspace();
        return;
      }
      if (action === 'passive-dec') {
        const key = Number(el.getAttribute('data-key'));
        if (getPassiveLevel(working, key) <= 0) return;
        setPassiveLevel(working, key, getPassiveLevel(working, key) - 1, 999);
        syncHeroUnlocks();
        refreshWorkspace();
        return;
      }
      if (action === 'pick-gear') {
        openGearPicker(el.getAttribute('data-part') as HeroPart);
        return;
      }
      if (action === 'edit-sockets') {
        openSocketEditor(el.getAttribute('data-part') as HeroPart);
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
      if (field === 'build-name') buildName = (el as HTMLInputElement).value;
      if (field === 'build-desc') buildDescription = (el as HTMLInputElement).value;
      if (field === 'build-name' || field === 'build-desc') {
        updateJsonPreview();
      }
    });

    root.addEventListener('input', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-field]');
      if (!el) return;
      const field = el.getAttribute('data-field')!;
      if (field === 'build-name') buildName = (el as HTMLInputElement).value;
      if (field === 'build-desc') buildDescription = (el as HTMLInputElement).value;
      if (field === 'build-name' || field === 'build-desc') {
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
