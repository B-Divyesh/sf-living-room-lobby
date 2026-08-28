import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_RELEASE, releaseId } from './release';

const repositoryFile = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

describe('release identity and offline updates', () => {
  it('uses only a safe immutable release identifier', () => {
    expect(releaseId('a'.repeat(40))).toBe('a'.repeat(40));
    expect(releaseId('bad cache id')).toBe(DEVELOPMENT_RELEASE);
    expect(releaseId()).toBe(DEVELOPMENT_RELEASE);
  });

  it('requires Docker releases to inject the SHA and versions the worker cache', () => {
    const dockerfile = readFileSync(repositoryFile('Dockerfile'), 'utf8');
    const serviceWorker = readFileSync(repositoryFile('frontend/public/sw.js'), 'utf8');
    expect(dockerfile).toMatch(/ARG BUILD_SHA\n/);
    expect(dockerfile).not.toMatch(/ARG BUILD_SHA=/);
    expect(dockerfile.match(/test -n "\$BUILD_SHA"/g)).toHaveLength(2);
    expect(serviceWorker).toContain('living-room-lobby-__BUILD_ID__');
    expect(serviceWorker).toContain('self.skipWaiting()');
    expect(serviceWorker).toContain('self.clients.claim()');
  });
});
