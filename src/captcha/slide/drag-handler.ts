export interface DragCallbacks {
  onStart(clientX: number, clientY: number): void;
  onMove(clientX: number, clientY: number): void;
  onEnd(): void;
  /** 手势被系统打断：复位但不提交。 */
  onCancel(): void;
}

/**
 * 滑块拖动。用 Pointer Events 统一鼠标与触摸，
 * 且只在拖动进行中把 move/up 挂到 document，结束后立即解绑，
 * 避免常驻全局监听在页面任意移动鼠标时都被触发。
 */
export class DragHandler {
  private dragging = false;

  private readonly onDown = (event: PointerEvent): void => {
    if (this.dragging || !this.enabled()) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    this.dragging = true;
    this.bindDocument();
    this.callbacks.onStart(event.clientX, event.clientY);
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (!this.dragging) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    this.callbacks.onMove(event.clientX, event.clientY);
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (!this.dragging) {
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    this.stop();
    this.callbacks.onEnd();
  };

  private readonly onCancel = (): void => {
    if (!this.dragging) {
      return;
    }

    this.stop();
    this.callbacks.onCancel();
  };

  constructor(
    private readonly target: HTMLElement,
    private readonly enabled: () => boolean,
    private readonly callbacks: DragCallbacks,
  ) {}

  attach(): void {
    this.target.addEventListener('pointerdown', this.onDown);
  }

  detach(): void {
    this.target.removeEventListener('pointerdown', this.onDown);
    this.stop();
  }

  /** 中止进行中的拖动，不触发任何回调（弹窗隐藏 / 重置时用）。 */
  cancel(): void {
    this.stop();
  }

  private stop(): void {
    this.dragging = false;
    this.unbindDocument();
  }

  private bindDocument(): void {
    document.addEventListener('pointermove', this.onMove, { passive: false });
    document.addEventListener('pointerup', this.onUp, { passive: false });
    document.addEventListener('pointercancel', this.onCancel);
  }

  private unbindDocument(): void {
    document.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerup', this.onUp);
    document.removeEventListener('pointercancel', this.onCancel);
  }
}