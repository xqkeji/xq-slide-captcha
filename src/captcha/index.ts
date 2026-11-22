export { SlideCaptcha } from './slide-captcha';
export { DEFAULT_OPTIONS, resolveOptions } from './core/options';
export type { Copyright, Options } from './core/options';
export { FetchTransport, HttpError } from './core/http';
export type { HttpMethod, Transport } from './core/http';
export type {
  CallbackMap,
  CallbackName,
  CaptchaData,
  CaptchaType,
  CheckResult,
  ClickPoint,
  Theme,
  TrackPoint,
} from './core/types';

import { SlideCaptcha } from './slide-captcha';

/** 页面级默认实例。弹窗 DOM 是单例，一个页面共用它即可。 */
export const slideCaptcha = new SlideCaptcha();

declare global {
  interface Window {
    xqSlideCaptcha?: SlideCaptcha;
  }
}

/** 显式挂到 window，供习惯全局实例的宿主页面使用。 */
export function installGlobal(instance: SlideCaptcha = slideCaptcha): SlideCaptcha {
  window.xqSlideCaptcha = instance;
  return instance;
}