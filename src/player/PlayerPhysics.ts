import * as THREE from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { RapierNS } from '../physics/Rapier';

/** Capsule character driven by Rapier's kinematic character controller. */
export class PlayerPhysics {
  static readonly RADIUS = 0.35;
  static readonly HALF_HEIGHT = 0.5;
  /** Distance from feet to capsule centre. */
  static readonly CENTER_OFFSET = PlayerPhysics.HALF_HEIGHT + PlayerPhysics.RADIUS;
  /**
   * Spawn slightly above the floor: a capsule that starts exactly touching (or
   * penetrating) a collider makes Rapier's controller refuse to move it.
   */
  private static readonly SPAWN_LIFT = 0.08;

  /** Capsule centre in world space. */
  readonly position = new THREE.Vector3();
  grounded = false;

  private readonly body: RapierNS.RigidBody;
  private readonly collider: RapierNS.Collider;
  private readonly controller: RapierNS.KinematicCharacterController;
  private readonly lastMove = new THREE.Vector3();

  constructor(private readonly physics: PhysicsWorld, feet: THREE.Vector3) {
    const { R, world } = physics;
    this.position.copy(feet).setY(feet.y + PlayerPhysics.CENTER_OFFSET + PlayerPhysics.SPAWN_LIFT);
    this.body = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(this.position.x, this.position.y, this.position.z),
    );
    this.collider = world.createCollider(R.ColliderDesc.capsule(PlayerPhysics.HALF_HEIGHT, PlayerPhysics.RADIUS), this.body);
    this.controller = world.createCharacterController(0.02);
    this.controller.enableAutostep(0.4, 0.2, false);
    this.controller.enableSnapToGround(0.35);
    this.controller.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(50));
    this.controller.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(60));
  }

  get feet(): THREE.Vector3 {
    return new THREE.Vector3(this.position.x, this.position.y - PlayerPhysics.CENTER_OFFSET, this.position.z);
  }

  /** Moves by the desired delta, resolving collisions. Returns the movement actually applied. */
  move(delta: THREE.Vector3): THREE.Vector3 {
    this.controller.computeColliderMovement(this.collider, delta);
    const m = this.controller.computedMovement();
    this.lastMove.set(m.x, m.y, m.z);
    this.position.add(this.lastMove);
    this.body.setNextKinematicTranslation(this.position);
    this.grounded = this.controller.computedGrounded();
    return this.lastMove;
  }

  teleport(feet: THREE.Vector3): void {
    this.position.copy(feet).setY(feet.y + PlayerPhysics.CENTER_OFFSET + PlayerPhysics.SPAWN_LIFT);
    this.body.setTranslation(this.position, true);
  }

  dispose(): void {
    this.physics.world.removeCharacterController(this.controller);
    this.physics.world.removeRigidBody(this.body);
  }
}
