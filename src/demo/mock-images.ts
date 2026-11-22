/**
 * 演示页专用：在浏览器里画出与 xq-app-admin 后端同构的滑动拼图验证码图片。
 * 背景是程序化生成的渐变纹理，不引入任何第三方素材。
 * 这不是安全实现，只为让组件在没有真实后端时也能完整跑通。
 */

export interface SlideImage {
  dataUri: string;
  posX: number;
  posY: number;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('演示环境不支持 canvas 2d');
  }

  return ctx;
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function paintBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const hue = randomInt(0, 359);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${hue}, 62%, 62%)`);
  gradient.addColorStop(1, `hsl(${(hue + 48) % 360}, 58%, 44%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.arc(
      randomInt(0, width),
      randomInt(0, height),
      randomInt(8, 42),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `hsla(${(hue + randomInt(-40, 40) + 360) % 360}, 70%, ${randomInt(35, 80)}%, 0.28)`;
    ctx.fill();
  }
}

/**
 * 拼图块轮廓：方形主体 + 上/右两个凸榫（左边与下边是平的）。
 * 包围盒为 (x, y-knob) 起、宽高各 size+knob；调用方传 x=posX+knob，
 * 于是缺口横向落在 posX+knob..posX+markWidth，与滑块条里的同一轮廓逐像素对齐。
 */
function piecePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  knob: number,
): void {
  const topCenter = x + size / 2;
  const rightCenter = y + size / 2;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(topCenter - knob, y);
  ctx.arc(topCenter, y, knob, Math.PI, Math.PI * 2, false);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size, rightCenter - knob);
  ctx.arc(x + size, rightCenter, knob, -Math.PI / 2, Math.PI / 2, false);
  ctx.lineTo(x + size, y + size);
  ctx.lineTo(x, y + size);
  ctx.closePath();
}

/** 合成图：自上而下依次是带缺口背景、滑块条、干净背景，与 xq-app-admin 后端输出一致。 */
export function renderSlide(
  width: number,
  height: number,
  markWidth: number,
  markHeight: number,
): SlideImage {
  const knob = Math.max(4, Math.round(markWidth * 0.16));
  const size = Math.min(markWidth, markHeight) - knob * 2;
  const posX = randomInt(markWidth + 10, width - markWidth - 10);
  const posY = randomInt(10, height - markHeight - 10);

  const background = makeCanvas(width, height);
  paintBackground(context(background), width, height);

  const merged = makeCanvas(width, height * 3);
  const ctx = context(merged);

  ctx.drawImage(background, 0, height * 2);
  ctx.drawImage(background, 0, 0);

  piecePath(ctx, posX + knob, posY + knob, size, knob);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 滑块条：黑底（前端会把暗像素透明化），缺口处的原图内容搬到 x=0。
  ctx.save();
  ctx.translate(0, height);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  piecePath(ctx, knob, posY + knob, size, knob);
  ctx.save();
  ctx.clip();
  // 轮廓已画在 posY 上，纵向不能再平移一次 posY，否则 posY 偏大时
  // 滑块下半部分会取样到画布外，留下黑底被前端当成暗像素抠掉。
  ctx.drawImage(background, -posX, 0);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  return { dataUri: merged.toDataURL('image/png'), posX, posY };
}