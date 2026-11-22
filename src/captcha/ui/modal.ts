import BootstrapModal from 'bootstrap/js/dist/modal';
import type { Dom } from '../core/dom';
import { CLS, SEL } from '../core/selectors';
import type { CaptchaType } from '../core/types';

const SHAKE_MS = 500;

/**
 * 弹窗外壳。显隐、焦点陷阱、背景遮罩与 body 滚动锁定全部交给
 * Bootstrap 的 Modal JS，组件只负责内容填充与失败抖动。
 */
export class Modal {
  private instance: BootstrapModal | null = null;
  private shakeTimer: number | null = null;
  private shownHandler: (() => void) | null = null;

  private readonly handleShown = (): void => {
    this.shownHandler?.();
  };

  constructor(private readonly dom: Dom) {}

  get element(): HTMLElement | null {
    return this.dom.queryGlobal(SEL.modal);
  }

  /** 弹窗完全显示（含 Bootstrap 过渡）后回调，用于重新测量画布。 */
  onShown(handler: () => void): void {
    this.shownHandler = handler;
  }

  /** buildModal() 之后调用，把静态骨架交给 Bootstrap 管理。 */
  mount(): void {
    const element = this.element;

    if (!element) {
      return;
    }

    element.removeEventListener('shown.bs.modal', this.handleShown);
    element.addEventListener('shown.bs.modal', this.handleShown);

    // 重复 init 不重建实例，否则正在显示的弹窗会留下孤立遮罩。
    if (!this.instance) {
      this.instance = BootstrapModal.getOrCreateInstance(element, {
        backdrop: true,
        keyboard: true,
        focus: true,
      });
    }
  }

  open(): void {
    this.instance?.show();
  }

  close(): void {
    this.instance?.hide();
  }

  setType(type: CaptchaType): void {
    this.element?.setAttribute('data-xq-captcha-type', type);
  }

  shake(): void {
    const content = this.dom.query(SEL.content);

    if (!content) {
      return;
    }

    content.classList.add(CLS.shake);
    this.clearShakeTimer();
    this.shakeTimer = window.setTimeout(() => {
      content.classList.remove(CLS.shake);
      this.shakeTimer = null;
    }, SHAKE_MS);
  }

  dispose(): void {
    this.clearShakeTimer();
    this.element?.removeEventListener('shown.bs.modal', this.handleShown);
    this.instance?.hide();
    this.instance?.dispose();
    this.instance = null;

    // hide() 的过渡回调依赖元素上的 transitionend；元素马上被移除时不会触发，
    // 因此这里补一次收尾，避免留下孤立遮罩和 body 滚动锁。
    if (!document.querySelector('.modal.show')) {
      for (const backdrop of document.querySelectorAll('.modal-backdrop')) {
        backdrop.remove();
      }
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
    }

    this.element?.remove();
  }

  private clearShakeTimer(): void {
    if (this.shakeTimer !== null) {
      clearTimeout(this.shakeTimer);
      this.shakeTimer = null;
    }
  }
}
