import * as THREE from 'three';

/**
 * Procedural stand-ins for vehicle models. Each returns a Group facing +Z with
 * its wheels on y = 0. Replace by dropping a GLB into public/assets and listing
 * it in manifest.json (see SceneLoader.loadOptional).
 */

function part(geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], parent: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function wheels(
  group: THREE.Group,
  radius: number,
  width: number,
  x: number,
  zs: number[],
  tyre: THREE.Material,
  hub: THREE.Material,
) {
  const tyreGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
  tyreGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.02, 20);
  hubGeo.rotateZ(Math.PI / 2);
  for (const sx of [-1, 1])
    for (const z of zs) {
      part(tyreGeo, tyre, [sx * x, radius, z], group);
      part(hubGeo, hub, [sx * x, radius, z], group);
    }
}

/** 1920s-style roadster: long hood, running boards, whitewall tyres. */
export function buildClassicCar(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'classic-car';
  const paint = new THREE.MeshStandardMaterial({ color: 0xefe3c8, metalness: 0.45, roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.8 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.4 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe2a0, emissiveIntensity: 3 });

  part(new THREE.BoxGeometry(1.7, 0.5, 4.6), paint, [0, 0.75, 0], g);
  part(new THREE.BoxGeometry(1.3, 0.42, 1.9), paint, [0, 1.18, 1.25], g);
  part(new THREE.BoxGeometry(1.6, 0.55, 1.5), dark, [0, 1.27, -0.75], g);
  part(new THREE.BoxGeometry(1.4, 0.5, 0.05), glass, [0, 1.3, 0.12], g);
  part(new THREE.BoxGeometry(1.0, 0.65, 0.08), chrome, [0, 1.05, 2.3], g);
  part(new THREE.BoxGeometry(0.25, 0.06, 3.0), chrome, [-0.98, 0.45, 0], g);
  part(new THREE.BoxGeometry(0.25, 0.06, 3.0), chrome, [0.98, 0.45, 0], g);
  // Flowing fenders.
  const fender = new THREE.BoxGeometry(0.42, 0.28, 1.25);
  for (const sx of [-1, 1])
    for (const z of [1.65, -1.65]) part(fender, paint, [sx * 0.92, 0.98, z], g);
  const lampGeo = new THREE.SphereGeometry(0.16, 16, 12);
  part(lampGeo, lamp, [-0.62, 1.12, 2.3], g);
  part(lampGeo, lamp, [0.62, 1.12, 2.3], g);
  wheels(g, 0.42, 0.28, 0.92, [1.65, -1.65], tyre, white);
  const spare = new THREE.CylinderGeometry(0.4, 0.4, 0.22, 24);
  spare.rotateX(Math.PI / 2);
  part(spare, tyre, [0, 1.05, -2.45], g);
  return g;
}

/** Low, wedge-shaped electric concept car with light strips. */
export function buildConceptCar(color: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'concept-car';
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.22 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x05070a, metalness: 1, roughness: 0.05 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.85 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 1, roughness: 0.25 });
  const front = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9fe8ff, emissiveIntensity: 4 });
  const rear = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a3a, emissiveIntensity: 3 });

  // Side profile in (z, y), extruded across the car's width.
  const s = new THREE.Shape();
  const profile: [number, number][] = [
    [-2.3, 0.32],
    [2.3, 0.32],
    [2.38, 0.52],
    [1.3, 0.78],
    [0.25, 1.12],
    [-1.25, 1.12],
    [-2.32, 0.82],
  ];
  profile.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  s.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: 1.9, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
  bodyGeo.translate(0, 0, -0.95);
  bodyGeo.rotateY(-Math.PI / 2);
  part(bodyGeo, paint, [0, 0, 0], g);

  const canopy = new THREE.SphereGeometry(1, 24, 12);
  canopy.scale(0.78, 0.32, 1.45);
  part(canopy, glass, [0, 1.06, -0.35], g);

  part(new THREE.BoxGeometry(1.7, 0.04, 0.04), front, [0, 0.62, 2.36], g);
  part(new THREE.BoxGeometry(1.8, 0.05, 0.04), rear, [0, 0.82, -2.36], g);
  wheels(g, 0.38, 0.3, 0.92, [1.45, -1.45], tyre, rim);
  return g;
}
