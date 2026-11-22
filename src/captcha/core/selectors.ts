/**
 * 组件内部 DOM 契约。除公开的触发元素 `.xq-captcha` 外，所有类名都使用
 * `xq-captcha-*` 命名空间；弹窗骨架采用 Bootstrap 5 的 modal 标记。
 * 复位事件 `xq.form.error` 属于公开契约，保持不变。
 */

export const SEL = {
  /** 唯一公开的触发选择器，宿主页面按此放置触发元素。 */
  trigger: '.xq-captcha',
  modal: '#xq-slide-captcha-modal',
  dialog: '.xq-captcha-dialog',
  content: '.xq-captcha-content',
  loading: '.xq-captcha-loading',
  canvasWrap: '.xq-captcha-canvas-wrap',
  bgCanvas: '.xq-captcha-bg-canvas',
  markCanvas: '.xq-captcha-mark-canvas',
  msgError: '.xq-captcha-alert-error',
  msgOk: '.xq-captcha-alert-success',
  slideArea: '.xq-captcha-slide-area',
  slideBlock: '.xq-captcha-slide-block',
  slideText: '.xq-captcha-slide-hint',
  close: '.xq-captcha-close',
  refresh: '.xq-captcha-refresh',
  copyright: '.xq-captcha-copyright',
  progressBar: '.xq-captcha-progress-bar',
} as const;

export const CLS = {
  ripple: 'xq-captcha-ripple',
  verified: 'xq-captcha-verified',
  dragging: 'xq-captcha-dragging',
  shake: 'xq-captcha-shake',
  loadingError: 'xq-captcha-loading-error',
  hidden: 'd-none',
} as const;

/** 标记「已绑定」的 dataset 键，对应属性 data-xq-captcha-bound。 */
export const BOUND_ATTR = 'xqCaptchaBound';

/** 宿主表单提交失败时派发的事件；仅当表单内含本组件才复位。 */
export const FORM_ERROR_EVENT = 'xq.form.error';
