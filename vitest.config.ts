import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/database/generated/**',
        'src/test-setup.ts',
        '.eslintrc.cjs',
        '.prettierrc.cjs',
        'eslint.config.cjs',
        'vitest.config.ts',
        'tsconfig.json',
        'package.json',
        'Dockerfile',
        '.env*',
        'coverage/**',
        'node_modules/**',
        'src/routes/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
