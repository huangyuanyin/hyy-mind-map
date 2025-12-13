import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      dts: true,
    },
    {
      format: 'cjs',
    },
  ],
  source: {
    entry: {
      index: './src/index.ts',
    },
    transformImport: [],
  },
  output: {
    target: 'web',
    // 将 @swc/helpers 内联打包
    externals: {
      '@swc/helpers': false,
    },
  },
  tools: {
    swc: {
      jsc: {
        // 禁用外部 helpers，直接内联
        externalHelpers: false,
      },
    },
  },
});
