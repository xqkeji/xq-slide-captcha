import type { Dom } from '../core/dom';
import { SEL } from '../core/selectors';
import type { Theme as ThemeName } from '../core/types';

/**
 * 主题统一走 Bootstrap 5.3 的 `data-bs-theme`。
 * Bootstrap 没有内置的 auto 模式，按官方做法把 prefers-color-scheme
 * 解析成 light/dark 后写入属性，并跟随系统变化。
 */
export class Theme {
  private requested: ThemeName = 'auto';
  private media: MediaQueryList | null = null;
  private readonly onSystemChange = (): void => {
    if (this.requested === 'auto') {
      this.write(this.resolveAuto());
    }
  };

  constructor(private readonly dom: Dom) {}

  apply(theme: ThemeName): void {
    this.requested = theme || 'auto';
    this.watchSystem(this.requested === 'auto');
    this.write(this.resolve());
  }

  dispose(): void {
    this.watchSystem(false);
  }

  private resolve(): 'light' | 'dark' {
    return this.requested === 'auto' ? this.resolveAuto() : this.requested;
  }

  private resolveAuto(): 'light' | 'dark' {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private write(value: 'light' | 'dark'): void {
    // 只写自己的弹窗，避免同页多个实例互相覆盖页面级主题。
    this.dom.queryGlobal(SEL.modal)?.setAttribute('data-bs-theme', value);
  }

  private watchSystem(enable: boolean): void {
    if (!enable || typeof window.matchMedia !== 'function') {
      this.media?.removeEventListener('change', this.onSystemChange);
      this.media = null;
      return;
    }

    if (this.media) {
      return;
    }

    this.media = window.matchMedia('(prefers-color-scheme: dark)');
    this.media.addEventListener('change', this.onSystemChange);
  }
}
