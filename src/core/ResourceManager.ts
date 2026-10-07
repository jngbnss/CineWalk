import * as THREE from 'three';

type Disposable = { dispose(): void };

/**
 * Tracks GPU resources so a world can release everything it created on unload.
 * `disposeObject` walks a scene graph and frees geometries, materials and every
 * texture they reference (including ShaderMaterial uniforms).
 */
export class ResourceManager {
  private readonly items = new Set<Disposable>();

  track<T extends Disposable>(resource: T): T {
    this.items.add(resource);
    return resource;
  }

  get size(): number {
    return this.items.size;
  }

  disposeAll(): void {
    for (const r of this.items) r.dispose();
    this.items.clear();
  }

  static disposeObject(root: THREE.Object3D): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) for (const m of Array.isArray(mat) ? mat : [mat]) materials.add(m);
      const light = obj as THREE.DirectionalLight;
      if (light.isLight && light.shadow?.map) light.shadow.dispose();
    });

    for (const m of materials) {
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value);
      const uniforms = (m as THREE.ShaderMaterial).uniforms;
      if (uniforms) for (const u of Object.values(uniforms)) if (u?.value instanceof THREE.Texture) textures.add(u.value);
    }

    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  }
}
