#!/usr/bin/env node
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const CACHE_PATTERN = /const CACHE = 'living-room-lobby-([^']+)'/;
const SCRIPT_PATTERN = /<script[^>]+src="([^"]*\/assets\/index-[^"]+\.js)"/;

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

export function assertFooterIdentity(expected, footer) {
  assert.match(expected, SHA_PATTERN, 'The expected release must be a full lowercase Git SHA.');
  assert.match(
    footer || '',
    new RegExp(`\\b${expected}\\b`),
    `Footer release mismatch: expected ${expected}, received ${footer || 'no footer text'}.`,
  );
}

export function assertJavaScriptIdentity(expected, shell, javaScript) {
  assert.match(expected, SHA_PATTERN, 'The expected release must be a full lowercase Git SHA.');
  const assetPath = shell.match(SCRIPT_PATTERN)?.[1];
  assert.ok(assetPath, 'The live shell did not name its JavaScript asset.');
  assert.match(
    javaScript || '',
    new RegExp(`\\b${expected}\\b`),
    `JavaScript release mismatch: ${assetPath} does not identify ${expected}.`,
  );
  return assetPath;
}

export function assertSharedPhoneRetained(code, join, hostRoom) {
  assert.match(code, /^[A-Z0-9]{4}$/, 'The host did not create a four-character room code.');
  assert.equal(
    join?.error,
    undefined,
    `Shared-phone join returned the recovery envelope for room ${code}: ${join?.error || 'unknown error'}`,
  );
  assert.equal(join?.room?.code, code, 'The phone joined a different room than the host created.');
  assert.equal(join?.room?.players?.length, 1, 'The join response did not contain exactly one player.');
  const player = join.room.players[0];
  assert.equal(player.mode, 'shared', 'The 390 px phone did not join in shared-phone mode.');
  assert.equal(hostRoom?.room?.code, code, 'The host room disappeared after the phone joined.');
  assert.ok(
    hostRoom?.room?.players?.some((candidate) => candidate.id === player.id && candidate.mode === 'shared'),
    'The host did not retain the shared-phone player.',
  );
  return player;
}

async function fetchRelease(baseUrl, expected, attempt) {
  const suffix = `release-check=${expected}-${attempt}`;
  const [healthResponse, workerResponse, shellResponse] = await Promise.all([
    fetch(`${baseUrl}/health?${suffix}`, { cache: 'no-store' }),
    fetch(`${baseUrl}/sw.js?${suffix}`, { cache: 'no-store' }),
    fetch(`${baseUrl}/?${suffix}`, { cache: 'no-store' }),
  ]);
  assert.equal(healthResponse.status, 200, `Health returned HTTP ${healthResponse.status}.`);
  assert.equal(workerResponse.status, 200, `Service worker returned HTTP ${workerResponse.status}.`);
  assert.equal(shellResponse.status, 200, `Shell returned HTTP ${shellResponse.status}.`);
  const health = await healthResponse.json();
  const serviceWorker = await workerResponse.text();
  const shell = await shellResponse.text();
  assertExactRelease(expected, health, serviceWorker);
  const assetPath = shell.match(SCRIPT_PATTERN)?.[1];
  assert.ok(assetPath, 'The live shell did not name its JavaScript asset.');
  const javaScriptResponse = await fetch(new URL(assetPath, baseUrl), { cache: 'no-store' });
  assert.equal(javaScriptResponse.status, 200, `JavaScript returned HTTP ${javaScriptResponse.status}.`);
  const javaScript = await javaScriptResponse.text();
  assertJavaScriptIdentity(expected, shell, javaScript);
  return { health, serviceWorker, assetPath };
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

async function assertColdServiceWorkerCacheAndFooter(baseUrl, expected) {
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
    const footer = await page.locator('footer').textContent();
    assertFooterIdentity(expected, footer);
    return { cache: cacheNames[0], footer };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function assertLiveSharedPhoneFlow(baseUrl, expected) {
  const browser = await chromium.launch({ headless: true });
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const host = await hostContext.newPage();
  const phone = await phoneContext.newPage();
  const errors = [];
  for (const [label, page] of [['host', host], ['phone', phone]]) {
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`${label} page: ${error.message}`));
  }

  try {
    const releaseQuery = `release-check=${expected}-${Date.now()}`;
    await host.goto(`${baseUrl}/?${releaseQuery}`, { waitUntil: 'networkidle' });
    const createResponsePromise = host.waitForResponse((response) => (
      new URL(response.url()).pathname === '/api/rooms' && response.request().method() === 'POST'
    ));
    await host.locator('#host-room').click();
    const createResponse = await createResponsePromise;
    assert.equal(createResponse.status(), 200, `Room creation returned HTTP ${createResponse.status()}.`);
    const created = await createResponse.json();
    const joinHref = await host.locator('#room-join-link').getAttribute('href');
    assert.ok(joinHref, 'The host did not render a phone join link.');
    const joinUrl = new URL(joinHref);
    const code = joinUrl.searchParams.get('join') || '';
    assert.equal(code, created.code, 'The rendered join code differs from the created room.');
    joinUrl.searchParams.set('release-check', expected);

    await phone.goto(joinUrl.href, { waitUntil: 'networkidle' });
    await phone.locator('#player-name').fill('Release family');
    await phone.locator('input[value="shared"]').check();
    const joinResponsePromise = phone.waitForResponse((response) => (
      new URL(response.url()).pathname === `/api/rooms/${code}/join`
    ));
    await phone.locator('#join-form button[type="submit"]').click();
    const joinResponse = await joinResponsePromise;
    assert.equal(joinResponse.status(), 200, `Shared-phone join returned HTTP ${joinResponse.status()}.`);
    const joined = await joinResponse.json();
    await phone.getByRole('heading', { name: 'Nice, Release family.' }).waitFor();
    await host.getByText('Release family', { exact: true }).waitFor();

    // Reloading both independent contexts proves the room and player are in
    // durable backend state rather than only retained in either page's memory.
    await Promise.all([
      host.reload({ waitUntil: 'networkidle' }),
      phone.reload({ waitUntil: 'networkidle' }),
    ]);
    await host.getByText('Release family', { exact: true }).waitFor();
    await phone.getByRole('heading', { name: 'Nice, Release family.' }).waitFor();
    const [hostRead, phoneRead] = await Promise.all([
      host.evaluate(async (roomCode) => {
        const response = await fetch(`/api/rooms/${roomCode}`, { cache: 'no-store' });
        return { status: response.status, body: await response.json() };
      }, code),
      phone.evaluate(async (roomCode) => {
        const response = await fetch(`/api/rooms/${roomCode}`, { cache: 'no-store' });
        return { status: response.status, body: await response.json() };
      }, code),
    ]);
    assert.equal(hostRead.status, 200, `Host room read returned HTTP ${hostRead.status}.`);
    assert.equal(phoneRead.status, 200, `Phone room read returned HTTP ${phoneRead.status}.`);
    const player = assertSharedPhoneRetained(code, joined, hostRead.body);
    assertSharedPhoneRetained(code, joined, phoneRead.body);
    assert.deepEqual(errors, [], `Live host/phone errors: ${errors.join(' | ')}`);
    return { code, playerId: player.id, viewport: '390x844', retainedAfterReload: true };
  } finally {
    await hostContext.close();
    await phoneContext.close();
    await browser.close();
  }
}

export async function verifyRelease(baseUrl, expected) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const { health, assetPath } = await waitForExactHttpRelease(normalizedBase, expected);
  const { cache, footer } = await assertColdServiceWorkerCacheAndFooter(normalizedBase, expected);
  const room = await assertLiveSharedPhoneFlow(normalizedBase, expected);
  return { build: health.build, cache, asset: assetPath, footer, room };
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
