import * as THREE from 'three';

export type Vec3 = [number, number, number];

export interface PortalData {
  id: string;
  targetWorldId: string;
  /** Shown in the travel dialog: "Travel to {label}?" */
  label: string;
  position: Vec3;
  radius: number;
  color: number;
  /** Y rotation of the portal ring (radians). */
  facing?: number;
}

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    float swirl = sin(a * 5.0 + r * 14.0 - uTime * 3.0) * 0.5 + 0.5;
    float core = smoothstep(1.0, 0.0, r);
    vec3 col = mix(uColor * 0.7, vec3(1.0), pow(core, 4.0)) * (0.45 + swirl * 0.8);
    float alpha = smoothstep(1.0, 0.82, r) * (0.5 + 0.5 * swirl * core);
    gl_FragColor = vec4(col, alpha);
  }
`;

/** Glowing ring + swirling disc. Pure visual; detection lives in PortalManager. */
export class PortalVisual {
  readonly object = new THREE.Group();
  private readonly uniforms: { uTime: { value: number }; uColor: { value: THREE.Color } };
  private readonly ring: THREE.Mesh;

  constructor(readonly data: PortalData) {
    const color = new THREE.Color(data.color);
    this.uniforms = { uTime: { value: 0 }, uColor: { value: color } };

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.11, 16, 72),
      new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: 2.5, metalness: 0.6, roughness: 0.3 }),
    );
    this.ring.position.y = 2.1;

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.52, 64),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    disc.position.y = 2.1;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.3, 0.18, 48),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.8, roughness: 0.35 }),
    );
    base.position.y = 0.09;
    base.receiveShadow = true;

    const light = new THREE.PointLight(color, 25, 14, 2);
    light.position.y = 2.1;

    this.object.add(this.ring, disc, base, light);
    this.object.position.set(...data.position);
    this.object.rotation.y = data.facing ?? 0;
    this.object.name = `portal:${data.id}`;
  }

  update(t: number): void {
    this.uniforms.uTime.value = t;
    this.ring.rotation.z = t * 0.4;
  }
}

/** Detects when the player walks into a portal. Re-arms once they step away. */
export class PortalManager {
  private readonly states: { visual: PortalVisual; armed: boolean }[];
  private grace = 1.0;

  constructor(portals: PortalData[], parent: THREE.Object3D) {
    this.states = portals.map((p) => ({ visual: new PortalVisual(p), armed: false }));
    for (const s of this.states) parent.add(s.visual.object);
  }

  get all(): PortalData[] {
    return this.states.map((s) => s.visual.data);
  }

  /** Returns a portal the player just entered (once per approach), or null. */
  update(dt: number, t: number, feet: THREE.Vector3, detect: boolean): PortalData | null {
    this.grace -= dt;
    let hit: PortalData | null = null;
    for (const s of this.states) {
      s.visual.update(t);
      const [x, y, z] = s.visual.data.position;
      const d = Math.hypot(feet.x - x, feet.z - z);
      const near = Math.abs(feet.y - y) < 3;
      if (!near || d > s.visual.data.radius + 0.75) s.armed = true;
      else if (detect && s.armed && this.grace <= 0 && d < s.visual.data.radius) {
        s.armed = false;
        hit = s.visual.data;
      }
    }
    return hit;
  }
}
