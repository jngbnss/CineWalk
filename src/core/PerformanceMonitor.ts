import type * as THREE from 'three';

export interface PerformanceSnapshot {
  fps: number;
  frameTimeMs: number;
  /** Worst frame in the sampling window — spikes matter more than averages. */
  frameTimeMaxMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
}

type Listener = (s: PerformanceSnapshot) => void;

/**
 * Samples renderer.info and frame timing over a rolling window.
 * Designed for export: `toPrometheus()` returns text exposition format so a
 * tiny beacon / pushgateway client can ship it to Prometheus → Grafana later.
 */
export class PerformanceMonitor {
  private frames = 0;
  private worst = 0;
  private last = performance.now();
  private start = 0;
  private readonly listeners = new Set<Listener>();
  snapshot: PerformanceSnapshot = {
    fps: 0,
    frameTimeMs: 0,
    frameTimeMaxMs: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
  };

  constructor(private readonly windowMs = 500) {}

  begin(): void {
    this.start = performance.now();
  }

  /** Call after rendering. `info` comes from WebGLRenderer.info. */
  end(info: THREE.WebGLInfo): void {
    const now = performance.now();
    const cpu = now - this.start;
    this.frames++;
    this.worst = Math.max(this.worst, cpu);
    const elapsed = now - this.last;
    if (elapsed < this.windowMs) return;

    this.snapshot = {
      fps: (this.frames * 1000) / elapsed,
      frameTimeMs: elapsed / this.frames,
      frameTimeMaxMs: this.worst,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
    };
    this.frames = 0;
    this.worst = 0;
    this.last = now;
    for (const fn of this.listeners) fn(this.snapshot);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  toPrometheus(labels: Record<string, string> = {}): string {
    const l = Object.entries(labels)
      .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`)
      .join(',');
    const tag = l ? `{${l}}` : '';
    const s = this.snapshot;
    return [
      `cinewalk_fps${tag} ${s.fps.toFixed(2)}`,
      `cinewalk_frame_time_ms${tag} ${s.frameTimeMs.toFixed(3)}`,
      `cinewalk_frame_time_max_ms${tag} ${s.frameTimeMaxMs.toFixed(3)}`,
      `cinewalk_draw_calls${tag} ${s.drawCalls}`,
      `cinewalk_triangles${tag} ${s.triangles}`,
      `cinewalk_gpu_geometries${tag} ${s.geometries}`,
      `cinewalk_gpu_textures${tag} ${s.textures}`,
    ].join('\n');
  }
}
