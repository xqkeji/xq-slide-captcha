import type { Dom } from '../core/dom';
import { CLS, SEL } from '../core/selectors';
import type { State } from '../core/state';
import type { TrackPoint } from '../core/types';
import type { SlideLayer } from '../render/slide-layer';
import { DragHandler } from './drag-handler';
import { KeyboardHandler } from './keyboard-handler';
import { TrackRecorder } from './track-recorder';

/**
 * 滑块交互编排：拖动与键盘两条输入路径汇到同一套位移应用与提交逻辑。
 * 位移状态同步更新，绘制走 requestAnimationFrame，提交时不会读到滞后的偏移。
 */
export class Slider {
  private readonly recorder = new TrackRecorder();
  private drag: DragHandler | null = null;
  private keyboard: KeyboardHandler | null = null;
  private startClientX = 0;
  private startClientY = 0;

  constructor(
    private readonly dom: Dom,
    private readonly state: State,
    private readonly layer: SlideLayer,
    private readonly onCommit: (offset: number, track: TrackPoint[]) => void,
  ) {}

  get track(): TrackPoint[] {
    return this.recorder.samples;
  }

  attach(): void {
    const block = this.block;

    if (!block) {
      return;
    }

    // init 可重复调用，先解绑再绑，避免同一滑块挂上多份 pointerdown。
    this.detach();

    this.drag = new DragHandler(block, () => this.enabled(), {
      onStart: (x, y) => this.start(x, y),
      onMove: (x, y) => this.move(x, y),
      onEnd: () => this.submit(),
      onCancel: () => this.abort(),
    });

    this.keyboard = new KeyboardHandler(block, this.state, {
      onOffset: (offset) => this.keyMove(offset),
      onCommit: () => this.submit(),
    });

    this.drag.attach();
    this.keyboard.attach();
  }

  detach(): void {
    this.drag?.detach();
    this.keyboard?.detach();
    this.drag = null;
    this.keyboard = null;
  }

  /** 新一轮验证码：滑块归零、轨迹清空。 */
  reset(): void {
    this.recorder.reset();
    this.state.markOffset = 0;
    this.paint();
  }

  /** 弹窗隐藏 / 重置：中止进行中的拖动与待触发的键盘提交，保留事件绑定。 */
  suspend(): void {
    this.drag?.cancel();
    this.keyboard?.cancelCommit();
    this.state.cancelFrame();
    this.state.moving = false;
    this.block?.classList.remove(CLS.dragging);
  }

  private start(clientX: number, clientY: number): void {
    this.startClientX = clientX;
    this.startClientY = clientY;
    this.state.busy = true;
    this.state.moving = true;
    this.recorder.begin();
    this.block?.classList.add(CLS.dragging);
  }

  private move(clientX: number, clientY: number): void {
    const offset = Math.max(0, Math.min(clientX - this.startClientX, this.state.maxOffset));
    const inverse = this.state.scale > 0 ? 1 / this.state.scale : 1;

    this.recorder.record(
      offset * inverse,
      this.state.markTopY + (clientY - this.startClientY) * inverse,
    );

    if (offset === this.state.markOffset) {
      return;
    }

    this.state.markOffset = offset;
    this.state.cancelFrame();
    this.state.rafId = requestAnimationFrame(() => {
      this.paint();
      this.state.rafId = null;
    });
  }

  private keyMove(offset: number): void {
    if (!this.recorder.started) {
      this.recorder.begin();
    }

    this.recorder.record(offset * this.state.invScale, this.state.markTopY);
    this.state.markOffset = offset;
    this.paint();
  }

  private submit(): void {
    this.state.cancelFrame();
    this.state.moving = false;
    this.state.busy = true;
    this.block?.classList.remove(CLS.dragging);
    this.paint();

    this.onCommit(Math.round(this.state.markOffset * this.state.invScale), this.recorder.samples);
  }

  /** 手势被系统打断：不提交，回到可再次拖动的状态。 */
  private abort(): void {
    this.state.cancelFrame();
    this.state.moving = false;
    this.state.busy = false;
    this.block?.classList.remove(CLS.dragging);
    this.reset();
  }

  private paint(): void {
    const block = this.block;
    const offset = this.state.markOffset;
    const max = this.state.maxOffset;
    const percent = max > 0 ? Math.round((offset / max) * 100) : 0;

    if (block) {
      block.style.transform = `translateX(${offset}px)`;
      block.setAttribute('aria-valuenow', String(percent));
    }

    const bar = this.dom.query(SEL.progressBar);
    if (bar) {
      bar.style.width = `${percent}%`;
      bar.setAttribute('aria-valuenow', String(percent));
    }

    this.layer.draw();
  }

  private enabled(): boolean {
    return this.state.type === 'slide' && this.state.imgLoaded && !this.state.busy;
  }

  private get block(): HTMLElement | null {
    return this.dom.query(SEL.slideBlock);
  }
}