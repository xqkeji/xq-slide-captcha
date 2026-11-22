import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { domReady } from 'xq-util';
import { SlideCaptcha } from './captcha/slide-captcha';
import { FetchTransport, type Transport } from './captcha/core/http';
import type { Theme } from './captcha/core/types';
import { parseCheckResponse } from './captcha/verify/response';
import { MockBackend, type MockMode } from './demo/mock-backend';
import './styles/index.scss';
import './styles/demo.scss';

const DATA_URL = '/admin/user/captchadata';
const CHECK_URL = '/admin/user/captchacheck';
const INPUT_NAME = 'xq_captcha_token';
const LOG_LIMIT = 60;

// 演示页默认用浏览器内模拟后端；改为 true 即切到 xq-app-admin 真实接口。
// 组件请求与下面的表单二次验证共用同一个 transport 实例。
const USE_REAL_BACKEND = false;
const backend: Transport = USE_REAL_BACKEND
  ? new FetchTransport(10000)
  : new MockBackend();
let captcha = new SlideCaptcha();

function node<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function log(text: string): void {
  const list = node<HTMLOListElement>('demo-log');
  const item = document.createElement('li');

  item.textContent = `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${text}`;
  list.append(item);

  while (list.children.length > LOG_LIMIT) {
    list.firstElementChild?.remove();
  }

  list.scrollTop = list.scrollHeight;
}

function renderState(): void {
  const input = node<HTMLFormElement>('demo-form').querySelector<HTMLInputElement>(
    `input[name="${INPUT_NAME}"]`,
  );

  node<HTMLPreElement>('demo-state').textContent = JSON.stringify(
    {
      type: captcha.getCaptchaType(),
      result: captcha.result(),
      token: captcha.getToken(),
      hiddenInput: input?.value ?? null,
      slideTrack: captcha.getSlideTrack(),
    },
    null,
    2,
  );
}

function showSubmitResult(success: boolean, message: string): void {
  const box = node<HTMLDivElement>('demo-submit-result');

  box.replaceChildren();
  box.className = `alert ${success ? 'alert-success' : 'alert-danger'} py-2 small`;
  box.textContent = message;
}

function build(): void {
  captcha.dispose();
  if (backend instanceof MockBackend) {
    backend.configure(node<HTMLSelectElement>('demo-mode').value as MockMode);
  }

  captcha = new SlideCaptcha();
  captcha.init({
    dataUrl: DATA_URL,
    checkUrl: CHECK_URL,
    inputName: INPUT_NAME,
    theme: node<HTMLSelectElement>('demo-theme').value as Theme,
    transport: backend,
  });

  captcha
    .onSuccess((token) => {
      log(`success token=${token ?? 'null'}`);
      renderState();
    })
    .onFail((message) => {
      log(`fail ${message}`);
      renderState();
    })
    .onRefresh((type, switched) => {
      log(`refresh type=${type} switched=${switched}`);
      renderState();
    })
    .onShow(() => {
      log('show');
      renderState();
    })
    .onHide(() => {
      log('hide');
      renderState();
    })
    .onClose(() => {
      log('close');
      renderState();
    })
    .onReset(() => {
      log('reset');
      renderState();
    });

  renderState();
}

/** 模拟宿主表单提交：dual 交令牌二次校验（用过即毁），backend_only 凭会话幂等放行。 */
async function hostVerify(payload: Record<string, string>, label: string): Promise<void> {
  try {
    const body = await backend.request('POST', CHECK_URL, payload);
    const result = parseCheckResponse(body, `${label}失败`);

    log(`${label} ${result.success ? '成功' : '失败'}：${result.message}`);
    showSubmitResult(result.success, result.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    log(`${label}异常：${message}`);
    showSubmitResult(false, message);
  }

  renderState();
}

domReady(() => {
  node<HTMLSelectElement>('demo-mode').addEventListener('change', build);
  node<HTMLSelectElement>('demo-theme').addEventListener('change', (event) => {
    const theme = (event.currentTarget as HTMLSelectElement).value as Theme;

    captcha.setTheme(theme);
    log(`setTheme ${theme}`);
  });

  node('demo-reinit').addEventListener('click', () => {
    build();
    log('重新初始化');
  });
  node('demo-refresh').addEventListener('click', () => captcha.refresh());
  node('demo-reset').addEventListener('click', () => captcha.reset());

  node('demo-secondary').addEventListener('click', () => {
    const token = captcha.getToken();

    if (!token) {
      log('二次验证：当前没有令牌（未通过或 backend_only 模式）');
      showSubmitResult(false, '当前没有令牌，请先完成验证');
      return;
    }

    void hostVerify({ token }, '二次验证');
  });

  const form = node<HTMLFormElement>('demo-form');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const input = form.querySelector<HTMLInputElement>(`input[name="${INPUT_NAME}"]`);

    if (input?.value) {
      void hostVerify({ token: input.value }, '二次验证');
      return;
    }

    // backend_only 不签发令牌，宿主凭会话里的已验证状态放行。
    if (node<HTMLSelectElement>('demo-mode').value === 'backend_only' && captcha.result()) {
      void hostVerify({}, '表单提交');
      return;
    }

    showSubmitResult(false, '请先完成人机验证');
    log('表单提交被拦截：未通过验证');
  });

  build();
  log('演示页就绪（浏览器内模拟后端）');
});