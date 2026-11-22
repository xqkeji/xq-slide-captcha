import type { TrackPoint } from '../core/types';

/**
 * 滑动轨迹。坐标一律是图片像素（与后端 posX/posY 同一坐标系），
 * t 是相对本次拖动/按键起点的毫秒数。
 */
export class TrackRecorder {
  private points: TrackPoint[] = [];
  private start = 0;

  get samples(): TrackPoint[] {
    return this.points;
  }

  get started(): boolean {
    return this.start > 0;
  }

  begin(): void {
    this.points = [];
    this.start = Date.now();
  }

  record(x: number, y: number): void {
    this.points.push({
      x: Math.round(x),
      y: Math.round(y),
      t: Date.now() - this.start,
    });
  }

  reset(): void {
    this.points = [];
    this.start = 0;
  }
}