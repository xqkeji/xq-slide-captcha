import {
  BaseCaptcha,
  CaptchaBehaviour,
  type BaseOptions,
  type CaptchaData,
  type CaptchaHooks,
  type TrackPoint,
} from 'xq-captcha-core';
import { resolveOptions, type Options } from './core/options';
import { BOUND_ATTR, SEL } from './core/selectors';
import { CanvasPair } from './render/canvas';
import { loadImage } from './render/image-loader';
import { SlideLayer } from './render/slide-layer';
import { Slider } from './slide/slider';
import { Hint } from './ui/hint';
import { Loading } from './ui/loading';
import { buildModal } from './ui/template';

const HOOKS: CaptchaHooks = {
  logPrefix: 'xq-slide-captcha',
  type: 'slide',
  defaultOptions: resolveOptions({}),
  modalSelector: SEL.modal,
  contentSelector: SEL.content,
  shakeClass: 'xq-captcha-shake',
  messageSelectors: { msgOk: SEL.msgOk, msgError: SEL.msgError },
  triggerClasses: { ripple: 'xq-captcha-ripple', verified: 'xq-captcha-verified' },
  triggerSelector: SEL.trigger,
};

/** 滑动包的类型特有行为；共享 state/dom/options 由基类注入。 */
class SlideBehaviour extends CaptchaBehaviour {
  private canvas!: CanvasPair;
  private layer!: SlideLayer;
  private slider!: Slider;
  private hint!: Hint;
  private loading!: Loading;

  protected override onContextReady(): void {
    this.canvas = new CanvasPair(this.ctx.dom, this.ctx.state);
    this.layer = new SlideLayer(this.canvas, this.ctx.state);
    this.hint = new Hint(this.ctx.dom, this.ctx.options as Options);
    this.loading = new Loading(this.ctx.dom);
    this.slider = new Slider(this.ctx.dom, this.ctx.state, this.layer, (offset, track) => {
      this.ctx.submit({
        captcha_r: String(offset),
        slide_track: JSON.stringify(track),
      });
    });
  }

  buildModal(options: BaseOptions): HTMLElement {
    return buildModal(options as Options);
  }

  attachInteraction(): void {
    this.slider.attach();
  }

  detachInteraction(): void {
    this.slider.detach();
  }

  resetForShow(): void {
    this.slider.suspend();
    this.slider.reset();
  }

  suspendInteraction(): void {
    this.slider.suspend();
  }

  prepareRefresh(): void {
    this.slider.reset();
    this.layer.reset();
    this.canvas.setVisible(false);
    this.canvas.clear();
    this.loading.show();
  }

  async applyData(data: CaptchaData): Promise<void> {
    this.ctx.state.imgWidth = data.bg_width || 240;
    this.ctx.state.imgHeight = data.bg_height || 150;
    this.ctx.state.markWidth = data.mark_width || 50;
    this.ctx.state.markTopY = typeof data.pos_y === 'number' ? data.pos_y : 0;
    this.hint.forSlide();

    this.canvas.resize(this.ctx.state.imgWidth, this.ctx.state.imgHeight);
    this.ctx.emitRefresh();

    try {
      const image = await loadImage(data.image_base64);
      this.canvas.setVisible(true);
      this.canvas.measure();
      this.canvas.drawBackground(image);
      this.canvas.clearMark();
      this.layer.setImage(image);
      this.ctx.state.imgLoaded = true;
      this.loading.hide();
      this.slider.reset();
    } catch (error) {
      console.error('xq-slide-captcha: 验证码图片加载失败', error);
      this.loading.fail();
    }
  }

  markFailures(): void {
    // 滑动包失败不需要额外标记。
  }

  beforeFailRefresh(): void {
    // 无需额外清理，refresh() 会重置滑块。
  }

  override onModalShown(): void {
    this.canvas.measure();
    this.layer.draw();
  }

  get track(): TrackPoint[] {
    return this.slider.track;
  }
}

/**
 * 滑动拼图验证码前端门面。
 * 公开 API 由 xq-captcha-core 的 BaseCaptcha 提供。
 */
export class SlideCaptcha extends BaseCaptcha {
  private readonly slideBehaviour: SlideBehaviour;

  constructor(options: Partial<Options> = {}) {
    const behaviour = new SlideBehaviour();
    super(behaviour, HOOKS, options);
    this.slideBehaviour = behaviour;
  }

  override init(options?: Partial<Options>): this {
    return super.init(options as Partial<BaseOptions>);
  }

  getSlideTrack(): TrackPoint[] {
    return this.slideBehaviour.track;
  }

  protected override bindTools(): void {
    this.bindButton(SEL.close, () => {
      this.callbacks.emit('close');
      this.hide();
    }, BOUND_ATTR);
    this.bindButton(SEL.refresh, () => this.refresh(), BOUND_ATTR);
  }
}
