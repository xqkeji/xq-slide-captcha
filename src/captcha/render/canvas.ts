import type { Dom } from '../core/dom';
import { SEL } from '../core/selectors';
import type { State } from '../core/state';

export function context2d(
  canvas: HTMLCanvasElement,
  willReadFrequently = false,
): CanvasRenderingContext2D | null {
  return canvas.getContext('2d', { willReadFrequently });
}

/**
 * 背景画布与标记画布。两者尺寸始终一致：
 * 背景画布承载验证码图片，标记画布叠在其上画滑块 / 点击序号。
 */
export class CanvasPair {
  constructor(
    private readonly dom: Dom,
    private readonly state: State,
  ) {}

  get bg(): HTMLCanvasElement | null {
    return this.dom.query<HTMLCanvasElement>(SEL.bgCanvas);
  }

  get mark(): HTMLCanvasElement | null {
    return this.dom.query<HTMLCanvasElement>(SEL.markCanvas);
  }

  /** 画布像素尺寸随后端下发的 bg_width / bg_height 走，坐标换算才不失真。 */
  resize(width: number, height: number): void {
    for (const canvas of [this.bg, this.mark]) {
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
    }
  }

  clear(): void {
    for (const canvas of [this.bg, this.mark]) {
      const ctx = canvas && context2d(canvas);
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  clearMark(): void {
    const canvas = this.mark;
    const ctx = canvas && context2d(canvas);
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  setVisible(visible: boolean): void {
    for (const canvas of [this.bg, this.mark]) {
      if (canvas) {
        canvas.style.display = visible ? 'block' : 'none';
      }
    }
  }

  /** 必须在画布可见后测量：display:none 时 getBoundingClientRect() 恒为 0。 */
  measure(): void {
    const canvas = this.bg;

    if (!canvas || canvas.width <= 0) {
      return;
    }

    // 优先量画布自身：它就是 offset 折算的基准 bg_width / 实际显示宽度。
    // 容器 rect 含 1px 边框，会把折算后的 offset 系统性算小 ~0.6%，白吃容差。
    const wrap = this.dom.query(SEL.canvasWrap);
    const width =
      canvas.getBoundingClientRect().width ||
      wrap?.clientWidth ||
      canvas.width;
    this.state.scale = width / canvas.width;
    this.state.invScale = canvas.width / width;
  }

  /** 滑动图画布里只画合成图第 0 段（带缺口背景），点击图整张即背景。 */
  drawBackground(image: HTMLImageElement): void {
    const canvas = this.bg;
    const ctx = canvas && context2d(canvas);

    if (!canvas || !ctx) {
      return;
    }

    const { imgWidth, imgHeight } = this.state;
    ctx.drawImage(image, 0, 0, imgWidth, imgHeight, 0, 0, imgWidth, imgHeight);
  }
}