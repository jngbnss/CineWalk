import { el, show } from './dom';

const SUGGESTIONS = ['What is this place?', 'Tell me a story', 'Where should I go next?'];

/** Bottom chat strip for the AI guide. */
export class GuidePanel {
  readonly root: HTMLElement;
  private readonly log: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly context: HTMLElement;
  private readonly providerEl: HTMLElement;
  private busy = false;

  /** Called when the user submits a question. */
  onAsk: (question: string) => Promise<string> = async () => '';
  /** Called when the user leaves the chat (Esc / blur). */
  onClose: () => void = () => {};

  constructor(parent: HTMLElement) {
    this.log = el('div', { class: 'guide__log', 'aria-live': 'polite' });
    this.input = el('input', {
      class: 'guide__input',
      type: 'text',
      placeholder: 'Ask the guide…  (Enter to send · empty Enter to close)',
      maxlength: '240',
      'aria-label': 'Ask the guide',
    });
    this.context = el('span', { class: 'guide__context' });
    this.providerEl = el('span', { class: 'guide__provider' });
    const chips = el(
      'div',
      { class: 'guide__chips' },
      SUGGESTIONS.map((s) => {
        const b = el('button', { class: 'chip', type: 'button', text: s });
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => void this.submit(s));
        return b;
      }),
    );
    this.root = el('section', { class: 'guide hidden' }, [
      el('header', { class: 'guide__header' }, [el('strong', { text: 'AI Guide' }), this.context, this.providerEl]),
      this.log,
      chips,
      this.input,
    ]);
    parent.append(this.root);

    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const q = this.input.value.trim();
        if (q) void this.submit(q);
        else this.input.blur(); // empty Enter returns to walking
      } else if (e.key === 'Escape') {
        this.input.blur();
      }
    });
    this.input.addEventListener('blur', () => {
      this.root.classList.remove('guide--open');
      this.onClose();
    });
  }

  setVisible(v: boolean): void {
    show(this.root, v);
  }

  setProvider(name: string): void {
    this.providerEl.textContent = name;
  }

  setContext(worldName: string, poiName: string | null): void {
    this.context.textContent = poiName ? `${worldName} · ${poiName}` : worldName;
  }

  get isOpen(): boolean {
    return document.activeElement === this.input;
  }

  open(): void {
    this.root.classList.add('guide--open');
    this.input.focus();
  }

  clear(): void {
    this.log.replaceChildren();
  }

  say(who: 'user' | 'guide', text: string): HTMLElement {
    const line = el('p', { class: `guide__msg guide__msg--${who}` }, [
      el('b', { text: who === 'user' ? 'You' : 'Guide' }),
      el('span', { text }),
    ]);
    this.log.append(line);
    while (this.log.children.length > 30) this.log.firstElementChild?.remove();
    this.log.scrollTop = this.log.scrollHeight;
    return line;
  }

  private async submit(question: string): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.input.value = '';
    this.say('user', question);
    const pending = this.say('guide', '…');
    try {
      const answer = await this.onAsk(question);
      (pending.lastElementChild as HTMLElement).textContent = answer;
    } catch {
      (pending.lastElementChild as HTMLElement).textContent = 'Sorry — I lost my train of thought.';
    } finally {
      this.busy = false;
      this.log.scrollTop = this.log.scrollHeight;
    }
  }
}
