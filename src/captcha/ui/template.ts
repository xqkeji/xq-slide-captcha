import type { Options } from '../core/options';
import { SEL } from '../core/selectors';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, value);
  }

  return node;
}

/**
 * 弹窗结构：Bootstrap 5 modal 标准骨架 + 组件自有画布层。
 * 选项文字一律走 textContent / setAttribute，不拼 innerHTML，
 * 避免宿主传入的配置被当成标记执行。
 */
export function buildModal(options: Options): HTMLElement {
  const existing = document.querySelector<HTMLElement>(SEL.modal);

  if (existing) {
    return existing;
  }

  const modal = el('div', 'modal fade xq-captcha-modal', {
    id: 'xq-slide-captcha-modal',
    'data-xq-captcha-kind': 'slide',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': '人机验证',
    'aria-hidden': 'true',
    tabindex: '-1',
  });

  const dialog = el('div', 'modal-dialog modal-dialog-centered xq-captcha-dialog');
  const content = el('div', 'modal-content xq-captcha-content');

  const header = el('div', 'modal-header');
  const title = el('h5', 'modal-title h6');
  title.textContent = '安全验证';
  header.append(title);

  if (options.showClose) {
    const close = el('button', 'btn-close xq-captcha-close', {
      type: 'button',
      'aria-label': '关闭',
    });
    header.append(close);
  }

  content.append(header);

  const body = el('div', 'modal-body');

  // 加载态是画布容器的绝对定位覆盖层；容器用 aspect-ratio 撑高，
  // 因此隐藏画布测量缩放比例时布局也不会塌陷。
  const wrap = el('div', `${SEL.canvasWrap.slice(1)} position-relative w-100 overflow-hidden rounded border`);
  const loading = el(
    'div',
    `${SEL.loading.slice(1)} position-absolute top-0 start-0 w-100 h-100 z-3 d-flex flex-column align-items-center justify-content-center gap-2`,
  );
  wrap.append(loading);
  wrap.append(
    el('canvas', `${SEL.bgCanvas.slice(1)} position-relative z-1 d-block w-100 h-auto border-0`, {
      width: '240',
      height: '150',
      'aria-label': '验证码图片',
    }),
  );
  wrap.append(
    el('canvas', `${SEL.markCanvas.slice(1)} position-absolute top-0 start-0 w-100 h-100 z-2 pe-none`, {
      width: '240',
      height: '150',
    }),
  );
  body.append(wrap);

  const error = el('div', 'alert alert-danger fade xq-captcha-alert-error', { role: 'alert' });
  const success = el('div', 'alert alert-success fade xq-captcha-alert-success', {
    role: 'status',
  });
  error.style.display = 'none';
  success.style.display = 'none';
  body.append(error, success);

  const slide = el('div', `${SEL.slideArea.slice(1)} position-relative w-100 overflow-hidden rounded-pill border`);
  const block = el(
    'button',
    `btn btn-primary rounded-circle d-flex align-items-center justify-content-center p-0 user-select-none ${SEL.slideBlock.slice(1)}`,
    {
      type: 'button',
      tabindex: '0',
      role: 'slider',
      'aria-label': '拖动滑块完成拼图',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '0',
    },
  );
  const hint = el('span', `${SEL.slideText.slice(1)} d-flex align-items-center justify-content-center pe-none user-select-none`);
  hint.textContent = options.slideText;

  const progress = el('div', 'progress xq-captcha-progress');
  const bar = el('div', `progress-bar ${SEL.progressBar.slice(1)}`, {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': '0',
  });
  progress.append(bar);

  slide.append(block, hint, progress);
  body.append(slide);
  content.append(body);

  const footer = el('div', 'modal-footer');
  const copyright = el('a', `${SEL.copyright.slice(1)} link-secondary small`, {
    href: options.copyright.url,
    target: '_blank',
    rel: 'noopener noreferrer',
    title: options.copyright.title,
  });
  copyright.textContent = options.copyright.text;
  footer.append(copyright);

  if (options.showRefresh) {
    const refresh = el('button', `btn btn-outline-secondary btn-sm ${SEL.refresh.slice(1)}`, {
      type: 'button',
      'aria-label': '刷新验证码',
    });
    refresh.textContent = '刷新';
    footer.append(refresh);
  }

  content.append(footer);
  dialog.append(content);
  modal.append(dialog);
  document.body.append(modal);

  return modal;
}
