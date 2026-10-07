type LockListener = (locked: boolean) => void;
type KeyListener = (code: string, event: KeyboardEvent) => void;

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

/** Keyboard state, mouse deltas and Pointer Lock lifecycle. */
export class InputManager {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private dx = 0;
  private dy = 0;
  private readonly lockListeners = new Set<LockListener>();
  private readonly keyListeners = new Set<KeyListener>();

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.reset);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onLockChange);
  }

  get locked(): boolean {
    return document.pointerLockElement === this.element;
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** True only on the frame the key went down. */
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  consumeMouse(): { dx: number; dy: number } {
    const d = { dx: this.dx, dy: this.dy };
    this.dx = this.dy = 0;
    return d;
  }

  /** Must be called from a user gesture (click / keydown). Resolves false if the browser refused. */
  async requestLock(): Promise<boolean> {
    if (this.locked) return true;
    try {
      await this.element.requestPointerLock();
      return true;
    } catch {
      return false;
    }
  }

  exitLock(): void {
    if (this.locked) document.exitPointerLock();
  }

  onLock(fn: LockListener): () => void {
    this.lockListeners.add(fn);
    return () => this.lockListeners.delete(fn);
  }

  onKey(fn: KeyListener): () => void {
    this.keyListeners.add(fn);
    return () => this.keyListeners.delete(fn);
  }

  endFrame(): void {
    this.pressed.clear();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (isTyping(e.target)) return;
    if (!e.repeat) this.pressed.add(e.code);
    this.down.add(e.code);
    if (e.code === 'Space' && this.locked) e.preventDefault();
    for (const fn of this.keyListeners) fn(e.code, e);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.dx += e.movementX;
    this.dy += e.movementY;
  };

  private onLockChange = () => {
    const locked = this.locked;
    if (!locked) this.reset();
    for (const fn of this.lockListeners) fn(locked);
  };

  private reset = () => {
    this.down.clear();
    this.pressed.clear();
    this.dx = this.dy = 0;
  };

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.reset);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onLockChange);
  }
}
