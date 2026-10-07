import { el, show } from './dom';

/** "Travel to X?" confirmation shown when the player walks into a portal. */
export class PortalDialog {
  readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private onYes: () => void = () => {};
  private onNo: () => void = () => {};

  constructor(parent: HTMLElement) {
    this.title = el('h2');
    const yes = el('button', { class: 'btn btn--primary', type: 'button', text: 'YES' });
    const no = el('button', { class: 'btn', type: 'button', text: 'Not yet' });
    yes.addEventListener('click', () => this.onYes());
    no.addEventListener('click', () => this.onNo());
    this.root = el('div', { class: 'modal hidden', role: 'dialog', 'aria-modal': 'true' }, [
      el('div', { class: 'modal__card' }, [
        el('span', { class: 'modal__kicker', text: 'Portal' }),
        this.title,
        el('div', { class: 'modal__actions' }, [yes, no]),
        el('p', { class: 'modal__hint', text: 'Enter / Y = travel · N / Esc = stay' }),
      ]),
    ]);
    parent.append(this.root);
  }

  get visible(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(label: string, onYes: () => void, onNo: () => void): void {
    this.title.textContent = `Travel to ${label}?`;
    this.onYes = onYes;
    this.onNo = onNo;
    show(this.root, true);
  }

  close(): void {
    show(this.root, false);
  }

  /** Keyboard shortcuts while open. Returns true if handled. */
  handleKey(code: string): boolean {
    if (!this.visible) return false;
    if (code === 'Enter' || code === 'KeyY') this.onYes();
    else if (code === 'KeyN' || code === 'Escape') this.onNo();
    else return false;
    return true;
  }
}

/** Esc menu. */
export class PauseMenu {
  readonly root: HTMLElement;
  private readonly title: HTMLElement;

  constructor(parent: HTMLElement, onResume: () => void, onExit: () => void) {
    this.title = el('h2', { text: 'Paused' });
    const resume = el('button', { class: 'btn btn--primary', type: 'button', text: 'Resume' });
    const exit = el('button', { class: 'btn', type: 'button', text: 'Choose another world' });
    resume.addEventListener('click', onResume);
    exit.addEventListener('click', onExit);
    this.root = el('div', { class: 'modal modal--soft hidden' }, [
      el('div', { class: 'modal__card' }, [
        el('span', { class: 'modal__kicker', text: 'CineWalk' }),
        this.title,
        el('div', { class: 'modal__actions' }, [resume, exit]),
        el('ul', { class: 'keys' }, [
          ...[
            ['W A S D', 'Move'],
            ['Mouse', 'Look'],
            ['Shift', 'Run'],
            ['Space', 'Jump'],
            ['Enter', 'Talk to the guide'],
            ['P', 'Toggle stats'],
            ['`', 'Debug panel'],
            ['Esc', 'Menu'],
          ].map(([k, v]) => el('li', {}, [el('kbd', { text: k }), el('span', { text: v })])),
        ]),
      ]),
    ]);
    parent.append(this.root);
  }

  open(title = 'Paused'): void {
    this.title.textContent = title;
    show(this.root, true);
  }

  close(): void {
    show(this.root, false);
  }
}
