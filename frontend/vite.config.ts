import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { releaseId } from './src/release.ts';

export default defineConfig({
  root: 'frontend',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
  },
  plugins: [{
    name: 'version-service-worker-cache',
    closeBundle() {
      const serviceWorker = resolve(import.meta.dirname, '../dist/sw.js');
      const source = readFileSync(serviceWorker, 'utf8');
      const output = source.replaceAll('__BUILD_ID__', releaseId(process.env.VITE_BUILD_ID));
      if (output.includes('__BUILD_ID__')) throw new Error('Service-worker build identifier was not written.');
      writeFileSync(serviceWorker, output);
    },
  }],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080', '/health': 'http://localhost:8080' },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
