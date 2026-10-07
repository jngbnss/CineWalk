import * as THREE from 'three';

export interface WaterOptions {
  width: number;
  depth: number;
  segments?: number;
  deepColor?: number;
  shallowColor?: number;
  amplitude?: number;
  /** Spatial frequency multiplier — higher = choppier, smaller waves. */
  scale?: number;
  sunDirection?: THREE.Vector3;
  sunColor?: number;
  /** Self-illumination, e.g. for a lit pool at night. */
  glow?: number;
  opacity?: number;
}

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uScale;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  float waves(vec2 p) {
    return sin(p.x * 0.05 * uScale + uTime * 0.8) * 0.6
         + sin(p.y * 0.08 * uScale + uTime * 1.1) * 0.4
         + sin((p.x + p.y) * 0.17 * uScale + uTime * 1.7) * 0.15;
  }
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    world.y += waves(world.xz) * uAmp;
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uGlow;
  uniform float uOpacity;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  void main() {
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (n.y < 0.0) n = -n;
    vec3 v = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    vec3 col = mix(uDeep, uShallow, 0.25 + 0.75 * fresnel);
    vec3 r = reflect(-v, n);
    float spec = pow(max(dot(r, uSunDir), 0.0), 180.0);
    col += uSunColor * spec * 2.5 + uShallow * uGlow;
    gl_FragColor = vec4(col, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Animated, fog-aware water surface — used for both the ocean and the pool. */
export class Water {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(o: WaterOptions) {
    const seg = o.segments ?? 64;
    const geo = new THREE.PlaneGeometry(o.width, o.depth, seg, seg);
    geo.rotateX(-Math.PI / 2);
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uAmp: { value: o.amplitude ?? 0.6 },
          uScale: { value: o.scale ?? 1 },
          uDeep: { value: new THREE.Color(o.deepColor ?? 0x0a2a3a) },
          uShallow: { value: new THREE.Color(o.shallowColor ?? 0x3a7a8a) },
          uSunDir: { value: (o.sunDirection ?? new THREE.Vector3(0, 1, 0)).clone().normalize() },
          uSunColor: { value: new THREE.Color(o.sunColor ?? 0xffffff) },
          uGlow: { value: o.glow ?? 0 },
          uOpacity: { value: o.opacity ?? 1 },
        },
      ]),
      vertexShader: vertex,
      fragmentShader: fragment,
      fog: true,
      transparent: (o.opacity ?? 1) < 1,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.receiveShadow = false;
    this.mesh.name = 'water';
  }

  update(t: number): void {
    this.material.uniforms.uTime.value = t;
  }
}
