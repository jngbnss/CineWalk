import * as THREE from 'three';
import type { InputManager } from '../core/InputManager';
import { PlayerPhysics } from './PlayerPhysics';

export interface MovementSettings {
  walkSpeed: number;
  runMultiplier: number;
  jumpSpeed: number;
  gravity: number;
  acceleration: number;
  mouseSensitivity: number;
  eyeHeight: number;
}

export const DEFAULT_MOVEMENT: MovementSettings = {
  walkSpeed: 4.2,
  runMultiplier: 1.9,
  jumpSpeed: 5.8,
  gravity: 18,
  acceleration: 12,
  mouseSensitivity: 0.0022,
  eyeHeight: 1.6,
};

const MAX_PITCH = Math.PI / 2 - 0.01;

/** WASD + mouse-look FPS controller on top of a physics capsule. */
export class FirstPersonController {
  yaw = 0;
  pitch = 0;
  readonly velocity = new THREE.Vector3();

  private readonly wish = new THREE.Vector3();
  private readonly delta = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: InputManager,
    readonly body: PlayerPhysics,
    readonly settings: MovementSettings = DEFAULT_MOVEMENT,
  ) {
    camera.rotation.order = 'YXZ';
  }

  get feet(): THREE.Vector3 {
    return this.body.feet;
  }

  setPose(feet: THREE.Vector3, yaw: number): void {
    this.body.teleport(feet);
    this.yaw = yaw;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this.syncCamera();
  }

  update(dt: number, active: boolean): void {
    const s = this.settings;
    if (active) {
      const { dx, dy } = this.input.consumeMouse();
      this.yaw -= dx * s.mouseSensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * s.mouseSensitivity, -MAX_PITCH, MAX_PITCH);
    }

    // Wish direction relative to yaw (camera looks down -Z at yaw 0).
    const key = (code: string) => (active && this.input.isDown(code) ? 1 : 0);
    const f = key('KeyW') - key('KeyS');
    const r = key('KeyD') - key('KeyA');
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    this.wish.set(-sin * f + cos * r, 0, -cos * f - sin * r);
    if (this.wish.lengthSq() > 1) this.wish.normalize();
    const running = key('ShiftLeft') || key('ShiftRight');
    this.wish.multiplyScalar(s.walkSpeed * (running ? s.runMultiplier : 1));

    const k = 1 - Math.exp(-s.acceleration * dt);
    this.velocity.x += (this.wish.x - this.velocity.x) * k;
    this.velocity.z += (this.wish.z - this.velocity.z) * k;

    if (this.body.grounded) {
      if (this.velocity.y < 0) this.velocity.y = -1;
      if (active && this.input.wasPressed('Space')) this.velocity.y = s.jumpSpeed;
    }
    this.velocity.y -= s.gravity * dt;

    this.delta.copy(this.velocity).multiplyScalar(dt);
    const moved = this.body.move(this.delta);
    // Bumped a ceiling while rising.
    if (this.velocity.y > 0 && moved.y < this.delta.y * 0.5) this.velocity.y = 0;

    this.syncCamera();
  }

  private syncCamera(): void {
    const eyeOffset = this.settings.eyeHeight - PlayerPhysics.CENTER_OFFSET;
    this.camera.position.copy(this.body.position);
    this.camera.position.y += eyeOffset;
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  dispose(): void {
    this.body.dispose();
  }
}
