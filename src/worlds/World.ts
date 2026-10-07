import * as THREE from 'three';
import type { AssetLoader } from '../core/AssetLoader';
import type { LoadingManager } from '../core/LoadingManager';
import type { Renderer } from '../core/Renderer';
import { ResourceManager } from '../core/ResourceManager';
import type { SceneLoader } from '../core/SceneLoader';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { POIData } from '../poi/POI';
import type { PortalData } from '../portal/Portal';

export type Vec3 = [number, number, number];

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Static description of a world. Available before (and without) loading it. */
export interface WorldInfo {
  id: string;
  name: string;
  tagline: string;
  /** Short paragraph used by the AI guide when no POI is nearby. */
  summary: string;
  /** CSS background for the selector card. */
  cardArt: string;
  accent: string;
  spawn: { position: Vec3; yaw: number };
  bounds: Rect;
  pois: POIData[];
  portals: PortalData[];
}

export interface WorldContext {
  scene: THREE.Scene;
  renderer: Renderer;
  physics: PhysicsWorld;
  assets: AssetLoader;
  sceneLoader: SceneLoader;
  loading: LoadingManager;
}

export interface MapShape {
  points: [number, number][];
  minY: number;
  maxY: number;
  kind: 'wall' | 'floor' | 'water' | 'object';
}

export interface BoxOptions {
  collider?: boolean;
  /** Euler rotation in radians. Colliders honour it too. */
  rotation?: Vec3;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Record the footprint on the minimap (default: true for colliders ≥ 0.8 m tall). */
  map?: MapShape['kind'] | false;
}

type Updater = (dt: number, t: number) => void;

/**
 * Base class for every world. Subclasses implement `build()` using the helpers
 * below, which create meshes and matching Rapier colliders in one call.
 *
 * Adding a world: subclass, describe it with a WorldInfo, register it in
 * worlds/registry.ts. GLTF, Gaussian-splat or Cesium-tile worlds use the same
 * contract — `build()` just loads a SceneSource instead of primitives.
 */
export abstract class World {
  abstract readonly info: WorldInfo;
  readonly root = new THREE.Group();
  readonly mapShapes: MapShape[] = [];
  protected readonly resources = new ResourceManager();
  protected ctx!: WorldContext;
  private readonly updaters: Updater[] = [];
  private readonly geoCache = new Map<string, THREE.BufferGeometry>();

  async load(ctx: WorldContext): Promise<void> {
    this.ctx = ctx;
    this.root.name = `world:${this.info.id}`;
    await this.build(ctx);
    this.freezeStatic();
  }

  protected abstract build(ctx: WorldContext): Promise<void>;

  update(dt: number, t: number): void {
    for (const u of this.updaters) u(dt, t);
  }

  dispose(): void {
    this.updaters.length = 0;
    ResourceManager.disposeObject(this.root);
    this.resources.disposeAll();
    this.geoCache.clear();
    this.root.clear();
  }

  // ───────────────────────── helpers ─────────────────────────

  /** Registers a per-frame callback. `obj` (if given) keeps its matrix auto-updating. */
  protected animate(obj: THREE.Object3D | null, fn: Updater): void {
    if (obj) obj.userData.dynamic = true;
    this.updaters.push(fn);
  }

  protected std(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    return this.resources.track(new THREE.MeshStandardMaterial(params));
  }

  protected tex<T extends THREE.Texture>(t: T): T {
    return this.resources.track(t);
  }

  protected add<T extends THREE.Object3D>(obj: T, parent: THREE.Object3D = this.root): T {
    parent.add(obj);
    return obj;
  }

  /** Box centred at `pos`. UVs are in metres so tiling textures stay consistent. */
  protected box(size: Vec3, pos: Vec3, material: THREE.Material, opts: BoxOptions = {}): THREE.Mesh {
    const mesh = new THREE.Mesh(this.boxGeometry(...size), material);
    mesh.position.set(...pos);
    if (opts.rotation) mesh.rotation.set(...opts.rotation);
    mesh.castShadow = opts.castShadow ?? true;
    mesh.receiveShadow = opts.receiveShadow ?? true;
    this.root.add(mesh);
    if (opts.collider) this.solid(size, pos, opts.rotation, opts.map);
    else if (opts.map) this.recordShape(size, pos, opts.rotation?.[1] ?? 0, opts.map);
    return mesh;
  }

