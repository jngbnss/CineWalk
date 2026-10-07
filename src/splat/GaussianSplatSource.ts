import type * as THREE from 'three';
import type { SceneSource } from '../core/SceneSource';
import { parseSplatBuffer, PointCloudSplatRenderer, type GaussianSplatRenderer } from './GaussianSplatRenderer';

/**
 * SceneSource for Gaussian Splat captures (COLMAP → Nerfstudio/gsplat → SuperSplat → `.splat`).
 * Interchangeable with GLTFSceneSource, so a world can do:
 *
 *   const scene = await ctx.sceneLoader.load(
 *     new GaussianSplatSource(`${import.meta.env.BASE_URL}assets/splats/vienna.splat`),
 *     new GLTFSceneSource(ctx.assets, 'vienna/proxy.glb'), // fallback
 *   );
 *
 * Physics: splats have no collision. Pair them with a low-poly proxy mesh
 * (exported from the same COLMAP reconstruction) and build colliders from that.
 */
export class GaussianSplatSource implements SceneSource {
  private object: THREE.Object3D | null = null;

  constructor(readonly url: string, readonly renderer: GaussianSplatRenderer = new PointCloudSplatRenderer()) {}

  get id(): string {
    return `splat:${this.url}`;
  }

  async load(): Promise<THREE.Object3D> {
    if (!/\.splat$/i.test(this.url)) {
      throw new Error(`${this.url}: only .splat is supported by the built-in parser — plug a renderer that handles .ply/.spz/.ksplat.`);
    }
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`${this.url}: HTTP ${res.status}`);
    const data = parseSplatBuffer(await res.arrayBuffer());
    this.object = this.renderer.createObject(data);
    return this.object;
  }

  dispose(): void {
    this.object?.removeFromParent();
    this.renderer.dispose();
    this.object = null;
  }
}
