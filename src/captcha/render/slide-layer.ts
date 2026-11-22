import type { State } from '../core/state';
import { type CanvasPair, context2d } from './canvas';

/**
 * 滑块图层。合成图第 1 段是「滑块条」：底色为纯深色，拼图块叠在其上。
 * 这里用「窗口平均亮度 - 参考底色」的差分给每个像素算 alpha：
 * 与底色接近的像素透明，差异越大的像素越不透明，天然形成羽化边缘。
 *
 * 该算法只依赖一次 getImageData，拖拽逐帧仍然只做 drawImage。
 */

/** Rec.601 亮度权重，放大 256 倍后用整数运算。 */
const LUMA_RED = 77;
const LUMA_GREEN = 150;
const LUMA_BLUE = 29;
/** 3 像素横向滑动窗口的半径。 */
const WINDOW_RADIUS = 1;
/** 每行取几个采样列估计底色，避开拼图块。 */
const REFERENCE_SAMPLES = 5;
/** 差分低于此值完全透明，达到此值 + RAMP 完全不透明。 */
const ALPHA_BASE = 5;
const ALPHA_RAMP = 15;

/** 滑块图层。边缘抠图只在图片加载时算一次。 */
export class SlideLayer {
  private image: HTMLImageElement | null = null;
  private prepared: HTMLCanvasElement | null = null;

  constructor(
    private readonly canvas: CanvasPair,
    private readonly state: State,
  ) {}

  reset(): void {
    this.image = null;
    this.prepared = null;
  }

  setImage(image: HTMLImageElement): void {
    this.image = image;
    this.prepared = null;

    if (this.state.type === 'slide') {
      this.prepare(image);
    }
  }

  draw(): void {
    if (this.state.type !== 'slide') {
      return;
    }

    const canvas = this.canvas.mark;
    const ctx = canvas && context2d(canvas, true);

    if (!canvas || !ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // CSS 空间偏移换算回图片空间，滑块才能与缺口对齐。
    const drawOffset = this.state.markOffset * this.state.invScale;
    const drawWidth = Math.min(this.state.markWidth, canvas.width - drawOffset);

    if (drawWidth <= 0) {
      return;
    }

    const height = this.state.imgHeight;

    if (this.prepared) {
      ctx.drawImage(this.prepared, 0, 0, drawWidth, height, drawOffset, 0, drawWidth, height);
    } else if (this.image) {
      // 兜底：抠图失败时直接用合成图第 1 段（滑块条）。
      ctx.drawImage(this.image, 0, height, drawWidth, height, drawOffset, 0, drawWidth, height);
    }
  }

  private prepare(image: HTMLImageElement): void {
    const width = this.state.markWidth;
    const height = this.state.imgHeight;
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;

    const ctx = context2d(layer, true);

    if (!ctx) {
      return;
    }

    ctx.drawImage(image, 0, height, width, height, 0, 0, width, height);

    try {
      const pixels = ctx.getImageData(0, 0, width, height);
      cutOutBackdrop(pixels.data, width, height);
      ctx.putImageData(pixels, 0, 0);
    } catch (error) {
      console.warn('xq-slide-captcha: 滑块图层抠图失败，回退到原图', error);
    }

    this.prepared = layer;
  }
}

/**
 * 逐行做一次横向窗口平均，再把该行采样列的最小值当作底色参考；
 * 每个像素的 alpha 由它与参考值的差经线性斜坡得到。
 */
function cutOutBackdrop(data: Uint8ClampedArray, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    const row = windowAverages(data, width, y);
    const reference = estimateBackdrop(row);

    for (let x = 0; x < width; x++) {
      const delta = Math.max(0, row[x] - reference);
      const alpha = Math.max(0, Math.min(255, Math.round(((delta - ALPHA_BASE) / ALPHA_RAMP) * 255)));
      const i = (y * width + x) * 4;

      if (alpha < data[i + 3]) {
        data[i + 3] = alpha;
      }
    }
  }
}

/** 3 像素盒式滤波后的一行亮度。 */
function windowAverages(data: Uint8ClampedArray, width: number, y: number): Float32Array {
  const result = new Float32Array(width);

  for (let x = 0; x < width; x++) {
    let total = 0;
    let count = 0;

    for (let dx = -WINDOW_RADIUS; dx <= WINDOW_RADIUS; dx++) {
      const sx = x + dx;

      if (sx < 0 || sx >= width) {
        continue;
      }

      const i = (y * width + sx) * 4;
      total += (data[i] * LUMA_RED + data[i + 1] * LUMA_GREEN + data[i + 2] * LUMA_BLUE) / 256;
      count++;
    }

    result[x] = count > 0 ? total / count : 0;
  }

  return result;
}

/** 取一行里最暗的几个采样点，作为拼图块之外的底色亮度。 */
function estimateBackdrop(row: Float32Array): number {
  let lowest = Number.POSITIVE_INFINITY;
  const last = row.length - 1;

  for (let s = 0; s < REFERENCE_SAMPLES; s++) {
    const x = Math.min(last, Math.round((s * last) / (REFERENCE_SAMPLES - 1)));
    lowest = Math.min(lowest, row[x] ?? 0);
  }

  return Number.isFinite(lowest) ? lowest : 0;
}
