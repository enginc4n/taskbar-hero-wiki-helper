type ActiveTooltip = {
  tip: HTMLElement;
  parent: HTMLElement;
  anchor: HTMLElement;
};

let active: ActiveTooltip | null = null;

function positionFloatingTooltip(anchor: HTMLElement, tip: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const gap = 10;
  const margin = 12;

  tip.style.position = 'fixed';
  tip.style.zIndex = '10001';
  tip.style.bottom = 'auto';
  tip.style.right = 'auto';
  tip.style.transform = 'none';
  tip.style.left = '-9999px';
  tip.style.top = '0';

  const tipRect = tip.getBoundingClientRect();
  let top = rect.top - gap - tipRect.height;
  if (top < margin) {
    top = rect.bottom + gap;
  }

  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function clearActive(): void {
  if (!active) return;
  const { tip, parent } = active;
  tip.classList.remove('is-visible', 'is-floating');
  tip.removeAttribute('style');
  parent.appendChild(tip);
  active = null;
}

function showForWrap(wrap: HTMLElement): void {
  const tip = wrap.querySelector('.rpg-tooltip.gear-tooltip') as HTMLElement | null;
  if (!tip) return;

  const anchor = (wrap.querySelector('.game-slot') as HTMLElement | null) ?? wrap;
  if (active?.tip === tip) {
    positionFloatingTooltip(anchor, tip);
    return;
  }

  clearActive();
  document.body.appendChild(tip);
  tip.classList.add('is-floating');
  active = { tip, parent: wrap, anchor };
  positionFloatingTooltip(anchor, tip);
  tip.classList.add('is-visible');
}

function wrapFromEventTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const wrap = target.closest('.game-slot-wrap.is-filled');
  if (!wrap?.querySelector('.gear-tooltip')) return null;
  return wrap as HTMLElement;
}

function initGearSlotTooltips(): void {
  document.addEventListener(
    'mouseover',
    (e) => {
      const wrap = wrapFromEventTarget(e.target);
      if (!wrap) return;
      const from = (e as MouseEvent).relatedTarget;
      if (from instanceof Node && wrap.contains(from)) return;
      showForWrap(wrap);
    },
    true,
  );

  document.addEventListener(
    'mouseout',
    (e) => {
      if (!active) return;
      const wrap = (e.target as Element | null)?.closest?.('.game-slot-wrap');
      if (!wrap || wrap !== active.parent) return;
      const to = (e as MouseEvent).relatedTarget;
      if (to instanceof Node && wrap.contains(to)) return;
      clearActive();
    },
    true,
  );

  document.addEventListener('focusin', (e) => {
    const wrap = wrapFromEventTarget(e.target);
    if (wrap) showForWrap(wrap);
  });

  document.addEventListener('focusout', (e) => {
    if (!active) return;
    const wrap = (e.target as Element | null)?.closest?.('.game-slot-wrap');
    if (wrap !== active.parent) return;
    const next = (e as FocusEvent).relatedTarget;
    if (next instanceof Node && wrap.contains(next)) return;
    clearActive();
  });

  window.addEventListener(
    'scroll',
    () => {
      if (!active) return;
      positionFloatingTooltip(active.anchor, active.tip);
    },
    true,
  );

  window.addEventListener('resize', () => {
    if (!active) return;
    positionFloatingTooltip(active.anchor, active.tip);
  });
}

let bound = false;

export function ensureGearSlotTooltips(): void {
  if (bound) return;
  bound = true;
  initGearSlotTooltips();
}
