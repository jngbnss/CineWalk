import * as THREE from 'three';

/** Decoded Gaussian splats (antimatter15 `.splat` layout: 32 bytes per splat). */
export interface SplatData {
  count: number;
  positions: Float32Array; // xyz
  scales: Float32Array; // xyz
  colors: Uint8Array; // rgba
  rotations: Uint8Array; // quaternion, 0..255 → -1..1
}

/**
 * Turns splat data into something drawable. The default implementation is a
 * point-cloud preview; a full renderer (sorted, alpha-blended ellipsoids) can be
 * dropped in — e.g. wrapping @mkkellogg/gaussian-splats-3d or Spark — without
 * changing GaussianSplatSource or any World code.
 */
export interface GaussianSplatRenderer {
  readonly name: string;
  createObject(data: SplatData): THREE.Object3D;
  /** Per-frame hook, e.g. depth-sorting splats for the current camera. */
  update?(camera: THREE.Camera): void;
  dispose(): void;
}

export function parseSplatBuffer(buffer: ArrayBuffer): SplatData {
  const ROW = 32;
  const count = Math.floor(buffer.byteLength / ROW);
  const f = new Float32Array(buffer, 0, Math.floor(buffer.byteLength / 4));
  const u = new Uint8Array(buffer);
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);
  const colors = new Uint8Array(count * 4);
  const rotations = new Uint8Array(count * 4);
  for (let i = 0; i < count; i++) {
    positions.set(f.subarray(i * 8, i * 8 + 3), i * 3);
    scales.set(f.subarray(i * 8 + 3, i * 8 + 6), i * 3);
    colors.set(u.subarray(i * ROW + 24, i * ROW + 28), i * 4);
    rotations.set(u.subarray(i * ROW + 28, i * ROW + 32), i * 4);
  }
  return { count, positions, scales, colors, rotations };
}

/** Cheap preview: one coloured point per splat centre. Good for layout & scale checks. */
export class PointCloudSplatRenderer implements GaussianSplatRenderer {
  readonly name = 'point-cloud preview';
  private readonly owned: { dispose(): void }[] = [];

  constructor(private readonly pointSize = 0.02) {}

  createObject(data: SplatData): THREE.Object3D {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    const colors = new Float32Array(data.count * 3);
    for (let i = 0; i < data.count; i++) {
      colors[i * 3] = data.colors[i * 4] / 255;
      colors[i * 3 + 1] = data.colors[i * 4 + 1] / 255;
      colors[i * 3 + 2] = data.colors[i * 4 + 2] / 255;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: this.pointSize, vertexColors: true });
    this.owned.push(geo, mat);
    const points = new THREE.Points(geo, mat);
    points.name = 'splat-preview';
    return points;
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
  }
}
