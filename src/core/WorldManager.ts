import type * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { loadRapier } from '../physics/Rapier';
import type { World, WorldDefinition, WorldInfo } from '../worlds/World';
import type { AssetLoader } from './AssetLoader';
import type { LoadingManager } from './LoadingManager';
import type { Renderer } from './Renderer';
import { SceneLoader } from './SceneLoader';

/**
 * Loads/unloads worlds without a page reload. Each world gets a fresh physics
 * world and SceneLoader; on unload every GPU resource it created is disposed.
 */
export class WorldManager {
  private readonly definitions = new Map<string, WorldDefinition>();
  private current: { world: World; physics: PhysicsWorld; sceneLoader: SceneLoader } | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly renderer: Renderer,
    private readonly assets: AssetLoader,
    private readonly loading: LoadingManager,
  ) {}

  register(def: WorldDefinition): void {
    this.definitions.set(def.info.id, def);
  }

  get list(): WorldInfo[] {
    return [...this.definitions.values()].map((d) => d.info);
  }

  info(id: string): WorldInfo | undefined {
    return this.definitions.get(id)?.info;
  }

  get world(): World | null {
    return this.current?.world ?? null;
  }

  get physics(): PhysicsWorld | null {
    return this.current?.physics ?? null;
  }

  async load(id: string, camera: THREE.Camera): Promise<World> {
    const def = this.definitions.get(id);
    if (!def) throw new Error(`Unknown world "${id}"`);
    this.unload();

    this.loading.begin(`Entering ${def.info.name}…`);
    await loadRapier();
    this.loading.stage(0.1);

    const physics = new PhysicsWorld();
    const sceneLoader = new SceneLoader(this.assets);
    const world = def.create();
    try {
      await world.load({
        scene: this.scene,
        renderer: this.renderer,
        physics,
        assets: this.assets,
        sceneLoader,
        loading: this.loading,
      });
    } catch (err) {
      world.dispose();
      sceneLoader.disposeAll();
      physics.dispose();
      throw err;
    }
    this.scene.add(world.root);
    // One step so the broad-phase knows every static collider before the player moves.
    physics.step(1 / 60);
    // Compile shaders up-front so the first frames don't hitch.
    await this.renderer.three.compileAsync(this.scene, camera).catch(() => undefined);
    this.loading.stage(1, def.info.name);
    this.current = { world, physics, sceneLoader };
    return world;
  }

  unload(): void {
    if (!this.current) return;
    const { world, physics, sceneLoader } = this.current;
    this.scene.remove(world.root);
    world.dispose();
    sceneLoader.disposeAll();
    physics.dispose();
    this.assets.clearCache();
    this.scene.fog = null;
    this.scene.background = null;
    this.scene.environment = null;
    this.renderer.three.toneMappingExposure = 1;
    this.renderer.releaseCaches();
    this.current = null;
  }
}
