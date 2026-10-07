import type * as THREE from 'three';
import type { AssetLoader } from './AssetLoader';
import { GLTFSceneSource, ProceduralSceneSource, type SceneSource } from './SceneSource';

/**
 * Loads SceneSources with graceful fallback. A missing or broken asset never
 * breaks a world — the procedural fallback is used instead.
 */
export class SceneLoader {
  private readonly active = new Set<SceneSource>();

  constructor(private readonly assets: AssetLoader) {}

  async load(source: SceneSource, fallback?: SceneSource): Promise<THREE.Object3D> {
    try {
      const obj = await source.load();
      this.active.add(source);
      return obj;
    } catch (err) {
      if (!fallback) throw err;
      console.warn(`[SceneLoader] ${source.id} failed, using ${fallback.id}`, err);
      return this.load(fallback);
    }
  }

  /** Uses the glTF at `path` if the manifest lists it, otherwise the procedural factory. */
  loadOptional(path: string, factory: () => THREE.Object3D): Promise<THREE.Object3D> {
    const procedural = new ProceduralSceneSource(`procedural:${path}`, factory);
    if (!this.assets.has(path)) return this.load(procedural);
    return this.load(new GLTFSceneSource(this.assets, path), procedural);
  }

  disposeAll(): void {
    for (const s of this.active) s.dispose();
    this.active.clear();
  }
}
