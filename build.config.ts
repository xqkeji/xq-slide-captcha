import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/ts/index'],
  // ESM/CJS 不内联 Bootstrap：由宿主提供的单例 Modal 与样式避免重复实例。
  // IIFE 走 esbuild 单独打包，仍可把 Bootstrap 内联进去供 script 标签直接使用。
  externals: ['vite', 'bootstrap', 'bootstrap/js/dist/modal'],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
});
