import * as THREE from 'three';
import { POIMarker, type POIData } from './POI';

export interface POIChange {
  entered: POIData | null;
  left: POIData | null;
}

/** Proximity detection, visited state and markers for a world's POIs. */
export class POIManager {
  readonly visited = new Set<string>();
  private readonly markers: POIMarker[];
  private active: POIMarker | null = null;
  private readonly tmp = new THREE.Vector3();

  constructor(pois: POIData[], parent: THREE.Object3D) {
    this.markers = pois.map((p) => new POIMarker(p));
    for (const m of this.markers) parent.add(m.object);
  }

  get current(): POIData | null {
    return this.active?.data ?? null;
  }

  get all(): POIData[] {
    return this.markers.map((m) => m.data);
  }

  update(t: number, feet: THREE.Vector3): POIChange {
    let best: POIMarker | null = null;
    let bestDist = Infinity;
    for (const m of this.markers) {
      // Vertical distance counts double so stacked floors (e.g. a lab under a lounge) don't bleed.
      this.tmp.set(...m.data.position).sub(feet);
      this.tmp.y *= 2;
      const d = this.tmp.length();
      if (d < m.data.radius && d < bestDist) {
        best = m;
        bestDist = d;
      }
    }
    for (const m of this.markers) m.update(t, m === best);

    if (best === this.active) return { entered: null, left: null };
    const left = this.active?.data ?? null;
    this.active = best;
    if (best && !this.visited.has(best.data.id)) {
      this.visited.add(best.data.id);
      best.markVisited();
    }
    return { entered: best?.data ?? null, left };
  }
}
