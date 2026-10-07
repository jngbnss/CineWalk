import type { PerformanceSnapshot } from '../core/PerformanceMonitor';
import { el } from './dom';

export interface PanelExtras {
  world: string;
  position: { x: number; y: number; z: number };
  loadedAssets: number;
  colliders: number;
}

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`);

/** Top-left overlay: world name + live performance numbers. Toggle details with P. */
export class PerformancePanel {
  readonly root: HTMLElement;
  private readonly worldEl: HTMLElement;
  private readonly fpsEl: HTMLElement;
  private readonly table: HTMLElement;
  private readonly cells = new Map<string, HTMLElement>();
  private expanded = true;

  constructor(parent: HTMLElement) {
    this.worldEl = el('div', { class: 'perf__world' });
    this.fpsEl = el('div', { class: 'perf__fps' });
    const rows = ['Frame time', 'Draw calls', 'Triangles', 'Geometries', 'Textures', 'Loaded assets', 'Colliders', 'Position'];
    this.table = el(
      'dl',
      { class: 'perf__table' },
      rows.flatMap((r) => {
        const dd = el('dd');
        this.cells.set(r, dd);
        return [el('dt', { text: r }), dd];
      }),
    );
    this.root = el('aside', { class: 'perf hidden' }, [this.worldEl, this.fpsEl, this.table]);
    parent.append(this.root);
  }

  setVisible(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
  }

  toggleDetails(): void {
    this.expanded = !this.expanded;
    this.table.classList.toggle('hidden', !this.expanded);
  }

  update(s: PerformanceSnapshot, x: PanelExtras): void {
    this.worldEl.textContent = x.world;
    this.fpsEl.textContent = `${Math.round(s.fps)} FPS`;
    this.fpsEl.dataset.level = s.fps >= 55 ? 'good' : s.fps >= 30 ? 'ok' : 'bad';
    if (!this.expanded) return;
    const set = (k: string, v: string) => (this.cells.get(k)!.textContent = v);
    set('Frame time', `${s.frameTimeMs.toFixed(1)} ms (cpu max ${s.frameTimeMaxMs.toFixed(1)})`);
    set('Draw calls', `${s.drawCalls}`);
    set('Triangles', fmt(s.triangles));
    set('Geometries', `${s.geometries}`);
    set('Textures', `${s.textures}`);
    set('Loaded assets', `${x.loadedAssets}`);
    set('Colliders', `${x.colliders}`);
    set('Position', `${x.position.x.toFixed(1)}, ${x.position.y.toFixed(1)}, ${x.position.z.toFixed(1)}`);
  }
}
