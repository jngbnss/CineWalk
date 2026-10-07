import * as THREE from 'three';
import { createGuideService } from '../ai/createGuideService';
import type { GuideService } from '../ai/GuideService';
import { loadRapier } from '../physics/Rapier';
import { DEFAULT_MOVEMENT, FirstPersonController, type MovementSettings } from '../player/FirstPersonController';
import { PlayerPhysics } from '../player/PlayerPhysics';
import { POIManager } from '../poi/POIManager';
import { PortalManager, type PortalData } from '../portal/Portal';
import { DebugGUI } from '../ui/DebugGUI';
import { PauseMenu, PortalDialog } from '../ui/Dialogs';
import { GuidePanel } from '../ui/GuidePanel';
import { HUD } from '../ui/HUD';
import { CanvasMiniMap, type MapView } from '../ui/MiniMap';
import { PerformancePanel } from '../ui/PerformancePanel';
import { WorldSelector } from '../ui/WorldSelector';
import type { WorldDefinition } from '../worlds/World';
import { AssetLoader } from './AssetLoader';
import { Camera } from './Camera';
import { InputManager } from './InputManager';
import { LoadingManager } from './LoadingManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { Renderer } from './Renderer';
import { WorldManager } from './WorldManager';

/**
 * select   → title screen, nothing rendered
 * loading  → world being built
 * playing  → pointer locked, player moves
 * paused   → Esc menu (pointer free)
 * dialog   → portal confirmation (pointer free)
 * chat     → typing to the guide (pointer still locked, movement frozen)
 */
type State = 'select' | 'loading' | 'playing' | 'paused' | 'dialog' | 'chat';

export class Engine {
  readonly scene = new THREE.Scene();
  readonly renderer: Renderer;
  readonly camera: Camera;
  readonly input: InputManager;
  readonly loading = new LoadingManager();
  readonly assets: AssetLoader;
  readonly worlds: WorldManager;
  readonly perf = new PerformanceMonitor();
  readonly guide: GuideService;
  readonly movement: MovementSettings = { ...DEFAULT_MOVEMENT };

  private state: State = 'select';
  private player: FirstPersonController | null = null;
  private pois: POIManager | null = null;
  private portals: PortalManager | null = null;
  private last = performance.now();
  private elapsed = 0;

  private readonly selector: WorldSelector;
  private readonly hud: HUD;
  private readonly minimap: MapView & { root: HTMLElement };
  private readonly guidePanel: GuidePanel;
  private readonly perfPanel: PerformancePanel;
  private readonly portalDialog: PortalDialog;
  private readonly pauseMenu: PauseMenu;
  private readonly debug: DebugGUI;

  constructor(viewport: HTMLElement, ui: HTMLElement, worlds: WorldDefinition[]) {
    this.renderer = new Renderer(viewport);
    this.camera = new Camera(this.renderer.aspect);
    this.input = new InputManager(this.renderer.canvas);
    this.assets = new AssetLoader(this.loading);
    this.worlds = new WorldManager(this.scene, this.renderer, this.assets, this.loading);
    for (const w of worlds) this.worlds.register(w);
    this.guide = createGuideService((id) => this.worlds.info(id));

    this.selector = new WorldSelector(ui, this.worlds.list, (id) => void this.enter(id));
    this.hud = new HUD(ui);
    this.perfPanel = new PerformancePanel(ui);
    this.minimap = new CanvasMiniMap(ui);
    this.guidePanel = new GuidePanel(ui);
    this.portalDialog = new PortalDialog(ui);
    this.pauseMenu = new PauseMenu(
      ui,
      () => void this.resume(),
      () => this.exitToSelector(),
    );
    this.debug = new DebugGUI(this);

    this.guidePanel.setProvider(this.guide.name);
    this.guidePanel.onAsk = (q) => {
      const world = this.worlds.world;
      if (!world) return Promise.resolve('Enter a world first.');
      return this.guide.ask(world.info.id, this.pois?.current?.id ?? null, q);
    };
    this.guidePanel.onClose = () => {
      if (this.state === 'chat') this.setState(this.input.locked ? 'playing' : 'paused');
    };

    this.loading.onProgress((p, label) => {
      if (this.state === 'loading') this.hud.setLoading(true, p, label);
    });
    this.perf.subscribe((s) => {
      const world = this.worlds.world;
      if (!world || !this.player) return;
      const f = this.player.feet;
      this.perfPanel.update(s, {
        world: world.info.name,
        position: f,
        loadedAssets: this.assets.loadedCount,
        colliders: this.worlds.physics?.colliders ?? 0,
      });
    });

    this.input.onLock((locked) => {
      if (locked) {
        if (this.state === 'paused' || this.state === 'dialog') {
          this.pauseMenu.close();
          this.setState('playing');
        }
      } else if (this.state === 'playing' || this.state === 'chat') {
        this.pause();
      }
    });
    this.input.onKey((code) => this.onKey(code));
    this.renderer.canvas.addEventListener('click', () => {
      if (this.state === 'paused') void this.resume();
    });
    window.addEventListener('resize', this.onResize);
  }

  async start(initialWorld?: string | null): Promise<void> {
    void loadRapier(); // warm up WASM while the title screen is showing
    await this.assets.loadManifest();
    this.renderer.three.setAnimationLoop(this.frame);
    if (new URLSearchParams(location.search).has('debug')) void this.debug.toggle();
    if (initialWorld && this.worlds.info(initialWorld)) await this.enter(initialWorld);
    else this.showSelector();
  }

  // ───────────────────────── world flow ─────────────────────────

