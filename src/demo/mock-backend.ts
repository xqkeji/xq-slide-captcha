import type { HttpMethod, Transport } from '../captcha/core/http';
import type { CaptchaData } from '../captcha/core/types';
import { renderSlide } from './mock-images';

export type MockMode = 'dual' | 'backend_only';

const WIDTH = 240;
const HEIGHT = 150;
const MARK_WIDTH = 50;
const MARK_HEIGHT = 50;
const SLIDE_TOLERANCE = 3;
const MIN_TRACK_TIME = 200;
const LATENCY_MS = 120;

interface Pending {
  posX: number;
  token: string | null;
  answered: boolean;
  used: boolean;
}

function fail(message: string): string {
  return JSON.stringify({ success: false, token: null, message });
}

function ok(token: string | null, message: string): string {
  return JSON.stringify({ success: true, token, message });
}

/**
 * 演示页的本地后端：实现与 xq-app-admin 的 /admin/user/captchadata、/admin/user/captchacheck 相同的请求/响应契约，
 * 但答案就存在浏览器内存里，因此毫无安全性可言，仅用于跑通组件。
 * 接真实后端时把 transport 换回内置 fetch 即可。
 */
export class MockBackend implements Transport {
  private mode: MockMode = 'dual';
  private pending: Pending | null = null;

  configure(mode: MockMode): void {
    this.mode = mode;
    this.pending = null;
  }

  async request(method: HttpMethod, _url: string, data?: Record<string, unknown>): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

    return method === 'GET' ? this.generate() : this.check(data ?? {});
  }

  private generate(): string {
    const image = renderSlide(WIDTH, HEIGHT, MARK_WIDTH, MARK_HEIGHT);
    this.pending = { posX: image.posX, token: null, answered: false, used: false };

    const data: CaptchaData = {
      success: true,
      type: 'slide',
      image_base64: image.dataUri,
      bg_width: WIDTH,
      bg_height: HEIGHT,
      mark_width: MARK_WIDTH,
      mark_height: MARK_HEIGHT,
      pos_y: image.posY,
      hint: '拖动左边滑块完成上方拼图',
    };

    return JSON.stringify(data);
  }

  private check(data: Record<string, unknown>): string {
    const pending = this.pending;

    if (!pending) {
      return fail('验证码已过期，请刷新重试');
    }

    if (typeof data.token === 'string') {
      return this.checkToken(pending, data.token);
    }

    // backend_only：不带令牌的表单提交凭会话已验证状态幂等放行，与后端口径一致。
    if (this.mode === 'backend_only' && pending.answered) {
      return ok(null, '验证成功');
    }

    // 与后端一致：首次通过即作废答案，重放同一份偏移不再放行。
    if (pending.answered) {
      return fail('验证码已失效，请刷新重试');
    }

    const reason = this.checkSlide(pending, data);

    if (reason) {
      return fail(reason);
    }

    pending.answered = true;

    if (this.mode === 'backend_only') {
      return ok(null, '验证成功');
    }

    pending.token = Math.random().toString(36).slice(2) + Date.now().toString(36);

    return ok(pending.token, '验证成功，请完成后续操作');
  }

  private checkToken(pending: Pending, token: string): string {
    if (!pending.token || pending.token !== token) {
      return fail('验证令牌无效');
    }

    if (pending.used) {
      return fail('验证令牌已被使用，请重新验证');
    }

    pending.used = true;

    return ok(null, '二次验证成功');
  }

  private checkSlide(pending: Pending, data: Record<string, unknown>): string | null {
    const offset = Number(data.captcha_r);

    if (!Number.isFinite(offset)) {
      return '无效的偏移量';
    }

    if (Math.abs(offset - pending.posX) > SLIDE_TOLERANCE) {
      return '验证失败，请重试';
    }

    const track = data.slide_track;

    if (Array.isArray(track) && track.length >= 3) {
      const totalTime = Math.max(...track.map((point) => Number(point?.t) || 0));

      if (totalTime < MIN_TRACK_TIME) {
        return '操作过快，请重试';
      }
    }

    return null;
  }
}