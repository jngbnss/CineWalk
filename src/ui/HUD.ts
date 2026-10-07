import type { POIData } from '../poi/POI';
import { el, show } from './dom';

/** Crosshair, POI card, toasts, hints and the loading overlay. */
export class HUD {
  readonly root: HTMLElement;
  private readonly crosshair: HTMLElement;
  private readonly poiCard: HTMLElement;
  private readonly poiTitle: HTMLElement;
  private readonly poiText: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly loading: HTMLElement;
  private readonly loadingLabel: HTMLElement;
  private readonly loadingBar: HTMLElement;
  private toastTimer = 0;

  constructor(parent: HTMLElement) {
    this.crosshair = el('div', { class: 'crosshair' });
    this.poiTitle = el('h3');
    this.poiText = el('p');
    this.poiCard = el('div', { class: 'poi-card hidden' }, [
      el('span', { class: 'poi-card__kicker', text: 'Point of interest' }),
      this.poiTitle,
      this.poiText,
      el('span', { class: 'poi-card__ask', text: 'Press Enter to ask the guide' }),
    ]);
    this.toastEl = el('div', { class: 'toast hidden' });
    this.hint = el('div', { class: 'controls-hint', text: 'WASD move · Shift run · Space jump · Enter guide · Esc menu' });
    this.loadingLabel = el('p', { class: 'loading__label', text: 'Loading…' });
    this.loadingBar = el('div', { class: 'loading__bar-fill' });
    this.loading = el('div', { class: 'loading hidden' }, [
      el('div', { class: 'brand brand--small', text: 'CINEWALK' }),
      this.loadingLabel,
      el('div', { class: 'loading__bar' }, [this.loadingBar]),
    ]);
    this.root = el('div', { class: 'hud hidden' }, [this.crosshair, this.poiCard, this.toastEl, this.hint]);
    parent.append(this.root, this.loading);
  }

  setVisible(v: boolean): void {
    show(this.root, v);
  }

  setCrosshair(v: boolean): void {
    show(this.crosshair, v);
  }

  showPOI(poi: POIData | null): void {
    if (!poi) {
      this.poiCard.classList.add('hidden');
      return;
    }
    this.poiTitle.textContent = poi.name;
    this.poiText.textContent = `“${poi.description}”`;
    this.poiCard.classList.remove('hidden');
  }

  toast(text: string, ms = 2600): void {
    this.toastEl.textContent = text;
    show(this.toastEl, true);
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => show(this.toastEl, false), ms);
  }

  setLoading(visible: boolean, progress = 0, label = ''): void {
    show(this.loading, visible);
    if (label) this.loadingLabel.textContent = label;
    this.loadingBar.style.transform = `scaleX(${Math.max(0.02, progress)})`;
  }
}
