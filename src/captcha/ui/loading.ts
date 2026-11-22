import type { Dom } from '../core/dom';
import { CLS, SEL } from '../core/selectors';

/** 画布加载态：Bootstrap spinner-border，失败时换成可重试文案。 */
export class Loading {
  constructor(private readonly dom: Dom) {}

  show(): void {
    const node = this.element;

    if (!node) {
      return;
    }

    const spinner = document.createElement('div');
    spinner.className = 'spinner-border text-primary';
    spinner.setAttribute('role', 'status');

    const label = document.createElement('span');
    label.className = 'visually-hidden';
    label.textContent = '加载中';
    spinner.append(label);

    const caption = document.createElement('span');
    caption.textContent = '加载中...';

    node.replaceChildren(spinner, caption);
    node.classList.remove(CLS.loadingError);
    node.classList.remove(CLS.hidden);
  }

  hide(): void {
    const node = this.element;

    if (!node) {
      return;
    }

    node.replaceChildren();
    node.classList.remove(CLS.loadingError);
    node.classList.add(CLS.hidden);
  }

  fail(): void {
    const node = this.element;

    if (!node) {
      return;
    }

    const text = document.createElement('div');
    text.className = 'text-danger small fw-semibold text-center';
    text.append('加载失败', document.createElement('br'), '请刷新重试');

    node.replaceChildren(text);
    node.classList.add(CLS.loadingError);
    node.classList.remove(CLS.hidden);
  }

  private get element(): HTMLElement | null {
    return this.dom.query(SEL.loading);
  }
}
