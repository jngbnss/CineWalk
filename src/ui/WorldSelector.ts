import type { WorldInfo } from '../worlds/World';
import { el, show } from './dom';

/** Title screen with one card per registered world. */
export class WorldSelector {
  readonly root: HTMLElement;

  constructor(parent: HTMLElement, worlds: WorldInfo[], onSelect: (id: string) => void) {
    const cards = worlds.map((w) => {
      const card = el('button', { class: 'world-card', type: 'button', 'aria-label': `Enter ${w.name}` }, [
        el('div', { class: 'world-card__art' }),
        el('div', { class: 'world-card__body' }, [
          el('h2', { text: w.name }),
          el('p', { text: w.tagline }),
          el('span', { class: 'world-card__cta', text: 'Enter world →' }),
        ]),
      ]);
      (card.querySelector('.world-card__art') as HTMLElement).style.background = w.cardArt;
      card.style.setProperty('--accent', w.accent);
      card.addEventListener('click', () => onSelect(w.id));
      return card;
    });

    this.root = el('section', { class: 'selector' }, [
      el('div', { class: 'selector__inner' }, [
        el('h1', { class: 'brand', text: 'CINEWALK' }),
        el('p', { class: 'selector__tagline', text: 'Walk into another world.' }),
        el('div', { class: 'selector__cards' }, cards),
        el('p', {
          class: 'selector__hint',
          text: 'WASD move · Mouse look · Shift run · Space jump · Enter talk to guide · Esc menu',
        }),
      ]),
    ]);
    parent.append(this.root);
  }

  setVisible(v: boolean): void {
    show(this.root, v);
  }
}
