// 组件库入口：ESM/CJS 构建与浏览器 IIFE 构建共用。
// 组件本体在 ../captcha，演示页入口在 ../main.ts（不参与库构建）。
import { slideCaptcha } from '../captcha/index';

export * from '../captcha/index';
export { SlideCaptcha as default } from '../captcha/slide-captcha';

// 供 <script> 直接引入的宿主取用，与 installGlobal() 共用同一个页面级实例。
if (typeof window !== 'undefined') {
  window.xqSlideCaptcha = slideCaptcha;
}
