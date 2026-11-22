import type { Dom } from '../core/dom';
import type { Options } from '../core/options';
import { CLS, SEL } from '../core/selectors';

/** 触发按钮。页面上可以有多个，全部同步到同一状态；外观交给 Bootstrap btn。 */
export class Trigger {
  private readonly bound = new Set<HTMLElement>();
  private handler: (() => void) | null = null;

  constructor(
    private readonly dom: Dom,
    private readonly options: Options,
  ) {}

  bind(onOpen: () => void): void {
    // init 每次传入的都是新闭包；先解绑旧的，否则 detach 会移除错的那个，
    // 已绑定节点上留下永远解不掉的监听。
    this.detach();
    this.handler = onOpen;

    for (const node of this.nodes()) {
      node.classList.add('btn', 'btn-outline-primary');
      this.render(node, this.options.placeholder, this.options.showRipple);
      this.bound.add(node);
      node.addEventListener('click', onOpen);
    }
  }

  detach(): void {
    if (this.handler) {
      for (const node of this.bound) {
        node.removeEventListener('click', this.handler);
      }
    }

    this.bound.clear();
    this.handler = null;
  }

  showPlaceholder(): void {
    this.renderAll(this.options.placeholder, this.options.showRipple);
  }

  showSuccess(): void {
    this.renderAll(this.options.successText, false);
  }

  showFail(): void {
    this.renderAll(this.options.failText, false);
  }

  private renderAll(text: string, ripple: boolean): void {
    for (const node of this.nodes()) {
      this.render(node, text, ripple);
    }
  }

  private render(node: HTMLElement, text: string, ripple: boolean): void {
    node.textContent = text;
    node.classList.remove(CLS.verified);
    node.classList.toggle(CLS.ripple, ripple);
  }

  private nodes(): HTMLElement[] {
    return this.dom.queryAll(this.options.handleDom || SEL.trigger);
  }
}
