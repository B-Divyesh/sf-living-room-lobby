#!/usr/bin/env node
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const CACHE_PATTERN = /const CACHE = 'living-room-lobby-([^']+)'/;

export function assertExactRelease(expected, health, serviceWorker) {
  assert.match(expected, SHA_PATTERN, 'The expected release must be a full lowercase Git SHA.');
  assert.equal(
    health?.build,
    expected,
    `Backend release mismatch: expected ${expected}, received ${health?.build ?? 'no build id'}.`,
  );
  const workerBuild = serviceWorker.match(CACHE_PATTERN)?.[1];
  assert.equal(
    workerBuild,
    expected,
    `Service-worker release mismatch: expected ${expected}, received ${workerBuild ?? 'no cache id'}.`,
  );
}

async function fetchRelease(baseUrl, expected, attempt) {
  const suffix = `release-check=${expected}-${attempt}`;
  const [healthResponse, workerResponse] = await Promise.all([
    fetch(`${baseUrl}/health?${suffix}`, { cache: 'no-store' }),
    fetch(`${baseUrl}/sw.js?${suffix}`, { cache: 'no-store' }),
  ]);
  assert.equal(healthResponse.status, 200, `Health returned HTTP ${healthResponse.status}.`);
  assert.equal(workerResponse.status, 200, `Service worker returned HTTP ${workerResponse.status}.`);
  const health = await healthResponse.json();
  const serviceWorker = await workerResponse.text();
  assertExactRelease(expected, health, serviceWorker);
  return { health, serviceWorker };
}

async function waitForExactHttpRelease(baseUrl, expected) {
  const attempts = Number(process.env.RELEASE_VERIFY_ATTEMPTS || 120);
  const interval = Number(process.env.RELEASE_VERIFY_INTERVAL_MS || 5_000);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchRelease(baseUrl, expected, attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  throw new Error(`Release did not become current after ${attempts} checks: ${lastError?.message}`);
}

async function assertColdServiceWorkerCache(baseUrl, expected) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/demo?release-check=${expected}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    const cacheNames = await page.evaluate(() => caches.keys());
    assert.deepEqual(
      cacheNames,
      [`living-room-lobby-${expected}`],
      `Cold service-worker cache mismatch: ${cacheNames.join(', ') || 'no cache'}.`,
    );
    return cacheNames;
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function verifyRelease(baseUrl, expected) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const { health } = await waitForExactHttpRelease(normalizedBase, expected);
  const cacheNames = await assertColdServiceWorkerCache(normalizedBase, expected);
  return { build: health.build, cache: cacheNames[0] };
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  const [expected, baseUrl = 'https://living-room-lobby.sociobot.in'] = process.argv.slice(2);
  try {
    const result = await verifyRelease(baseUrl, expected || '');
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
