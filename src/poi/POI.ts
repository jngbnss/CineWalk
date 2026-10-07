import * as THREE from 'three';

export type Vec3 = [number, number, number];

/** A point of interest. Pure data — also feeds the AI guide's knowledge. */
export interface POIData {
  id: string;
  name: string;
  /** One-liner shown on the POI card. */
  description: string;
  /** Ground position of the trigger (feet level). */
  position: Vec3;
  /** Trigger radius in metres. */
  radius: number;
  /** Extra material the guide can draw on. */
  facts?: string[];
  story?: string;
}

const GOLD = new THREE.Color(0xf3c96b);
const DIM = new THREE.Color(0x7d8794);

/** Floating diamond + ground ring marking a POI. */
export class POIMarker {
  readonly object = new THREE.Group();
  private readonly gem: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly gemMat: THREE.MeshBasicMaterial;
  private readonly ringMat: THREE.MeshBasicMaterial;

  constructor(readonly data: POIData, accent = GOLD) {
    this.gemMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9 });
    this.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), this.gemMat);
    this.gem.position.y = 2.7;
    this.gem.scale.y = 1.6;

    this.ringMat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 48), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.04;

    this.object.add(this.gem, this.ring);
    this.object.position.set(...data.position);
    this.object.name = `poi:${data.id}`;
  }

  update(t: number, active: boolean): void {
    this.gem.rotation.y = t * 1.4;
    this.gem.position.y = 2.7 + Math.sin(t * 2 + this.object.position.x) * 0.12;
    const s = active ? 1.6 + Math.sin(t * 4) * 0.08 : 1;
    this.ring.scale.setScalar(s);
    this.ringMat.opacity = active ? 0.7 : 0.35;
  }

  markVisited(): void {
    this.gemMat.color.copy(DIM);
    this.gemMat.opacity = 0.55;
  }
}
