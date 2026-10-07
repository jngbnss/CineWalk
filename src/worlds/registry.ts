import { FuturisticCliffWorld, futuristicCliffInfo } from './FuturisticCliffWorld';
import { JazzMansionWorld, jazzMansionInfo } from './JazzMansionWorld';
import type { WorldDefinition } from './World';

/**
 * All explorable worlds. To add one (ParisWorld, VeniceWorld, GaussianSplatWorld…):
 *   1. create `src/worlds/MyWorld.ts` exporting a WorldInfo + a World subclass
 *   2. add an entry here — the selector, minimap, guide and portals pick it up.
 */
export const WORLDS: WorldDefinition[] = [
  { info: jazzMansionInfo, create: () => new JazzMansionWorld() },
  { info: futuristicCliffInfo, create: () => new FuturisticCliffWorld() },
];
