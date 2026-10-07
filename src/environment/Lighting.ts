import * as THREE from 'three';

export interface LightRig {
  object: THREE.Group;
  key: THREE.DirectionalLight;
}

function shadowedDirectional(color: number, intensity: number, dir: THREE.Vector3, extent: number, mapSize = 2048) {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.copy(dir).multiplyScalar(120);
  light.castShadow = true;
  const cam = light.shadow.camera;
  cam.left = cam.bottom = -extent;
  cam.right = cam.top = extent;
  cam.near = 1;
  cam.far = 320;
  light.shadow.mapSize.set(mapSize, mapSize);
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
  return light;
}

/** Cold moonlight + dim blue ambient. Interiors are lit by local warm lights. */
export function createNightLighting(moonDirection: THREE.Vector3, extent = 70): LightRig {
  const group = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0x2a3a6a, 0x0c0907, 0.4);
  const moon = shadowedDirectional(0xa9bbff, 0.9, moonDirection, extent);
  group.add(hemi, moon, moon.target);
  return { object: group, key: moon };
}

/** Low golden sun from the ocean side. */
export function createSunsetLighting(sunDirection: THREE.Vector3, extent = 80): LightRig {
  const group = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0xffd2b0, 0x2a2a40, 0.9);
  // Keep the shadow-casting light a bit higher than the visual sun so shadows aren't infinitely long.
  const dir = sunDirection.clone();
  dir.y = Math.max(dir.y, 0.25);
  const sun = shadowedDirectional(0xffa66b, 3.2, dir.normalize(), extent);
  group.add(hemi, sun, sun.target);
  return { object: group, key: sun };
}

export function pointLight(color: number, intensity: number, distance: number, position: [number, number, number]) {
  const l = new THREE.PointLight(color, intensity, distance, 2);
  l.position.set(...position);
  return l;
}
