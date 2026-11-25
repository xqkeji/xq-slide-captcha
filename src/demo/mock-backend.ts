import type { HttpMethod, Transport } from '../captcha/core/http';
import type { CaptchaData } from '../captcha/core/types';
import { renderSlide } from './mock-images';

export type MockMode = 'dual' | 'backend_only';

const WIDTH = 240;
const HEIGHT = 150;
const MARK_WIDTH = 50;
const MARK_HEIGHT = 50;
const SLIDE_TOLERANCE = 8;
const MIN_TRACK_TIME = 200;
const MIN_TRACK_POINTS = 3;
const LATENCY_MS = 120;
/** 同时保留多少轮挑战（模拟双击 init / 多标签页时旧图仍可校验）。 */
const KEEP_CHALLENGES = 5;

interface Pending {
  posX: number;
  token: string | null;
  answered: boolean;
  used: boolean;
}

function fail(message: string): string {
  return JSON.stringify({ code: 202, message, token: null });
}

function ok(token: string | null, message: string): string {
  return JSON.stringify({ code: 200, message, token });
}

function newChallengeId(): string {
  return Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-8);
}

/**
 * 演示页的本地后端：实现与 xqkeji 扩展的 captchadata / captchacheck 相同的契约，
 * 但答案就存在浏览器内存里，因此毫无安全性可言，仅用于跑通组件。
 *
 * 与真实服务端对齐的两点：
 * 1. 每轮出图都带 challenge_id，答案按 id 存，校验时按 id 取 —— 旧图拿旧 id 仍可校验；
 * 2. 不带 challenge_id 时退回「最近一轮」的旧路径，用于灰度兼容。
 */
export class MockBackend implements Transport {
  private mode: MockMode = 'dual';
  private readonly challenges = new Map<string, Pending>();
  private latestId: string | null = null;

  configure(mode: MockMode): void {
    this.mode = mode;
    this.challenges.clear();
    this.latestId = null;
  }

  async request(method: HttpMethod, _url: string, data?: Record<string, unknown>): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

    return method === 'GET' ? this.generate() : this.check(data ?? {});
  }

  private generate(): string {
    const image = renderSlide(WIDTH, HEIGHT, MARK_WIDTH, MARK_HEIGHT);
    const challengeId = newChallengeId();

    this.challenges.set(challengeId, {
      posX: image.posX,
      token: null,
      answered: false,
      used: false,
    });
    this.latestId = challengeId;
    this.trim();

    const data: CaptchaData = {
      success: true,
      type: 'slide',
      image_base64: image.dataUri,
      challenge_id: challengeId,
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
    // 带 token 的是宿主表单提交后的二次校验（dual 模式），令牌用过即毁。
    // 组件自身的校验请求不会带 token（见 core 的 buildCheckPayload）。
    if (typeof data.token === 'string') {
      return this.checkToken(data.token);
    }

    const pending = this.resolve(data);

    if (!pending) {
      return fail('验证码已过期，请刷新重试');
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

    pending.token = newChallengeId();

    return ok(pending.token, '验证成功，请完成后续操作');
  }

  /** 宿主表单提交后的二次校验：令牌用过即毁。 */
  private checkToken(token: string): string {
    for (const pending of this.challenges.values()) {
      if (pending.token !== token) {
        continue;
      }

      if (pending.used) {
        return fail('验证令牌已被使用，请重新验证');
      }

      pending.used = true;

      return ok(null, '二次验证成功');
    }

    return fail('验证令牌无效');
  }

  /**
   * 仅演示页调试用：读某一轮的真实答案。
   * 真实后端的答案永远不会下发，这里只是为了让本地验收脚本能构造「正确的一次拖动」。
   */
  peek(challengeId: string): { posX: number } | null {
    const pending = this.challenges.get(challengeId);

    return pending ? { posX: pending.posX } : null;
  }

  /** 有 challenge_id 就精确取，没有则退回最近一轮（灰度兼容）。 */
  private resolve(data: Record<string, unknown>): Pending | null {
    const id =
      typeof data.challenge_id === 'string' && data.challenge_id !== ''
        ? data.challenge_id
        : this.latestId;

    return id ? (this.challenges.get(id) ?? null) : null;
  }

  private checkSlide(pending: Pending, data: Record<string, unknown>): string | null {
    // 服务端对字段名做了兼容，这里也跟着兼容几种偏移量写法。
    const raw = data.offset ?? data.captcha_r ?? data.pos_x ?? data.slide_offset;
    const offset = Number(raw);

    if (raw === undefined || raw === null || !Number.isFinite(offset)) {
      return '无效的偏移量';
    }

    if (Math.abs(offset - pending.posX) > SLIDE_TOLERANCE) {
      return '验证失败，请重试';
    }

    // 轨迹字段名同样兼容，数组或 JSON 字符串都收。
    const rawTrack = data.track ?? data.slide_track ?? data.track_points ?? [];
    let track: unknown = rawTrack;

    if (typeof track === 'string') {
      try {
        track = JSON.parse(track);
      } catch {
        return '轨迹数据无效，请重试';
      }
    }

    if (!Array.isArray(track) || track.length < MIN_TRACK_POINTS) {
      return '轨迹数据无效，请重试';
    }

    const points = track.map((point) => {
      const record = (point ?? {}) as Record<string, unknown>;

      return {
        t: Number(record.t),
      };
    });

    if (points.some((point) => !Number.isFinite(point.t))) {
      return '轨迹数据无效，请重试';
    }

    for (let index = 1; index < points.length; index += 1) {
      if (points[index].t < points[index - 1].t) {
        return '轨迹数据无效，请重试';
      }
    }

    const totalTime = points[points.length - 1].t - points[0].t;

    if (totalTime < MIN_TRACK_TIME) {
      return '操作过快，请重试';
    }

    return null;
  }

  private trim(): void {
    while (this.challenges.size > KEEP_CHALLENGES) {
      const oldest = this.challenges.keys().next().value;

      if (oldest === undefined || oldest === this.latestId) {
        break;
      }

      this.challenges.delete(oldest);
    }
  }
}
