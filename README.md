# xq-slide-captcha

滑动拼图验证码的**前端组件**，TypeScript + SCSS 实现，按职责细粒度拆分。

配套后端：[`xqkeji/xq-app-admin`](https://github.com/xqkeji/xq-app-admin)，由它提供两个接口：`/admin/user/captchadata`（GET，生成验证码数据）与 `/admin/user/captchacheck`（POST，检验）。本包只负责交互与上报，宿主按这两个地址配置即可。

UI 层基于 **Bootstrap 5.3**：弹窗复用 Bootstrap Modal 组件的类名与 JS 生命周期，按钮 / spinner / alert / progress 也直接使用 Bootstrap 组件；主题统一走 `data-bs-theme`。`xq-util` 仅被演示页入口 `src/main.ts` 使用。ESM/CJS 构建把 Bootstrap 列为 external，IIFE 产物则内联 Bootstrap JS。

## 环境要求

- Node.js `^20.19.0 || >=22.12.0`（Vite 8 的 engines 要求；本仓库在 v22.22.2 上验证）
- 组件库构建：unbuild + esbuild + sass + clean-css-cli；演示页构建：Vite 8
- 浏览器：支持 Pointer Events、`fetch`、`AbortController`、`aspect-ratio` 的现代浏览器
- Bootstrap 5.3 CSS：宿主页面先加载它，再加载本包的 `dist/css/`（组件样式只补充布局规则）

## 快速开始

```bash
npm install
npm run build      # 组件库产物 → dist/
npm run html       # 演示页产物 → html/
npm run dev        # 开发服务器，演示页在 http://localhost:5173/
npm run typecheck  # tsc --noEmit
```

| 命令 | 说明 |
| --- | --- |
| `npm run build` | 构建可发布组件库：`dist/index.mjs`、`index.cjs`、`index.d.ts`，`dist/js/` 下的浏览器 JS（含压缩版），`dist/css/` 下的样式（含压缩版） |
| `npm run html` | 只构建演示页到 `html/`，可被浏览器直接打开 |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run typecheck` | 只做类型检查，不产出文件 |
| `npm run preview` | 预览 `html/` 里的演示页 |

两种构建互不覆盖：`build` 只写 `dist/`，`html` 只写 `html/`。`dist/` 是唯一发布目录（`files: ["dist"]`），不含演示页、演示后端或第三方素材；`html/` 不参与发布。

## 安装与引入

```bash
npm i xq-slide-captcha
```

```ts
import { SlideCaptcha } from 'xq-slide-captcha';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'xq-slide-captcha/dist/css/xq-slide-captcha.min.css';
```

不用打包器时，把 `dist/css/` 与 `dist/js/` 拷到站点静态目录，并**先引入 Bootstrap 5.3 的 CSS**（组件样式只补充 Bootstrap 未提供的布局规则）；页面级实例自动挂到 `window.xqSlideCaptcha`。

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="/static/bootstrap/css/bootstrap.min.css" />
  <link rel="stylesheet" href="/static/xq-slide-captcha/css/xq-slide-captcha.min.css" />
</head>
<body>
  <form action="/login" method="post"><!-- 不要加 novalidate -->
    <input name="username" />
    <input name="password" type="password" />
    <!-- 触发元素：点击后弹出滑动拼图验证码 -->
    <div class="xq-captcha"></div>
    <!-- 守卫输入框：未通过验证时由浏览器原生拦截提交 -->
    <input type="text" name="xq_captcha_token" class="xq-captcha-guard visually-hidden"
           tabindex="-1" autocomplete="off" data-xq-guard-text="请先完成人机验证" />
    <button type="submit">登录</button>
  </form>

  <script src="/static/xq-slide-captcha/js/xq-slide-captcha.min.js"></script>
  <script>
    xqSlideCaptcha
      .init({
        dataUrl: '/admin/user/captchadata',
        checkUrl: '/admin/user/captchacheck',
        inputName: 'xq_captcha_token'
      })
      .onSuccess(function (token) {
        console.log('验证通过，令牌：', token);
      })
      .onFail(function (message) {
        console.warn('验证失败：', message);
      });
  </script>
</body>
</html>
```

路径按实际静态目录调整。脚本方式下**不用设置 `transport`**：全局实例的默认传输层就是内置 `FetchTransport`，会请求上面的 `dataUrl` / `checkUrl`（默认即 xq-app-admin 的两个地址）。要自定义传输层请用模块方式传入。验证通过后组件会写入令牌字段，由后端二次校验；令牌字段支持「宿主页静态守卫」和「组件动态插入」两种模式，见下方「表单提交守卫」。要自定义实例可用模块方式的 `installGlobal()`。

## 集成到宿主页面

```html
<form action="/login" method="post">
  <input name="username" />
  <input name="password" type="password" />
  <!-- 触发元素：统一使用 .xq-captcha，可匹配多个 -->
  <div class="xq-captcha"></div>
  <!-- 可选：静态守卫输入框，启用 HTML5 原生拦截（推荐） -->
  <input type="text" name="xq_captcha_token" class="xq-captcha-guard visually-hidden"
         tabindex="-1" autocomplete="off" data-xq-guard-text="请先完成人机验证" />
  <button type="submit">登录</button>
</form>
```

### 表单提交守卫

组件本身不拦截表单提交。若希望「验证没通过时表单提交不了、并给出原生提示」，在表单里预置上面的守卫输入框即可——它用 Bootstrap `visually-hidden` 隐藏但可聚焦，组件通过 `setCustomValidity` 控制它：未通过时带上 `data-xq-guard-text` 的提示让浏览器拦截提交，通过后清空提示并写入令牌。要点：

- **表单不要加 `novalidate`**，否则原生验证失效。
- 守卫输入框按 `inputName`（默认 `xq_captcha_token`）在触发器所属表单内查找，多实例各自在自己的表单里不会串写。
- `backend_only` 模式通过后无令牌，守卫仍会放行，但不写值；安全仍然靠后端会话校验兜底。
- 若页面不放守卫输入框，组件回退到旧行为：通过时动态插入 `type=hidden` 字段，不提供原生拦截——此时请自行在 submit 里用 `captcha.result()` 判断，并由后端二次校验兜底。

```ts
import { SlideCaptcha } from 'xq-slide-captcha';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'xq-slide-captcha/dist/css/xq-slide-captcha.min.css';

const captcha = new SlideCaptcha({
  dataUrl: '/admin/user/captchadata',
  checkUrl: '/admin/user/captchacheck',
  inputName: 'xq_captcha_token',
  theme: 'auto',
});

captcha
  .onSuccess((token) => { /* dual 模式拿到一次性令牌，已自动写入隐藏输入框 */ })
  .onFail((message) => { /* 展示或上报失败原因 */ })
  .init();
```

`init()` 可重复调用：会先解绑旧监听再重新绑定，不会叠加。单页应用卸载组件时调用 `dispose()`，释放监听、计时器与弹窗 DOM。

`src/captcha/index.ts` 另外导出一个页面级默认实例 `slideCaptcha`（弹窗 DOM 是单例，一个页面共用它即可），以及 `installGlobal()`——显式挂到 `window.xqSlideCaptcha`，供习惯全局实例的宿主页面使用。

## 配置项

默认值唯一真源是 [`src/captcha/core/options.ts`](src/captcha/core/options.ts) 的 `DEFAULT_OPTIONS`，`init()` / 构造函数传入的对象浅覆盖同名键（`copyright` 单独深合并一层）。

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `handleDom` | `.xq-captcha` | 触发元素选择器，可匹配多个 |
| `dataUrl` | `/admin/user/captchadata` | 生成验证码数据的接口（GET，xq-app-admin） |
| `checkUrl` | `/admin/user/captchacheck` | 检验验证码的接口（POST，xq-app-admin） |
| `placeholder` | `点击按钮进行验证` | 触发元素初始文案 |
| `slideText` | `拖动左边滑块完成上方拼图` | 滑轨提示文案 |
| `successText` | `✓ 验证成功` | 通过后触发元素文案 |
| `failText` | `验证失败，请重试` | 兜底失败文案（后端有 message 时优先用后端的） |
| `showClose` | `true` | 是否显示关闭按钮 |
| `showRefresh` | `true` | 是否显示刷新按钮 |
| `theme` | `auto` | `auto` / `light` / `dark` |
| `inputName` | `xq_captcha_token` | 令牌字段名，守卫输入框与动态输入框都用它；**留空则不写入** |
| `autoInsertInput` | `true` | 回退模式下是否自动插入 `type=hidden` 输入框（守卫模式不受此影响） |
| `guardText` | `请先完成人机验证` | 守卫输入框未通过时的提示；页面元素的 `data-xq-guard-text` 优先 |
| `timeout` | `10000` | 请求超时毫秒数 |
| `copyright` | `{ text: '© xqkeji.cn', url: 'https://xqkeji.cn/', title: 'xqkeji.cn' }` | 弹窗底部版权行 |
| `transport` | 内置 `FetchTransport` | 自定义传输层，演示页注入本地模拟后端时使用 |

`transport` 是一个单方法接口，实现它就能接管全部请求（例如走宿主自己的 axios 实例）：

```ts
interface Transport {
  /** 2xx 时 resolve 响应文本，其余情况 reject HttpError。 */
  request(method: 'GET' | 'POST', url: string, data?: Record<string, string>): Promise<string>;
}
```

**默认不用管 `transport`**：`init()` 不传它时，`createTransport()` 会创建一个 `FetchTransport(timeout)`，直接请求上面两个默认地址。要显式指定或调整超时：

```ts
import { SlideCaptcha, FetchTransport } from 'xq-slide-captcha';

const captcha = new SlideCaptcha();
captcha.init({
  dataUrl: '/admin/user/captchadata',
  checkUrl: '/admin/user/captchacheck',
  transport: new FetchTransport(10000),
});
```

演示页把开关放在 [`src/main.ts`](src/main.ts) 顶部，一处同时切换组件请求和表单二次验证：

```ts
// src/main.ts
const USE_REAL_BACKEND = true; // 默认 false = 浏览器内模拟后端
const backend: Transport = USE_REAL_BACKEND
  ? new FetchTransport(10000)
  : new MockBackend();
```

内置 `FetchTransport` 用 `application/x-www-form-urlencoded` 提交、`credentials: 'same-origin'` 带上同源 Cookie（答案存在 PHP 会话里），超时用 `AbortController` 中断。`HttpError.status` 沿用上游语义：`-1` 超时、`0` 网络错误、其余为 HTTP 状态码。

## 实例 API

| 方法 | 说明 |
| --- | --- |
| `init(options?)` | 应用配置、构建弹窗、绑定触发元素并拉取第一轮验证码。返回 `this` |
| `show()` / `hide()` | 打开 / 关闭弹窗 |
| `refresh()` | 换一轮新验证码 |
| `reset()` | 回到未验证状态，清掉令牌与隐藏输入框。返回 `this` |
| `result()` | 本轮是否已通过 |
| `getToken()` | 一次性令牌，未通过或 `backend_only` 时为 `null` |
| `getCaptchaType()` | 当前类型，固定返回 `slide` |
| `getSlideTrack()` | 本轮采集到的拖动轨迹（图片像素坐标） |
| `setTheme(theme)` | 运行时切换主题。返回 `this` |
| `dispose()` | 释放监听、计时器与弹窗 DOM |

## 回调

全部返回 `this`，可链式调用。

| 方法 | 签名 | 触发时机 |
| --- | --- | --- |
| `onSuccess` | `(token: string \| null) => void` | 检验通过。dual 首次通过时 token 非空 |
| `onFail` | `(message: string) => void` | 检验失败或请求出错 |
| `onShow` / `onHide` | `() => void` | 弹窗显示 / 隐藏 |
| `onClose` | `() => void` | 用户主动关闭 |
| `onRefresh` | `(type, switched) => void` | 换图完成。`type` 恒为 `slide`、`switched` 恒为 `false`（签名保留以兼容宿主既有代码） |
| `onReset` | `() => void` | 复位完成 |

## 接口契约

默认即 `xq-app-admin` 提供的 `dataUrl = /admin/user/captchadata` 与 `checkUrl = /admin/user/captchacheck`；若宿主把它们挂在别的路径下，用配置项覆盖即可。

### GET `dataUrl`

查询参数：`t`（时间戳）、`_s`（随机串）用于破坏缓存。

响应体必须是 JSON，且 `success` 为 boolean、`type` 为 `slide`/`null`、`image_base64` 为 string，否则抛「验证码数据格式不正确」。`success: false` 时抛 `message`。

| 键 | 说明 |
| --- | --- |
| `success` | 后端限流时为 `false` |
| `type` | `slide`（老后端可能为 `null`，同样按滑动处理） |
| `image_base64` | 数据 URI。`bg_width × (bg_height * 3)` 的合成图，自上而下依次是带缺口背景、滑块条、干净背景 |
| `bg_width` / `bg_height` | 画布尺寸，前端据此设置 canvas 的 `width`/`height` 属性 |
| `mark_width` / `mark_height` | 缺口尺寸 |
| `pos_y` | 缺口纵坐标，用作滑块初始 y 与轨迹 y 基准。**横坐标即答案，后端从不下发** |

### POST `checkUrl`

| 场景 | 表单字段 |
| --- | --- |
| 滑动检验 | `captcha_r`（偏移量，**图片像素**）+ `slide_track`（JSON 数组） |
| 二次验证 | `token`（由宿主表单提交，不经组件） |

轨迹点为 `{x, y, t}`，坐标是图片像素，`t` 为相对拖动起点的毫秒数。CSS 像素到图片像素的换算由组件按画布实际显示宽度完成，宿主无需关心缩放与 DPR。

两种验证模式（与 `xq-app-admin` 后端口径一致）：

- **dual**：首次通过签发一次性令牌，答案立即作废；宿主表单提交时带 `token` 二次校验，令牌用过即毁。
- **backend_only**：不签发令牌，首次通过后凭会话里的已验证状态对后续表单提交幂等放行。

响应规范化为 `{success, token, message}`。除标准形式外还兼容老后端：`code === 200`、`status === 'ok' | 'success'`，以及纯文本 `ok` / `"ok"` / `true` / `1`。`message` 缺失时依次退回 `error` 字段、`failText`。

### 宿主表单复位契约

宿主表单提交失败时派发 `document` 级事件 `xq.form.error`，组件复位到未验证状态并换一轮新图。仅当表单内含本组件时才响应。触发元素统一为 `.xq-captcha`，其余内部选择器全部在 `xq-captcha-*` 命名空间下。

## DOM 与样式契约

选择器集中在 [`src/captcha/core/selectors.ts`](src/captcha/core/selectors.ts)。弹窗骨架是 Bootstrap modal 标记：`.modal > .modal-dialog > .modal-content > .modal-header/.modal-body/.modal-footer`，组件只追加 `xq-captcha-*` 类名。

| 用途 | 选择器 |
| --- | --- |
| 触发元素（唯一公开选择器） | `.xq-captcha`（运行时补上 `btn btn-outline-primary`） |
| 弹窗 / 对话框 / 内容 | `.xq-captcha-modal` / `.xq-captcha-dialog` / `.xq-captcha-content` |
| 画布容器 | `.xq-captcha-canvas-wrap` |
| 背景画布 / 标记画布 | `.xq-captcha-bg-canvas` / `.xq-captcha-mark-canvas` |
| 加载态（Bootstrap spinner） | `.xq-captcha-loading` |
| 错误 / 成功提示条（Bootstrap alert） | `.xq-captcha-alert-error` / `.xq-captcha-alert-success` |
| 滑轨 / 滑块 / 滑轨文案 | `.xq-captcha-slide-area` / `.xq-captcha-slide-block` / `.xq-captcha-slide-hint` |
| 进度条（Bootstrap progress） | `.xq-captcha-progress-bar` |
| 刷新 / 关闭按钮 | `.xq-captcha-refresh` / `.xq-captcha-close`（Bootstrap `btn` / `btn-close`） |
| 版权链接 | `.xq-captcha-copyright` |

两块画布同处一个 `.xq-captcha-canvas-wrap` 相对定位容器：背景画布在正常流里撑满弹窗内容盒，标记画布绝对定位铺满同一容器，于是逐像素重合。画布 CSS 宽度 100%、高度 `auto`，由 `width`/`height` 属性的固有比例推出——后端改画布尺寸时前端样式无需跟着改。加载态用 `aspect-ratio: 8 / 5` 与画布同比例，出图前后弹窗高度一致，不会跳动。

主题通过 `data-bs-theme` 设置：显式 `light`/`dark` 直接写到 `<html>` 与弹窗根节点；`auto` 按 Bootstrap 官方做法用 `prefers-color-scheme` 解析后写入，并跟随系统变化。组件 CSS 不定义任何自有颜色令牌，全部使用 `--bs-primary`、`--bs-danger`、`--bs-success`、`--bs-border-color`、`--bs-body-bg` 等 Bootstrap 变量；几何尺寸集中在 [`src/styles/_metrics.scss`](src/styles/_metrics.scss)。使用组件前需先加载 Bootstrap 5.3 CSS。

## Bootstrap 集成

- **组件 CSS**：只写 Bootstrap 未覆盖的少量布局（画布叠放、`aspect-ratio`、滑轨、抖动动画），颜色全部使用 `--bs-*` 变量；必须先加载 Bootstrap 5.3 CSS，再加载 `dist/css/xq-slide-captcha.css`。
- **Modal JS**：`src/captcha/ui/modal.ts` 用 `Modal.getOrCreateInstance()` 接管弹窗的显隐、遮罩、焦点陷阱与滚动锁定；`open()` / `close()` 调用其 `show()` / `hide()`，`dispose()` 调用其 `dispose()` 并移除节点。
- **构建**：ESM/CJS（unbuild）把 `bootstrap` 与 `bootstrap/js/dist/modal` 列为 external，由宿主统一提供；浏览器 IIFE（esbuild）内联 Bootstrap JS，script 标签引入时无需单独加载 Modal 脚本。`bootstrap` 保持在 `dependencies` 中，演示页的拷贝插件仍能正常工作。

## 交互与无障碍

- **统一指针事件**：鼠标与触摸走同一套 `pointerdown` / `pointermove` / `pointerup` / `pointercancel`，不再分别维护 mouse 与 touch 分支。滑轨与滑块都设 `touch-action: none`，拖动时页面不滚动。
- **滑块键盘操作**：`role="slider"` + `aria-valuemin/max/now`（0..100 的百分比）。方向键步长 4 CSS 像素，Shift 加大到 12，Home/End 跳到两端；`keyup` 时提交一次，长按连续移动不会重复提交。`aria-valuenow` 按实际行程换算，缩放后仍然准确。
- **工具按钮**使用原生 Bootstrap `btn` / `btn-close`，键盘激活与焦点样式由浏览器和 Bootstrap 提供。
- **弹窗**由 Bootstrap Modal JS 管理：遮罩、焦点陷阱、body 滚动锁定、显隐过渡与 `role="dialog"` / `aria-modal` 语义全部由它负责；提示条用 Bootstrap `alert`（`role="alert"` / `role="status"`），拖动进度用 Bootstrap `progress`。
- **渲染性能**：滑块抠图用「每行窗口平均亮度差分参考底色」的算法，只在图片加载时算一次；拖拽逐帧只做 `drawImage`，不再 `getImageData` 遍历像素。
- **无 innerHTML**：弹窗全部用 DOM API 构建，文案走 `textContent`，后端下发的 `message` 不会被当 HTML 解析。

## 演示页

`npm run html` 把演示页构建到 `html/index.html`，**不需要真实后端**：

- [`src/demo/mock-backend.ts`](src/demo/mock-backend.ts) 实现 `Transport`，在浏览器内按后端同一口径模拟生成与检验：滑动容差 3 像素、轨迹最少耗时 200ms、120ms 网络延迟；dual 首次通过签发一次性令牌并立即作废答案，令牌用过即毁；`backend_only` 不签发令牌，凭会话已验证状态幂等放行。
- [`src/demo/mock-images.ts`](src/demo/mock-images.ts) 用 canvas 程序化生成渐变背景与拼图缺口，**不引入任何第三方素材**。合成图三段结构与 `xq-app-admin` 后端输出一致。

演示页的切换开关在 [`src/main.ts`](src/main.ts) 顶部：`const USE_REAL_BACKEND = false;`。改成 `true` 后，`transport` 由 `MockBackend` 换成 `FetchTransport`，组件请求与「二次验证 / 表单提交」一起走 `/admin/user/captchadata` 与 `/admin/user/captchacheck`；宿主若改了挂载路径，用 `dataUrl` / `checkUrl` 覆盖。

页面控件：模式（dual/backend_only）、主题（auto/light/dark）两个下拉，重新初始化 / 刷新 / 重置 / 二次验证四个按钮，一个模拟登录表单，以及实时事件日志与状态 JSON 面板。页面底部「接入方式」同时给出模块引入与直接引入构建产物（`<link>` + `<script>`）两种示例。

> 演示后端只为跑通交互，**不是安全实现**：答案就在浏览器内存里。生产环境必须接真实后端。

## 目录结构

```
src/
├── captcha/                   组件本体（UI 依赖 Bootstrap 5.3）
│   ├── slide-captcha.ts       门面：编排各部件、对外 API 与回调
│   ├── index.ts               公共导出 + 页面级默认实例 + installGlobal
│   ├── core/                  options / types / selectors / state / dom / http / data-client / callbacks
│   ├── render/                canvas（双画布与坐标换算）/ image-loader / slide-layer（滑块图层预处理）
│   ├── slide/                 slider / drag-handler / keyboard-handler / track-recorder
│   ├── ui/                    template / modal / trigger / theme / loading / message / hint / hidden-input
│   └── verify/                submitter / response（响应规范化与错误文案）
├── ts/index.ts                组件库入口（unbuild + esbuild 共用，挂全局实例）
├── demo/                      mock-backend / mock-images（仅演示页）
├── main.ts                    演示页入口
├── index.html                 演示页 HTML
├── partials/                  公共片段（xq-include）
├── public/                    xq-cp-dep 自动从 node_modules 拷贝的依赖（忽略提交）
├── vite.config.mjs            演示页构建配置（outDir ../html/）
└── styles/                    Bootstrap 之上的精简样式
    ├── index.scss             组件样式入口（不含演示页样式）
    ├── _metrics.scss          几何尺寸（不含色板）
    ├── _trigger.scss _modal.scss _stage.scss _slider.scss
    └── demo.scss              演示页布局
build.config.ts                unbuild 配置（ESM / CJS / d.ts）
dist/                          组件库产物：index.mjs / index.cjs / index.d.ts
                               js/xq-slide-captcha[.min].js、css/xq-slide-captcha[.min].css
html/                          演示页产物（npm run html，不发布）
```

## 实现要点

交互层相对上游单文件 `captcha.js` / `captcha.css` 1.1.0 做了重写：

- 手写 `XMLHttpRequest` 与 IE `attachEvent` 兜底改为 `fetch` + `AbortController`；mouse / touch 两套并行事件分支改为统一 Pointer Events。
- 全部 `innerHTML` 拼接改为 DOM API + `textContent`，后端下发文案不会被当 HTML 解析。
- 修复上游两块画布横向错位 1px 的问题（写死像素宽度 + `margin: auto` 溢出退化 vs `left: 50%` 居中基准不一致）：两块画布同处一个相对定位容器，宽度流式，逐像素重合。
- 修复上游重复 `init()` 叠加监听导致一次拖动提交两回的问题：先解绑再绑，并提供 `dispose()` 释放监听、计时器与弹窗 DOM（上游没有任何销毁入口）。
- `backend_only` 模式下无令牌时移除隐藏输入框，避免向表单提交无效值。
- 触发元素统一为 `.xq-captcha`，复位事件统一为 `xq.form.error`；`captcha_r` / `slide_track` 参数名与老后端响应兼容；保留滑块键盘操作与 ARIA 语义。
- **UI 完全重写为 Bootstrap 5.3**：弹窗用 Bootstrap Modal 组件与 `data-bs-theme`；删除了原先的 `--xq-captcha-*` 色板，滑块抠图换成独立的窗口平均亮度差分算法，内部选择器全部改到 `xq-captcha-*` 命名空间。

## 共享核心 xq-captcha-core

请求传输、响应解析、回调、状态、选项合并与门面编排（含 `BaseCaptcha`）已抽到独立包 [`xq-captcha-core`](https://github.com/xqkeji/xq-captcha-core)，由 `xq-click-captcha` 与 `xq-slide-captcha` 共同依赖，避免两处重复维护。本包只保留滑动特有的滑块、拖拽、键盘、图层与画布。公开 API 与后端协议不变。

- **发布顺序**：先发 `xq-captcha-core`，再发本包；三者都用 OIDC Trusted Publishing，打 `v*` tag 触发。
- **本地开发**：`npm install` 后若 core 用 `file:` 链接，Vite 的 `xq-cp-dep` 插件无法对 symlink 建链（EPERM）。本地验证时把 `node_modules/xq-captcha-core` 换成真实目录拷贝即可；正式发布走 npm 版本依赖，无此问题。
- **回归测试**：core 自带 `npm test`（node:test，覆盖响应解析、选项合并、transport、数据校验，14 项）。

同页同时使用点选包与滑动包时，两个弹窗各有独立 id（`#xq-captcha-modal` / `#xq-slide-captcha-modal`），弹窗内查询限定在各自作用域，令牌输入框限定在各自表单，`data-bs-theme` 只写自己的弹窗，互不干扰。

## 构建说明

`npm run build` 依次执行 unbuild（ESM/CJS/d.ts）、esbuild（浏览器 IIFE JS，内联 Bootstrap Modal 与 xq-captcha-core）、uglify-js（压缩 JS）、sass（组件 CSS，不含演示页样式）、clean-css（压缩 CSS）与 xq-banner（版权头）。`npm run html` 单独用 Vite 构建演示页到 `html/`，两者互不覆盖。

新增演示页面：在 `src/` 下建 HTML，再到 `src/vite.config.mjs` 的 `rollupOptions.input` 增加一条入口。公共片段用 `<xq-include file="/partials/header.html"></xq-include>` 复用。`src/public/` 由 `vite-plugin-xq-cp-dep` 自动维护，不要手改。

## 素材与字体

本包仓库**不含任何二进制素材**：没有字体文件、图片文件或图标文件。

- 演示页的背景与拼图缺口由 [`src/demo/mock-images.ts`](src/demo/mock-images.ts) 用 canvas 现场程序化绘制，仅供演示。
- 工具栏关闭按钮使用 Bootstrap `btn-close`，刷新按钮使用 Bootstrap `btn`，不再自带图标字体或内联 SVG 路径。
- 生产环境的背景图与滑块掩膜由后端模块 [`xqkeji/xq-app-admin`](https://github.com/xqkeji/xq-app-admin) 提供，授权说明见其 README「素材与字体」一节。
- 运行时依赖：`bootstrap`（MIT，UI 层）、`xq-captcha-core`（AGPL-3.0-only，共享核心）与 `xq-util`（AGPL-3.0-only，仅演示页）。ESM/CJS 构建把 Bootstrap 留在外部，IIFE 产物内联 Bootstrap JS 与 xq-captcha-core。

## 许可

AGPL-3.0-only，见 [LICENSE](LICENSE)。