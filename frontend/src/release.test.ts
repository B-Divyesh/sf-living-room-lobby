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

  it('defaults Docker builds without git metadata and consumes a supplied SHA in every stage', () => {
    const dockerfile = readFileSync(repositoryFile('Dockerfile'), 'utf8');
    const serviceWorker = readFileSync(repositoryFile('frontend/public/sw.js'), 'utf8');
    expect(dockerfile).toMatch(/^ARG BUILD_SHA=dev$/m);
    expect(dockerfile.match(/^ARG BUILD_SHA$/gm)).toHaveLength(3);
    expect(dockerfile).toContain('VITE_BUILD_ID="$BUILD_SHA" npm run build');
    expect(dockerfile).toContain('BUILD_SHA="$BUILD_SHA" cargo build --release --locked');
    expect(dockerfile).toContain('ENV BUILD_SHA=${BUILD_SHA}');
    expect(dockerfile).not.toMatch(/(?:COPY|ADD)\s+\.git\b/);
    expect(dockerfile).not.toMatch(/^RUN .*\bgit\b/m);
    expect(dockerfile).not.toContain('test -n "$BUILD_SHA"');
    expect(serviceWorker).toContain('living-room-lobby-__BUILD_ID__');
    expect(serviceWorker).toContain('self.skipWaiting()');
    expect(serviceWorker).toContain('self.clients.claim()');
  });
});
