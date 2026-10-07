import type { POIData } from '../poi/POI';
import type { PortalData } from '../portal/Portal';
import type { MapShape, Rect } from '../worlds/World';
import { el } from './dom';

export interface MapWorldData {
  bounds: Rect;
  shapes: MapShape[];
  pois: POIData[];
  portals: PortalData[];
}

export interface PlayerMapState {
  x: number;
  y: number;
  z: number;
  /** Facing direction on the XZ plane (unit vector). */
  headingX: number;
  headingZ: number;
  visited: ReadonlySet<string>;
  activePoi: string | null;
}

/**
 * Anything that can show the player on a map. The canvas minimap below is the
 * default; a MapLibre GL / OpenStreetMap implementation for real-world places
 * would convert world metres → lng/lat with a per-world geo anchor.
 */
export interface MapView {
  setWorld(data: MapWorldData): void;
  update(state: PlayerMapState, t: number): void;
  setVisible(v: boolean): void;
}

/** Player-centred, north-up 2D canvas minimap. */
export class CanvasMiniMap implements MapView {
  readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private data: MapWorldData | null = null;
  private readonly size = 184;
  private readonly radiusMetres = 42;

  constructor(parent: HTMLElement) {
    this.canvas = el('canvas', { class: 'minimap__canvas' });
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = this.canvas.height = this.size * dpr;
    this.canvas.style.width = this.canvas.style.height = `${this.size}px`;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.root = el('div', { class: 'minimap hidden' }, [this.canvas, el('span', { class: 'minimap__n', text: 'N' })]);
    parent.append(this.root);
  }

  setWorld(data: MapWorldData): void {
    this.data = data;
  }

  setVisible(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
  }

  update(p: PlayerMapState, t: number): void {
    const { ctx, size, data } = this;
    if (!data) return;
    const half = size / 2;
    const k = half / this.radiusMetres;
    const tx = (x: number) => half + (x - p.x) * k;
    const tz = (z: number) => half + (z - p.z) * k;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(8,10,16,0.82)';
    ctx.fillRect(0, 0, size, size);

    // Only draw geometry on the player's level (so the lab doesn't clutter the lounge).
    const onLevel = (s: MapShape) => s.maxY > p.y - 0.5 && s.minY < p.y + 2.5;
    const styles: Record<MapShape['kind'], string> = {
      floor: 'rgba(255,255,255,0.07)',
      water: 'rgba(70,200,230,0.45)',
      wall: 'rgba(230,230,240,0.55)',
      object: 'rgba(230,230,240,0.3)',
    };
    for (const kind of ['floor', 'water', 'object', 'wall'] as const) {
      ctx.fillStyle = styles[kind];
      for (const s of data.shapes) {
        if (s.kind !== kind || !onLevel(s)) continue;
        ctx.beginPath();
        s.points.forEach(([x, z], i) => (i ? ctx.lineTo(tx(x), tz(z)) : ctx.moveTo(tx(x), tz(z))));
        ctx.closePath();
        ctx.fill();
      }
    }

    const clampToEdge = (x: number, z: number): [number, number, boolean] => {
      const dx = tx(x) - half;
      const dz = tz(z) - half;
      const d = Math.hypot(dx, dz);
      const max = half - 9;
      return d > max ? [half + (dx / d) * max, half + (dz / d) * max, true] : [half + dx, half + dz, false];
    };

    for (const portal of data.portals) {
      const [x, z, edge] = clampToEdge(portal.position[0], portal.position[2]);
      const pulse = 5 + Math.sin(t * 3) * 1.5;
      ctx.strokeStyle = `#${portal.color.toString(16).padStart(6, '0')}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, z, edge ? 4 : pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const poi of data.pois) {
      if (Math.abs(poi.position[1] - p.y) > 3) continue;
      const [x, z, edge] = clampToEdge(poi.position[0], poi.position[2]);
      const visited = p.visited.has(poi.id);
      ctx.fillStyle = poi.id === p.activePoi ? '#ffffff' : visited ? 'rgba(243,201,107,0.45)' : '#f3c96b';
      ctx.beginPath();
      const r = edge ? 2.5 : 4;
      ctx.moveTo(x, z - r);
      ctx.lineTo(x + r, z);
      ctx.lineTo(x, z + r);
      ctx.lineTo(x - r, z);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Player arrow.
    const a = Math.atan2(p.headingX, -p.headingZ);
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(a);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(half, half, half - 1, 0, Math.PI * 2);
    ctx.stroke();
  }
}
