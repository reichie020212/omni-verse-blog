import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
    setupFiles: ['src/test/setup-env.ts'],
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