  async enter(id: string): Promise<void> {
    if (this.state === 'loading') return;
    // Must run synchronously inside the click/keydown gesture.
    void this.input.requestLock();
    this.setState('loading');
    this.selector.setVisible(false);
    this.portalDialog.close();
    this.pauseMenu.close();
    this.setGameUI(false);
    this.hud.setLoading(true, 0, 'Loading…');
    this.teardownRuntime();

    let world;
    try {
      world = await this.worlds.load(id, this.camera.three);
    } catch (err) {
      console.error(err);
      this.hud.setLoading(false);
      this.input.exitLock();
      this.showSelector();
      this.hud.toast('Could not load that world — see console for details.');
      return;
    }

    const { info } = world;
    const spawn = new THREE.Vector3(...info.spawn.position);
    this.player = new FirstPersonController(this.camera.three, this.input, new PlayerPhysics(this.worlds.physics!, spawn), this.movement);
    this.player.setPose(spawn, info.spawn.yaw);
    this.pois = new POIManager(info.pois, world.root);
    this.portals = new PortalManager(info.portals, world.root);
    this.minimap.setWorld({ bounds: info.bounds, shapes: world.mapShapes, pois: info.pois, portals: info.portals });
    this.guidePanel.clear();
    this.guidePanel.setContext(info.name, null);
    this.guidePanel.say('guide', `Welcome to the ${info.name}. Walk up to a gold marker, or press Enter to ask me anything.`);
    this.hud.showPOI(null);

    const url = new URL(location.href);
    url.searchParams.set('world', id);
    history.replaceState(null, '', url);

    this.hud.setLoading(false);
    this.setGameUI(true);
    this.hud.toast(info.name);
    if (this.input.locked) this.setState('playing');
    else this.pause('Click to explore');
  }

  exitToSelector(): void {
    this.teardownRuntime();
    this.worlds.unload();
    this.input.exitLock();
    const url = new URL(location.href);
    url.searchParams.delete('world');
    history.replaceState(null, '', url);
    this.showSelector();
  }

  respawn(): void {
    const world = this.worlds.world;
    if (!world || !this.player) return;
    this.player.setPose(new THREE.Vector3(...world.info.spawn.position), world.info.spawn.yaw);
  }

  metricsText(): string {
    return this.perf.toPrometheus({ world: this.worlds.world?.info.id ?? 'none' });
  }

  private showSelector(): void {
    this.pauseMenu.close();
    this.portalDialog.close();
    this.setGameUI(false);
    this.selector.setVisible(true);
    this.setState('select');
  }

  private teardownRuntime(): void {
    this.player?.dispose();
    this.player = null;
    this.pois = null;
    this.portals = null;
  }

  private setGameUI(v: boolean): void {
    this.hud.setVisible(v);
    this.minimap.setVisible(v);
    this.guidePanel.setVisible(v);
    this.perfPanel.setVisible(v);
  }

  // ───────────────────────── state helpers ─────────────────────────

  private setState(s: State): void {
    this.state = s;
    document.body.dataset.state = s;
    this.hud.setCrosshair(s === 'playing');
  }

  private pause(title = 'Paused'): void {
    if (this.guidePanel.isOpen) (document.activeElement as HTMLElement | null)?.blur();
    this.setState('paused');
    this.pauseMenu.open(title);
  }

  private async resume(): Promise<void> {
    const ok = await this.input.requestLock();
    if (!ok) {
      this.pause('Click to explore');
      this.hud.toast('Click the scene to continue');
    }
  }

  private openPortal(p: PortalData): void {
    this.setState('dialog');
    this.input.exitLock();
    this.portalDialog.open(
      p.label,
      () => {
        this.portalDialog.close();
        void this.enter(p.targetWorldId);
      },
      () => {
        this.portalDialog.close();
        void this.resume();
      },
    );
  }

  private onKey(code: string): void {
    if (this.state === 'dialog') {
      this.portalDialog.handleKey(code);
      return;
    }
    if (this.state === 'select' || this.state === 'loading') return;
    if (code === 'Enter' && this.state === 'playing') {
      this.setState('chat');
      this.guidePanel.open();
    } else if (code === 'KeyP') {
      this.perfPanel.toggleDetails();
    } else if (code === 'Backquote') {
      void this.debug.toggle();
    }
  }

  private onResize = () => {
    this.renderer.resize();
    this.camera.resize(this.renderer.aspect);
  };

  // ───────────────────────── main loop ─────────────────────────

  private frame = () => {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    if (this.state === 'select' || this.state === 'loading') {
      this.input.endFrame();
      return;
    }

    this.perf.begin();
    const world = this.worlds.world;
    if (world && this.player && this.pois && this.portals) {
      this.elapsed += dt;
      const playing = this.state === 'playing';
      if (playing) {
        this.player.update(dt, true);
        this.worlds.physics!.step(dt);
      } else {
        this.input.consumeMouse();
      }
      world.update(dt, this.elapsed);

      const feet = this.player.feet;
      if (feet.y < -40) this.respawn();

      const change = this.pois.update(this.elapsed, feet);
      if (change.entered || change.left) {
        const poi = this.pois.current;
        this.hud.showPOI(poi);
        this.guidePanel.setContext(world.info.name, poi?.name ?? null);
      }

      const portal = this.portals.update(dt, this.elapsed, feet, playing);
      if (portal) this.openPortal(portal);

      const yaw = this.player.yaw;
      this.minimap.update(
        {
          x: feet.x,
          y: feet.y,
          z: feet.z,
          headingX: -Math.sin(yaw),
          headingZ: -Math.cos(yaw),
          visited: this.pois.visited,
          activePoi: this.pois.current?.id ?? null,
        },
        this.elapsed,
      );
    }

    this.renderer.render(this.scene, this.camera.three);
    this.perf.end(this.renderer.three.info);
    this.input.endFrame();
  };
}
