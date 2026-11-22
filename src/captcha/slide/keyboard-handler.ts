import type { State } from '../core/state';

export interface KeyboardCallbacks {
  /** 应用新的 CSS 像素位移。 */
  onOffset(offset: number): void;
  /** 松开按键后提交一次验证。 */
  onCommit(): void;
}

const STEP = 4;
const STEP_SHIFT = 12;

/** 方向键只提供移动方向，实际步长由是否按住 Shift 决定。 */
const DIRECTIONS: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  Left: -1,
  ArrowRight: 1,
  Right: 1,
};

/** Home/End 直接跳到滑轨两端。 */
const JUMP_KEYS: Readonly<Record<string, 'start' | 'end'>> = {
  Home: 'start',
  End: 'end',
};

/**
 * 滑块键盘操作（无障碍）：方向键移动、Shift 加大步长、Home/End 跳到两端，
 * keyup 时提交一次，长按连续移动不会重复提交。
 */
export class KeyboardHandler {
  private keyUp: (() => void) | null = null;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled()) {
      return;
    }

    const step = event.shiftKey ? STEP_SHIFT : STEP;
    const direction = DIRECTIONS[event.key];
    let next: number | null = null;

    if (direction !== undefined) {
      next = this.state.markOffset + direction * step;
    } else if (Object.prototype.hasOwnProperty.call(JUMP_KEYS, event.key)) {
      next = JUMP_KEYS[event.key] === 'start' ? 0 : this.state.maxOffset;
    }

    if (next === null) {
      return;
    }

    event.preventDefault();
    this.callbacks.onOffset(Math.max(0, Math.min(next, this.state.maxOffset)));
    this.listenKeyUp();
  };

  constructor(
    private readonly target: HTMLElement,
    private readonly state: State,
    private readonly callbacks: KeyboardCallbacks,
  ) {}

  attach(): void {
    this.target.addEventListener('keydown', this.onKeyDown);
  }

  detach(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.clearKeyUp();
  }

  /** 取消尚未触发的 keyup 提交，保留 keydown 绑定。 */
  cancelCommit(): void {
    this.clearKeyUp();
  }

  /** 自移除监听，避免隐藏/重置后残留全局 keyup 导致重复提交。 */
  private listenKeyUp(): void {
    if (this.keyUp) {
      return;
    }

    const handler = (): void => {
      this.clearKeyUp();

      if (this.enabled()) {
        this.callbacks.onCommit();
      }
    };

    this.keyUp = handler;
    document.addEventListener('keyup', handler);
  }

  private clearKeyUp(): void {
    if (this.keyUp) {
      document.removeEventListener('keyup', this.keyUp);
      this.keyUp = null;
    }
  }

  private enabled(): boolean {
    return this.state.type === 'slide' && this.state.imgLoaded && !this.state.busy;
  }
}