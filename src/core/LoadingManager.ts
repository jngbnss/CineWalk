import * as THREE from 'three';

export type ProgressListener = (progress: number, label: string) => void;

/**
 * Combines THREE.LoadingManager (network assets) with manual build stages
 * (procedural geometry, physics) into one 0..1 progress value for the UI.
 */
export class LoadingManager {
  readonly three = new THREE.LoadingManager();
  private readonly listeners = new Set<ProgressListener>();
  private stageProgress = 0;
  private assetProgress = 1;
  private label = '';

  constructor() {
    this.three.onStart = () => {
      this.assetProgress = 0;
      this.emit();
    };
    this.three.onProgress = (_url, loaded, total) => {
      this.assetProgress = total ? loaded / total : 1;
      this.emit();
    };
    this.three.onLoad = () => {
      this.assetProgress = 1;
      this.emit();
    };
  }

  onProgress(fn: ProgressListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  begin(label: string): void {
    this.stageProgress = 0;
    this.assetProgress = 1;
    this.stage(0, label);
  }

  stage(progress: number, label = this.label): void {
    this.stageProgress = progress;
    this.label = label;
    this.emit();
  }

  private emit(): void {
    const p = Math.min(this.stageProgress, 0.3 + 0.7 * this.assetProgress);
    for (const fn of this.listeners) fn(p, this.label);
  }
}
