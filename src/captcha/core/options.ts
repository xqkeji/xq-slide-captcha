import {
  BASE_OPTIONS,
  createTransport as createCoreTransport,
  resolveOptions as resolveCoreOptions,
  type BaseOptions,
  type Transport,
} from 'xq-captcha-core';

/** 滑动包特有配置：滑轨提示文案。 */
export interface Options extends BaseOptions {
  slideText: string;
}

export const DEFAULT_OPTIONS: Options = {
  ...BASE_OPTIONS,
  slideText: '拖动左边滑块完成上方拼图',
};

export function resolveOptions(overrides: Partial<Options> = {}): Options {
  return resolveCoreOptions(DEFAULT_OPTIONS, overrides);
}

export function createTransport(options: Options): Transport {
  return createCoreTransport(options);
}

export type { Copyright } from 'xq-captcha-core';
