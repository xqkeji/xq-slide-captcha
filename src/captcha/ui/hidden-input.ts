import type { Dom } from '../core/dom';
import type { Options } from '../core/options';

/**
 * 验证通过后写进表单的一次性令牌。
 * backend_only 模式后端不发令牌，此时必须移除残留输入框，
 * 否则会向表单提交一个无效值。
 *
 * 查找与写入限定在触发器所属表单内，避免同页多个验证码实例共用默认
 * inputName（xq_captcha_token）时互相串写。
 */
export class HiddenInput {
  private form: HTMLFormElement | null = null;

  constructor(
    private readonly dom: Dom,
    private readonly options: Options,
  ) {}

  sync(token: string | null): void {
    const name = this.options.inputName;

    if (!name) {
      return;
    }

    const trigger = this.dom.queryGlobal(this.options.handleDom);

    if (trigger) {
      this.form = trigger.closest('form');
    }

    const scope: ParentNode = this.form ?? document;
    const existing = this.find(name, scope);

    if (!token) {
      existing?.remove();
      return;
    }

    if (existing) {
      existing.value = token;
      return;
    }

    if (!trigger) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = token;

    if (this.form) {
      this.form.append(input);
    } else {
      trigger.parentNode?.insertBefore(input, trigger.nextSibling);
    }
  }

  remove(): void {
    if (this.options.inputName) {
      this.find(this.options.inputName, this.form ?? document)?.remove();
    }
  }

  private find(name: string, scope: ParentNode): HTMLInputElement | null {
    return scope.querySelector<HTMLInputElement>(`input[name="${CSS.escape(name)}"]`);
  }
}
