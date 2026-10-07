import * as THREE from 'three';

export enum LODLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/** Camera distance (m) at which each level becomes active. */
export const LOD_DISTANCES: Record<LODLevel, number> = {
  [LODLevel.HIGH]: 0,
  [LODLevel.MEDIUM]: 22,
  [LODLevel.LOW]: 55,
};

/** Global multiplier — raise to keep detail further away, lower on weak GPUs. */
export const lodSettings = { bias: 1 };

export type LODLevels = Partial<Record<LODLevel, THREE.Object3D>>;

/**
 * Builds a THREE.LOD from up to three representations. Missing levels fall back
 * to the next-higher one, so callers can start with just HIGH and add the rest
 * later (e.g. decimated glTF variants or a splat → mesh proxy for city blocks).
 */
export function createLOD(levels: LODLevels, distances: Partial<Record<LODLevel, number>> = {}): THREE.LOD {
  const lod = new THREE.LOD();
  const order = [LODLevel.HIGH, LODLevel.MEDIUM, LODLevel.LOW];
  for (const level of order) {
    const obj = levels[level];
    if (!obj) continue;
    obj.name ||= level;
    lod.addLevel(obj, (distances[level] ?? LOD_DISTANCES[level]) * lodSettings.bias);
  }
  return lod;
}
