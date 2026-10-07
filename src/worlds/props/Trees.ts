import * as THREE from 'three';
import { createLOD, LODLevel } from '../../core/LOD';

export type TreeStyle = 'round' | 'cypress';

/**
 * Creates trees with HIGH / MEDIUM / LOW levels of detail. Geometry and
 * materials are shared between all trees from one factory.
 */
export function treeFactory(style: TreeStyle, foliageColor: number, trunkColor = 0x3b2a1e) {
  const leaf = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.95, flatShading: true });
  const bark = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 1 });

  const trunk = new THREE.CylinderGeometry(0.18, 0.28, 2.6, 8).translate(0, 1.3, 0);
  const geo =
    style === 'round'
      ? {
          high: [
            new THREE.IcosahedronGeometry(1.8, 2).translate(0, 3.6, 0),
            new THREE.IcosahedronGeometry(1.3, 2).translate(0.9, 4.6, 0.3),
            new THREE.IcosahedronGeometry(1.2, 2).translate(-0.8, 4.4, -0.4),
          ],
          medium: [new THREE.IcosahedronGeometry(2.1, 1).translate(0, 4, 0)],
          low: new THREE.ConeGeometry(2.2, 5, 6).translate(0, 3.3, 0),
        }
      : {
          high: [
            new THREE.ConeGeometry(1.0, 6.5, 14).translate(0, 4.2, 0),
            new THREE.ConeGeometry(0.75, 3, 12).translate(0, 7.2, 0),
          ],
          medium: [new THREE.ConeGeometry(1.0, 8, 8).translate(0, 4.8, 0)],
          low: new THREE.ConeGeometry(1.0, 8.5, 4).translate(0, 4.6, 0),
        };

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, shadow = true) => {
    const x = new THREE.Mesh(g, m);
    x.castShadow = shadow;
    x.receiveShadow = shadow;
    return x;
  };

  return (position: [number, number, number], scale = 1): THREE.LOD => {
    const high = new THREE.Group();
    high.add(mesh(trunk, bark), ...geo.high.map((g) => mesh(g, leaf)));
    const medium = new THREE.Group();
    medium.add(mesh(trunk, bark), ...geo.medium.map((g) => mesh(g, leaf)));
    const low = mesh(geo.low, leaf, false);
    const lod = createLOD({ [LODLevel.HIGH]: high, [LODLevel.MEDIUM]: medium, [LODLevel.LOW]: low });
    lod.position.set(...position);
    lod.scale.setScalar(scale);
    lod.name = `tree:${style}`;
    return lod;
  };
}
