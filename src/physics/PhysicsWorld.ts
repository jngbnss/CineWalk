import * as THREE from 'three';
import { getRapier, type Rapier, type RapierNS } from './Rapier';

export type Vec3 = [number, number, number];

/**
 * Thin wrapper around a Rapier world. One instance per loaded World — it is freed
 * entirely on world change so no physics state leaks between worlds.
 */
export class PhysicsWorld {
  readonly R: Rapier;
  readonly world: RapierNS.World;
  private colliderCount = 0;

  constructor(gravityY = -9.81) {
    this.R = getRapier();
    this.world = new this.R.World({ x: 0, y: gravityY, z: 0 });
  }

  get colliders(): number {
    return this.colliderCount;
  }

  addBox(halfExtents: Vec3, position: Vec3 | THREE.Vector3, rotation?: THREE.Quaternion): RapierNS.Collider {
    const desc = this.R.ColliderDesc.cuboid(halfExtents[0], halfExtents[1], halfExtents[2]);
    return this.addFixed(desc, position, rotation);
  }

  addCylinder(halfHeight: number, radius: number, position: Vec3 | THREE.Vector3): RapierNS.Collider {
    return this.addFixed(this.R.ColliderDesc.cylinder(halfHeight, radius), position);
  }

  private addFixed(desc: RapierNS.ColliderDesc, position: Vec3 | THREE.Vector3, rotation?: THREE.Quaternion) {
    const p = Array.isArray(position) ? { x: position[0], y: position[1], z: position[2] } : position;
    desc.setTranslation(p.x, p.y, p.z);
    if (rotation) desc.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
    this.colliderCount++;
    return this.world.createCollider(desc);
  }

  step(dt: number): void {
    this.world.timestep = dt;
    this.world.step();
  }

  dispose(): void {
    this.world.free();
  }
}
