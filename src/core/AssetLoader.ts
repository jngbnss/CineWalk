import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { LoadingManager } from './LoadingManager';

export interface AssetManifestEntry {
  path: string;
  title?: string;
  author?: string;
  source?: string;
  license?: string;
}

/**
 * glTF/GLB loading with an in-memory cache and an optional asset manifest.
 *
 * Only assets listed in `public/assets/manifest.json` are requested, so a world
 * can reference "nice to have" models without ever 404-ing when they are absent.
 * Hook points for compressed assets: `gltf.setDRACOLoader()`, `setKTX2Loader()`,
 * `setMeshoptDecoder()` — see README › Performance.
 */
export class AssetLoader {
  readonly gltf: GLTFLoader;
  private readonly cache = new Map<string, Promise<GLTF>>();
  private manifest = new Map<string, AssetManifestEntry>();
  private loaded = 0;

  constructor(loading: LoadingManager, private readonly baseUrl = `${import.meta.env.BASE_URL}assets/`) {
    this.gltf = new GLTFLoader(loading.three);
  }

  async loadManifest(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}manifest.json`, { cache: 'no-cache' });
      if (!res.ok) return;
      const json = (await res.json()) as { assets?: AssetManifestEntry[] };
      this.manifest = new Map((json.assets ?? []).map((a) => [a.path, a]));
    } catch {
      // No manifest → procedural-only mode. Never fatal.
    }
  }

  has(path: string): boolean {
    return this.manifest.has(path);
  }

  get entries(): AssetManifestEntry[] {
    return [...this.manifest.values()];
  }

  /** Number of network assets currently held in the cache. */
  get loadedCount(): number {
    return this.loaded;
  }

  loadGLTF(path: string): Promise<GLTF> {
    let p = this.cache.get(path);
    if (!p) {
      p = this.gltf.loadAsync(this.baseUrl + path).then((g) => {
        this.loaded++;
        return g;
      });
      p.catch(() => this.cache.delete(path));
      this.cache.set(path, p);
    }
    return p;
  }

  /** Called on world change — GPU copies are freed by the world, CPU copies here. */
  clearCache(): void {
    this.cache.clear();
    this.loaded = 0;
  }
}
