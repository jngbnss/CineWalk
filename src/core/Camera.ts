import * as THREE from 'three';

/** First-person perspective camera. Far plane covers the ocean horizon. */
export class Camera {
  readonly three: THREE.PerspectiveCamera;

  constructor(aspect: number, fov = 70) {
    this.three = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2200);
    this.three.rotation.order = 'YXZ';
  }

  resize(aspect: number): void {
    this.three.aspect = aspect;
    this.three.updateProjectionMatrix();
  }

  setFov(fov: number): void {
    this.three.fov = fov;
    this.three.updateProjectionMatrix();
  }
}
