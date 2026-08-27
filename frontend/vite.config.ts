import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'frontend',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080', '/health': 'http://localhost:8080' },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
