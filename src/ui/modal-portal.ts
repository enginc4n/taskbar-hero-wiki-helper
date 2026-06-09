export const SIM_MODAL_ID = 'sim-modal';

/** Fixed overlay host on document.body so modals aren't clipped by .rpg-page overflow. */
export function ensureSimulatorModalRoot(): HTMLElement {
  let el = document.getElementById(SIM_MODAL_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = SIM_MODAL_ID;
    el.className = 'modal-root modal-root--portal';
    document.body.appendChild(el);
  }
  return el;
}

export function clearSimulatorModalRoot(): void {
  document.getElementById(SIM_MODAL_ID)?.replaceChildren();
}
