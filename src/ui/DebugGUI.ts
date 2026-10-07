import type GUI from 'lil-gui';
import type { Engine } from '../core/Engine';
import { lodSettings } from '../core/LOD';

/** lil-gui panel, loaded on demand (` key or ?debug) so it costs nothing otherwise. */
export class DebugGUI {
  private gui: GUI | null = null;
  private visible = false;

  constructor(private readonly engine: Engine) {}

  async toggle(): Promise<void> {
    this.visible = !this.visible;
    if (this.gui) {
      this.gui.show(this.visible);
      return;
    }
    const { default: GUIClass } = await import('lil-gui');
    const e = this.engine;
    const gui = new GUIClass({ title: 'CineWalk debug' });
    const move = gui.addFolder('Movement');
    move.add(e.movement, 'walkSpeed', 1, 12, 0.1);
    move.add(e.movement, 'runMultiplier', 1, 4, 0.1);
    move.add(e.movement, 'jumpSpeed', 2, 12, 0.1);
    move.add(e.movement, 'gravity', 5, 40, 0.5);
    move.add(e.movement, 'mouseSensitivity', 0.0005, 0.006, 0.0001);

    const render = gui.addFolder('Rendering');
    const r = e.renderer.three;
    const view = { fov: e.camera.three.fov, shadows: r.shadowMap.enabled };
    render.add(view, 'fov', 50, 100, 1).onChange((v: number) => e.camera.setFov(v));
    render.add(r, 'toneMappingExposure', 0.2, 2, 0.01).name('exposure').listen();
    render.add(e.renderer, 'pixelRatioCap', 0.5, 2, 0.25).name('pixel ratio cap');
    render.add(view, 'shadows').onChange((v: boolean) => {
      r.shadowMap.enabled = v;
      e.scene.traverse((o) => {
        const m = (o as THREE_Mesh).material;
        if (m) for (const mm of Array.isArray(m) ? m : [m]) mm.needsUpdate = true;
      });
    });
    render.add(lodSettings, 'bias', 0.25, 3, 0.05).name('LOD bias (next load)');

    const tools = gui.addFolder('Tools');
    tools.add({ copyMetrics: () => navigator.clipboard?.writeText(e.metricsText()) }, 'copyMetrics').name('copy Prometheus metrics');
    tools.add({ respawn: () => e.respawn() }, 'respawn');
    this.gui = gui;
  }
}

type THREE_Mesh = { material?: { needsUpdate: boolean } | { needsUpdate: boolean }[] };
