import type { Dom } from '../core/dom';
import type { Options } from '../core/options';
import { SEL } from '../core/selectors';

/** 滑动条区域的提示文字，文案来自配置项 slideText。 */
export class Hint {
  constructor(
    private readonly dom: Dom,
    private readonly options: Options,
  ) {}

  forSlide(): void {
    const node = this.dom.query(SEL.slideText);

    if (!node) {
      return;
    }

    node.textContent = this.options.slideText;
    node.removeAttribute('style');
    node.classList.remove('d-none');
  }
}
