import * as THREE from 'three';
import { Sky as SkyShader } from 'three/addons/objects/Sky.js';

const domeVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const domeFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGlowDir;
  uniform vec3 uGlowColor;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uTop, pow(h, 0.45));
    float glow = pow(max(dot(normalize(vDir), uGlowDir), 0.0), 24.0);
    col += uGlowColor * glow;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface NightSky {
  object: THREE.Group;
  moonDirection: THREE.Vector3;
}

/** Gradient dome, star field and moon. Cheap: 3 draw calls. */
export function createNightSky(moonDirection = new THREE.Vector3(-0.35, 0.45, -0.82).normalize()): NightSky {
  const group = new THREE.Group();
  group.name = 'night-sky';

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(0x02040c) },
        uHorizon: { value: new THREE.Color(0x101a33) },
        uGlowDir: { value: moonDirection },
        uGlowColor: { value: new THREE.Color(0x1c2850) },
      },
      vertexShader: domeVertex,
      fragmentShader: domeFragment,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  dome.renderOrder = -1;

  const count = 2500;
  const pos = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.set(Math.random() * 2 - 1, Math.random() * 0.9 + 0.08, Math.random() * 2 - 1).normalize().multiplyScalar(1400);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }),
  );

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(28, 24, 12),
    new THREE.MeshBasicMaterial({ color: 0xf4f1e3, fog: false }),
  );
  moon.position.copy(moonDirection).multiplyScalar(1300);

  group.add(dome, stars, moon);
  return { object: group, moonDirection };
}

export interface SunsetSky {
  object: THREE.Mesh;
  sunDirection: THREE.Vector3;
}

/** Physically-based atmospheric scattering sky (three/addons Sky). */
export function createSunsetSky(elevationDeg = 3, azimuthDeg = 15): SunsetSky {
  const sky = new SkyShader();
  sky.scale.setScalar(1800);
  const u = sky.material.uniforms;
  u.turbidity.value = 6;
  u.rayleigh.value = 2.2;
  u.mieCoefficient.value = 0.006;
  u.mieDirectionalG.value = 0.86;
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
  const theta = THREE.MathUtils.degToRad(azimuthDeg);
  // Azimuth 0 = +Z (out over the ocean).
  const sunDirection = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  u.sunPosition.value.copy(sunDirection);
  return { object: sky, sunDirection };
}
