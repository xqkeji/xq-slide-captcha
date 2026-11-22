import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import xqInclude from 'vite-plugin-xq-include';
import xqCpDep from 'vite-plugin-xq-cp-dep';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 演示页构建：vite build src/ → ../html/。
// 组件库构建走 npm run build（unbuild + esbuild + sass），产物在 dist/。
export default defineConfig({
  plugins: [xqInclude(), xqCpDep()],
  base: './',
  build: {
    outDir: '../html/',
    emptyOutDir: false,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        'xq-slide-captcha': resolve(__dirname, 'index.html'),
      },
    },
  },
});