  /** Invisible collider. */
  protected solid(size: Vec3, pos: Vec3, rotation?: Vec3, map?: MapShape['kind'] | false): void {
    const q = rotation ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)) : undefined;
    this.ctx.physics.addBox([size[0] / 2, size[1] / 2, size[2] / 2], pos, q);
    const kind = map ?? (size[1] >= 0.8 ? 'wall' : false);
    if (kind) this.recordShape(size, pos, rotation?.[1] ?? 0, kind);
  }

  protected cylinder(
    radius: number,
    height: number,
    pos: Vec3,
    material: THREE.Material,
    opts: { collider?: boolean; radiusTop?: number; segments?: number; castShadow?: boolean } = {},
  ): THREE.Mesh {
    const geo = this.resources.track(
      new THREE.CylinderGeometry(opts.radiusTop ?? radius, radius, height, opts.segments ?? 24),
    );
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(...pos);
    mesh.castShadow = opts.castShadow ?? true;
    mesh.receiveShadow = true;
    this.root.add(mesh);
    if (opts.collider) {
      this.ctx.physics.addCylinder(height / 2, Math.max(radius, opts.radiusTop ?? radius), pos);
      this.recordShape([radius * 2, height, radius * 2], pos, 0, 'object');
    }
    return mesh;
  }

  /** Invisible upright cylinder collider (round props, turntables, trunks). */
  protected solidCylinder(radius: number, height: number, pos: Vec3): void {
    this.ctx.physics.addCylinder(height / 2, radius, pos);
    this.recordShape([radius * 2, height, radius * 2], pos, 0, 'object');
  }

  /** Horizontal slab (ground / floor) with an optional rectangular hole. */
  protected slab(
    outer: Rect,
    hole: Rect | null,
    topY: number,
    thickness: number,
    material: THREE.Material | null,
    collider = true,
  ): void {
    const parts: Rect[] = !hole
      ? [outer]
      : [
          { minX: outer.minX, maxX: outer.maxX, minZ: outer.minZ, maxZ: hole.minZ },
          { minX: outer.minX, maxX: outer.maxX, minZ: hole.maxZ, maxZ: outer.maxZ },
          { minX: outer.minX, maxX: hole.minX, minZ: hole.minZ, maxZ: hole.maxZ },
          { minX: hole.maxX, maxX: outer.maxX, minZ: hole.minZ, maxZ: hole.maxZ },
        ];
    for (const r of parts) {
      const w = r.maxX - r.minX;
      const d = r.maxZ - r.minZ;
      if (w <= 0 || d <= 0) continue;
      const size: Vec3 = [w, thickness, d];
      const pos: Vec3 = [(r.minX + r.maxX) / 2, topY - thickness / 2, (r.minZ + r.maxZ) / 2];
      // Slabs cast shadows so sunlight never leaks into rooms below ground.
      if (material) this.box(size, pos, material, { collider, map: false });
      else if (collider) this.solid(size, pos, undefined, false);
    }
  }

  /**
   * Solid staircase along Z with a smooth ramp collider (feels better than
   * per-step collisions and works with the character controller's slope limit).
   */
  protected stairs(o: {
    x: number;
    width: number;
    zBottom: number;
    yBottom: number;
    zTop: number;
    yTop: number;
    steps: number;
    material: THREE.Material;
  }): void {
    const run = o.zTop - o.zBottom;
    const rise = o.yTop - o.yBottom;
    const dz = run / o.steps;
    const dy = rise / o.steps;
    for (let i = 0; i < o.steps; i++) {
      const h = dy * (i + 1);
      this.box([o.width, h, Math.abs(dz)], [o.x, o.yBottom + h / 2, o.zBottom + dz * (i + 0.5)], o.material, {
        castShadow: false,
        map: false,
      });
    }
    const angle = Math.atan2(rise, Math.abs(run));
    const theta = run < 0 ? angle : -angle;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(theta, 0, 0));
    const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const centre = new THREE.Vector3(o.x, (o.yBottom + o.yTop) / 2 + dy / 2, (o.zBottom + o.zTop) / 2).addScaledVector(
      normal,
      -0.15,
    );
    const length = Math.hypot(run, rise) + 0.4;
    this.ctx.physics.addBox([o.width / 2, 0.15, length / 2], centre, q);
  }

  protected mapRect(r: Rect, minY: number, maxY: number, kind: MapShape['kind']): void {
    this.mapShapes.push({
      points: [
        [r.minX, r.minZ],
        [r.maxX, r.minZ],
        [r.maxX, r.maxZ],
        [r.minX, r.maxZ],
      ],
      minY,
      maxY,
      kind,
    });
  }

  private recordShape(size: Vec3, pos: Vec3, rotY: number, kind: MapShape['kind']): void {
    const [w, h, d] = size;
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    const pts: [number, number][] = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ].map(([x, z]) => [pos[0] + x * c + z * s, pos[2] - x * s + z * c]);
    this.mapShapes.push({ points: pts, minY: pos[1] - h / 2, maxY: pos[1] + h / 2, kind });
  }

  private boxGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
    const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
    let g = this.geoCache.get(key);
    if (g) return g;
    g = this.resources.track(new THREE.BoxGeometry(w, h, d));
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each).
    const dims: [number, number][] = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    for (let f = 0; f < 6; f++)
      for (let i = 0; i < 4; i++) {
        const idx = f * 4 + i;
        uv.setXY(idx, uv.getX(idx) * dims[f][0], uv.getY(idx) * dims[f][1]);
      }
    this.geoCache.set(key, g);
    return g;
  }

  /** Static objects skip per-frame matrix recomputation (big CPU win with 100s of meshes). */
  private freezeStatic(): void {
    this.root.updateMatrixWorld(true);
    this.root.traverse((o) => {
      if (!o.userData.dynamic) o.matrixAutoUpdate = false;
    });
  }
}

/** Registry entry: static info + factory. Geometry/physics are only built when the world is entered. */
export interface WorldDefinition {
  info: WorldInfo;
  create(): World;
}
