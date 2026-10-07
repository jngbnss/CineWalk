import type * as RapierNS from '@dimforge/rapier3d-compat';

export type Rapier = typeof RapierNS;
export type { RapierNS };

let rapier: Rapier | null = null;
let loading: Promise<Rapier> | null = null;

/**
 * Lazily loads the Rapier WASM module (~2 MB) so the first screen paints instantly.
 * Call early (e.g. at boot) to warm it up in the background.
 */
export function loadRapier(): Promise<Rapier> {
  loading ??= import('@dimforge/rapier3d-compat').then(async (mod) => {
    const R = (mod.default ?? mod) as unknown as Rapier;
    await R.init();
    rapier = R;
    return R;
  });
  return loading;
}

export function getRapier(): Rapier {
  if (!rapier) throw new Error('Rapier not initialised — await loadRapier() first.');
  return rapier;
}
