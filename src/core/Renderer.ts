import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface RendererOptions {
  /** Upper bound for devicePixelRatio. 1.5 keeps 4K/retina screens near 60 FPS. */
  maxPixelRatio?: number;
}

/** Owns the WebGL context, tone mapping, shadows and a shared PMREM environment. */
export class Renderer {
  readonly three: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  /** Neutral studio reflections, generated once and shared by every world. */
  readonly environment: THREE.Texture;
  private maxPixelRatio: number;

  constructor(private readonly container: HTMLElement, opts: RendererOptions = {}) {
    this.maxPixelRatio = opts.maxPixelRatio ?? 1.5;
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.three = r;
    this.canvas = r.domElement;
    container.appendChild(this.canvas);
    this.resize();

    const pmrem = new THREE.PMREMGenerator(r);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
  }

  get pixelRatioCap(): number {
    return this.maxPixelRatio;
  }

  set pixelRatioCap(cap: number) {
    this.maxPixelRatio = cap;
    this.resize();
  }

  resize(): void {
    this.three.setPixelRatio(Math.min(window.devicePixelRatio, this.maxPixelRatio));
    this.three.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  get aspect(): number {
    return this.container.clientWidth / Math.max(1, this.container.clientHeight);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.three.render(scene, camera);
  }

  /** Drops cached render lists/programs that referenced a previous world. */
  releaseCaches(): void {
    this.three.renderLists.dispose();
  }

  dispose(): void {
    this.environment.dispose();
    this.three.dispose();
  }
}
