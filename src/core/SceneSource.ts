import * as THREE from 'three';
import type { AssetLoader } from './AssetLoader';
import { ResourceManager } from './ResourceManager';

/**
 * Anything that can produce a renderable Object3D.
 * Implementations: GLTFSceneSource, ProceduralSceneSource, GaussianSplatSource,
 * and in future CesiumSceneSource (3D Tiles), PlayCanvas/SuperSplat exports, …
 */
export interface SceneSource {
  readonly id: string;
  load(): Promise<THREE.Object3D>;
  dispose(): void;
}

export class GLTFSceneSource implements SceneSource {
  private object: THREE.Object3D | null = null;

  constructor(
    private readonly assets: AssetLoader,
    readonly path: string,
    private readonly opts: { castShadow?: boolean; receiveShadow?: boolean } = {},
  ) {}

  get id(): string {
    return `gltf:${this.path}`;
  }

  async load(): Promise<THREE.Object3D> {
    const gltf = await this.assets.loadGLTF(this.path);
    const object = gltf.scene.clone(true);
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = this.opts.castShadow ?? true;
        mesh.receiveShadow = this.opts.receiveShadow ?? true;
      }
    });
    this.object = object;
    return object;
  }

  dispose(): void {
    if (this.object) ResourceManager.disposeObject(this.object);
    this.object = null;
  }
}

/** Wraps a code-built object so it is interchangeable with downloaded assets. */
export class ProceduralSceneSource implements SceneSource {
  private object: THREE.Object3D | null = null;

  constructor(readonly id: string, private readonly factory: () => THREE.Object3D) {}

  async load(): Promise<THREE.Object3D> {
    this.object = this.factory();
    return this.object;
  }

  dispose(): void {
    if (this.object) ResourceManager.disposeObject(this.object);
    this.object = null;
  }
}
