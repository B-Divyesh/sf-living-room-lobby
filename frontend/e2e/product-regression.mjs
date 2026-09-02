import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import sharp from 'sharp';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const port = Number(process.env.LRL_E2E_PORT || 18181);
const baseUrl = `http://127.0.0.1:${port}`;
const grepIndex = process.argv.indexOf('--grep');
const grep = grepIndex === -1 ? '' : process.argv[grepIndex + 1] || '';

function included(tag) {
  return !grep || tag.includes(grep);
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // The binary is still starting.
    }
    await delay(100);
  }
  throw new Error('The local product server did not start.');
}

function recordErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function assertAxeClean(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  assert.deepEqual(
    result.violations,
    [],
    `${label} Axe violations: ${result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`).join('; ')}`,
  );
}

async function checkDesktopAndPrivacy(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = recordErrors(page);
  const requests = [];
  page.on('request', (request) => {
    if (request.url().startsWith('http')) requests.push(new URL(request.url()).origin);
  });
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    assert.equal(await page.title(), 'Demo — Living Room Lobby');
    assert.equal(await page.locator('main h1').count(), 1);
    assert.match(await page.locator('.demo-banner').textContent(), /Demo — sample data, nothing is saved/);
    await assertAxeClean(page, 'desktop home');
    assert.ok(requests.every((origin) => origin === baseUrl), `Unexpected request origin: ${requests.join(', ')}`);
    assert.deepEqual(errors, [], `Desktop console/page errors: ${errors.join(' | ')}`);
  } finally {
    await context.close();
  }
}

async function checkDemoSandbox(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const requests = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const workspaceResponse = page.waitForResponse((response) => response.url() === `${baseUrl}/api/demo` && response.request().method() === 'POST');
    await page.getByRole('link', { name: /Try it with sample data/ }).click();
    await page.waitForURL(`${baseUrl}/demo`);
    const seededWorkspace = await workspaceResponse;
    assert.equal(seededWorkspace.status(), 200);
    const seededPayload = await seededWorkspace.json();
    assert.equal(seededPayload.expiresInSeconds, 86_400);
    assert.equal(seededPayload.room.players.length, 3);
    await page.getByRole('heading', { name: /Draw together/i }).waitFor();
    assert.match(await page.locator('.demo-banner').textContent(), /nothing is saved/);
    assert.equal(await page.locator('#tv-canvas').count(), 1);
    const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    assert.ok(storage.local.some((key) => key.startsWith('demo:living-room-lobby:')), `No demo localStorage namespace: ${storage.local.join(', ')}`);
    assert.ok(storage.session.some((key) => key.startsWith('demo:living-room-lobby:')), `No demo sessionStorage namespace: ${storage.session.join(', ')}`);
    assert.ok(storage.session.includes('demo:living-room-lobby:workspace'), 'Demo did not retain its isolated backend workspace id.');
    await page.locator('#reset-demo').click();
    await page.getByRole('heading', { name: /Draw together/i }).waitFor();
    await page.locator('#start-real').click();
    await page.waitForURL(`${baseUrl}/`);
    assert.equal(await page.locator('#host-room').count(), 1);
    const afterStart = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    assert.ok(!afterStart.local.some((key) => key.startsWith('demo:')), 'Start for real left demo data in localStorage.');
    assert.ok(!afterStart.session.some((key) => key.startsWith('demo:')), 'Start for real left demo data in sessionStorage.');
    assert.ok(!requests.some((path) => path.startsWith('/api/rooms')), `Sample mode touched a real room route: ${requests.join(', ')}`);
  } finally {
    await context.close();
  }

  const aliasContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const aliasPage = await aliasContext.newPage();
  const aliasRequests = [];
  aliasPage.on('request', (request) => aliasRequests.push(new URL(request.url()).pathname));
  try {
    await aliasPage.goto(`${baseUrl}/?demo=1`, { waitUntil: 'networkidle' });
    await aliasPage.getByRole('heading', { name: /Draw Together/i }).waitFor();
    assert.match(await aliasPage.locator('.demo-banner').textContent(), /nothing is saved to a real room/);
    assert.match(await aliasPage.locator('.play-header .eyebrow').textContent(), /Round 3/);
    await aliasPage.locator('#next-round').click();
    assert.match(await aliasPage.locator('.play-header .eyebrow').textContent(), /Round 4/);
    await aliasPage.locator('#reset-demo').click();
    assert.match(await aliasPage.locator('.play-header .eyebrow').textContent(), /Round 3/);
    assert.ok(!aliasRequests.some((path) => path.startsWith('/api/rooms')), `?demo=1 touched a real room route: ${aliasRequests.join(', ')}`);
  } finally {
    await aliasContext.close();
  }
}

async function checkAccountFreeSample(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const demoRequests = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/demo') demoRequests.push(request);
  });
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: /Draw together/i }).waitFor();
    assert.equal(await page.locator('.demo-banner').count(), 1, 'The direct sample route did not start a ready demo.');
    assert.equal(await page.locator('form').count(), 0, 'The ready sample unexpectedly asked for an account step.');
    assert.deepEqual(await context.cookies(), [], 'The sample should not create an account cookie.');
    assert.equal(demoRequests.length, 1, 'The direct sample should provision exactly one workspace.');
    assert.equal(demoRequests[0].headers().authorization, undefined, 'The sample request unexpectedly carried an account credential.');
  } finally {
    await context.close();
  }
}

async function checkNoAccountRequired(browser) {
  // Privacy applies to a real host and a real joining phone, not only the
  // sample. Keep these contexts independent so neither can lend credentials
  // or session state to the other.
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const host = await hostContext.newPage();
  const phone = await phoneContext.newPage();
  const roomRequests = [];
  const recordRoomRequest = (request) => {
    const url = new URL(request.url());
    if (url.origin === baseUrl && url.pathname.startsWith('/api/rooms')) {
      roomRequests.push({ path: url.pathname, authorization: request.headers().authorization });
    }
  };
  host.on('request', recordRoomRequest);
  phone.on('request', recordRoomRequest);
  const assertNoAccountBarrier = async (page, label) => {
    assert.equal(await page.locator('input[type="password"], input[autocomplete="email"], input[name*="email" i], input[name*="account" i]').count(), 0,
      `${label} showed an account credential field.`);
    assert.equal(await page.getByRole('button', { name: /sign in|log in|create account/i }).count(), 0,
      `${label} showed an account action.`);
  };
  try {
    await host.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await assertNoAccountBarrier(host, 'The real-room host');
    await host.locator('#host-room').click();
    await host.locator('.game-choices').waitFor();
    const code = (await host.locator('.room-heading h1').textContent()).match(/[A-Z0-9]{4}/)?.[0];
    assert.ok(code, 'The unauthenticated host did not receive a room code.');

    await phone.goto(`${baseUrl}/?join=${code}`, { waitUntil: 'networkidle' });
    await assertNoAccountBarrier(phone, 'The real-room join page');
    await phone.locator('#player-name').fill('Marta');
    await phone.locator('#join-form button[type="submit"]').click();
    await phone.getByRole('heading', { name: 'Nice, Marta.' }).waitFor();
    await host.getByText('Marta').waitFor();

    assert.deepEqual(await hostContext.cookies(), [], 'Starting a real room must not create an account cookie.');
    assert.deepEqual(await phoneContext.cookies(), [], 'Joining a real room must not create an account cookie.');
    assert.ok(roomRequests.some((request) => request.path === '/api/rooms'), 'The host did not create a real room.');
    assert.ok(roomRequests.some((request) => /\/api\/rooms\/[A-Z0-9]{4}\/join$/.test(request.path)), 'The phone did not join the real room.');
    assert.ok(roomRequests.every((request) => request.authorization === undefined),
      `A real-room request unexpectedly carried an Authorization credential: ${JSON.stringify(roomRequests)}`);
  } finally {
    await hostContext.close();
    await phoneContext.close();
  }
}

async function checkRealRoomSessionStorage(browser) {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const host = await hostContext.newPage();
  const phone = await phoneContext.newPage();
  const readSession = (page) => page.evaluate(() => ({
    session: sessionStorage.getItem('lrl_session'),
    local: localStorage.getItem('lrl_session'),
  }));
  try {
    await host.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await host.locator('#host-room').click();
    await host.locator('.game-choices').waitFor();
    const code = (await host.locator('.room-heading h1').textContent()).match(/[A-Z0-9]{4}/)?.[0];
    assert.ok(code, 'The host session did not receive a room code.');
    const hostStorage = await readSession(host);
    assert.equal(hostStorage.local, null, 'A host room session must not be placed in local storage.');
    const hostSession = JSON.parse(hostStorage.session || '{}');
    assert.deepEqual(Object.keys(hostSession).sort(), ['code', 'role', 'token']);
    assert.equal(hostSession.role, 'host');
    assert.equal(hostSession.code, code);
    assert.match(hostSession.token || '', /^[A-Za-z0-9]+$/, 'The host session token was not retained in session storage.');

    await phone.goto(`${baseUrl}/?join=${code}`, { waitUntil: 'networkidle' });
    await phone.locator('#player-name').fill('Inez');
    await phone.locator('#join-form button[type="submit"]').click();
    await phone.getByRole('heading', { name: 'Nice, Inez.' }).waitFor();
    const playerStorage = await readSession(phone);
    assert.equal(playerStorage.local, null, 'A player room session must not be placed in local storage.');
    const playerSession = JSON.parse(playerStorage.session || '{}');
    assert.equal(playerSession.role, 'player');
    assert.equal(playerSession.code, code);

    await host.locator('#leave-room').click();
    await host.locator('#host-room').waitFor();
    assert.deepEqual(await readSession(host), { session: null, local: null }, 'Close room must clear the host session.');
    await phone.locator('#leave-room').click();
    await phone.locator('#host-room').waitFor();
    assert.deepEqual(await readSession(phone), { session: null, local: null }, 'Leave room must clear the player session.');
  } finally {
    await hostContext.close();
    await phoneContext.close();
  }
}

async function checkBrowserStorageClear(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const token = 'privacy-clear-license';
  await context.route(`https://api.sociobot.in/api/v1/products/living-room-lobby/verify?license=${token}`, (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ valid: false, reason: 'revoked' }),
  }));
  try {
    await page.goto(`${baseUrl}/?license=${token}`, { waitUntil: 'networkidle' });
    await page.locator('.license-status').waitFor();
    await page.locator('#host-room').click();
    await page.locator('.game-choices').waitFor();
    const before = await page.evaluate(() => ({
      room: sessionStorage.getItem('lrl_session'),
      license: localStorage.getItem('sb_license:living-room-lobby'),
      verdict: localStorage.getItem('sb_license:living-room-lobby:verdict'),
    }));
    assert.ok(before.room, 'The storage-clear fixture did not create a real-room session.');
    assert.equal(before.license, token, 'The storage-clear fixture did not retain its license token.');
    assert.ok(before.verdict, 'The storage-clear fixture did not retain its license verdict.');

    // This is the same origin-scoped data deletion exposed by browser site-data
    // settings. Reload in the same fresh context to prove the app has no hidden
    // recovery path for either the real-room session or license fixture.
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await context.clearCookies();
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#host-room').waitFor();
    assert.equal(await page.locator('.room-heading').count(), 0, 'A cleared browser must not restore the real room.');
    const after = await page.evaluate(() => ({
      room: sessionStorage.getItem('lrl_session'),
      licenses: Object.keys(localStorage).filter((key) => key.startsWith('sb_license:living-room-lobby')),
    }));
    assert.equal(after.room, null, 'A cleared browser must not restore the room session.');
    assert.deepEqual(after.licenses, [], 'A cleared browser must not restore the license fixture.');
  } finally {
    await context.close();
  }
}

async function checkFreeGameAvailability(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const origins = [];
  page.on('request', (request) => {
    if (request.url().startsWith('http')) origins.push(new URL(request.url()).origin);
  });
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => localStorage.getItem('sb_license:living-room-lobby')), null);
    await page.locator('#end-game').click();
    for (const [id, name] of [['draw', 'Draw together'], ['point', 'Point panic'], ['pass', 'Pass & guess']]) {
      const choice = page.locator(`[data-game="${id}"]`);
      assert.equal(await choice.evaluate((element) => element.classList.contains('locked')), false, `${name} was marked as paid.`);
      await choice.click();
      await page.getByRole('heading', { name: new RegExp(name, 'i') }).waitFor();
      await page.locator('#end-game').click();
      await choice.waitFor();
    }
    assert.ok(origins.every((origin) => origin === baseUrl), `Free sample play requested another origin: ${origins.join(', ')}`);
  } finally {
    await context.close();
  }
}

async function checkPlayerCountLimits(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const expectedRanges = [
    ['draw', 'Draw together', '2–10 players'],
    ['point', 'Point panic', '2–10 players'],
    ['pass', 'Pass & guess', '3–12 players'],
    ['statue', 'Statue switch', '3–12 players'],
    ['chorus', 'Colour chorus', '2–10 players'],
  ];
  const setPlayerCount = async (count) => {
    await page.evaluate((playerCount) => {
      const key = 'demo:living-room-lobby:room';
      const saved = localStorage.getItem(key);
      if (!saved) throw new Error('The demo room is missing.');
      const room = JSON.parse(saved);
      const sample = room.players.length ? room.players : [{ id: 'sample', name: 'Player', mode: 'solo', color: '#b7d43d', score: 0, x: 50, y: 50 }];
      room.stage = 'lobby';
      room.game = null;
      room.players = Array.from({ length: playerCount }, (_, index) => ({
        ...sample[index % sample.length],
        id: `boundary-${index}`,
        name: `Player ${index + 1}`,
      }));
      localStorage.setItem(key, JSON.stringify(room));
    }, count);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.game-choices').waitFor();
  };
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.locator('#end-game').click();
    assert.match(await page.locator('.section-title').first().textContent(), /3\s*\/\s*12/, 'The demo did not retain its three-player sample.');
    for (const [id, name, range] of expectedRanges) {
      const choice = page.locator(`[data-game="${id}"]`);
      assert.match(await choice.textContent(), new RegExp(`${name}.*${range}`, 'i'), `${name} did not show ${range}.`);
    }
    for (const [id, name, range] of expectedRanges.slice(0, 3)) {
      const [minimum, maximum] = range.match(/\d+/g).map(Number);

      await setPlayerCount(minimum - 1);
      await page.locator(`[data-game="${id}"]`).click();
      await page.locator('.toast.show').waitFor();
      assert.match(await page.locator('.toast.show').textContent(), new RegExp(`${name} needs ${range}.*Ask 1 more player to join`, 'i'));
      assert.equal(await page.locator('#end-game').count(), 0, `${name} started below its minimum.`);

      await setPlayerCount(minimum);
      await page.locator(`[data-game="${id}"]`).click();
      await page.getByRole('heading', { name: new RegExp(name, 'i') }).waitFor();

      await setPlayerCount(maximum);
      await page.locator(`[data-game="${id}"]`).click();
      await page.getByRole('heading', { name: new RegExp(name, 'i') }).waitFor();

      await setPlayerCount(maximum + 1);
      await page.locator(`[data-game="${id}"]`).click();
      await page.locator('.toast.show').waitFor();
      assert.match(await page.locator('.toast.show').textContent(), new RegExp(`${name} needs ${range}.*Ask 1 player to sit out this round`, 'i'));
      assert.equal(await page.locator('#end-game').count(), 0, `${name} started above its maximum.`);
    }
  } finally {
    await context.close();
  }
}

async function checkInvalidRoomCodeRecovery(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = recordErrors(page);
  const joinResponses = [];
  page.on('response', (response) => {
    if (/\/api\/rooms\/ZZZZ\/join$/.test(new URL(response.url()).pathname)) joinResponses.push(response);
  });
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.locator('#show-join').click();
    await page.locator('#room-code').fill('ZZZZ');
    await page.locator('#player-name').fill('Verifier');
    await page.locator('#join-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('#join-error')?.textContent?.trim().length);
    assert.equal(await page.locator('#join-error').textContent(), 'That room is gone. Check the code or start a new one.');
    assert.equal(joinResponses.length, 1, 'The join form did not make exactly one recovery request.');
    assert.equal(joinResponses[0].status(), 200, 'A mistyped room code must use the successful recovery envelope.');
    await page.waitForTimeout(100);
    assert.deepEqual(errors, [], `Invalid room recovery emitted console/page errors: ${errors.join(' | ')}`);
  } finally {
    await context.close();
  }
}

async function checkDemoRealRoomIsolation(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const apiPaths = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === baseUrl && url.pathname.startsWith('/api/')) apiPaths.push(url.pathname);
  });
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.locator('#end-game').click();
    await page.locator('[data-game="point"]').click();
    await page.locator('.point-arena').waitFor();
    await page.locator('#end-game').click();
    await page.locator('#reset-demo').click();
    assert.ok(apiPaths.includes('/api/demo'), 'Sample mode did not provision its isolated workspace.');
    assert.ok(!apiPaths.some((path) => path.startsWith('/api/rooms')), `Sample mode touched a real room route: ${apiPaths.join(', ')}`);
  } finally {
    await context.close();
  }
}

async function checkDesignedNotFound(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const response = await page.goto(`${baseUrl}/this-does-not-exist`, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 404);
    await page.getByRole('heading', { name: 'That page is not here.' }).waitFor();
    await page.getByRole('link', { name: 'Go to Living Room Lobby' }).waitFor();
    assert.equal(await page.locator('main').count(), 1);
    assert.equal(await page.locator('header').count(), 1);
    assert.equal(await page.locator('footer').count(), 1);
    assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
    assert.equal(await page.locator('meta[property="og:image"]').count(), 1);
  } finally {
    await context.close();
  }
}

async function checkMobileCatalogueAndPointA11y(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = recordErrors(page);
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await assertAxeClean(page, '390px home');
    const strip = page.locator('.game-strip');
    await strip.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.game-strip')?.scrollLeft > 0);
    assert.equal(await strip.evaluate((element) => document.activeElement === element), true);
    const wordmark = await page.locator('.wordmark').boundingBox();
    assert.ok(wordmark && wordmark.height >= 44, `Wordmark height was ${wordmark?.height}`);
    for (const link of await page.locator('footer a').all()) {
      const box = await link.boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44, `Footer target was ${box?.width}×${box?.height}`);
    }

    await page.locator('#host-room').click();
    const code = (await page.locator('.room-heading h1').textContent()).match(/[A-Z0-9]{4}/)?.[0];
    assert.ok(code, 'The mobile accessibility room did not show a code.');
    await joinPlayersViaApi(page, code, ['Asha', 'Bo']);
    await page.locator('[data-game="point"]').click();
    await page.locator('.point-arena').waitFor();
    assert.equal(await page.locator('.target').getAttribute('role'), 'img');
    assert.equal(await page.locator('.target').getAttribute('aria-label'), 'Moss target');
    await assertAxeClean(page, 'Point Panic host');
    assert.deepEqual(errors, [], `Mobile console/page errors: ${errors.join(' | ')}`);
  } finally {
    await context.close();
  }
}

async function checkMobileFirstViewport(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const action = await page.getByRole('link', { name: /Try it with sample data/ }).boundingBox();
    assert.ok(action, 'The required sample action was not rendered.');
    assert.ok(
      action.y >= 0 && action.y + action.height <= 844,
      `The sample action must fit the cold 390×844 viewport, but occupied y=${action.y}–${action.y + action.height}.`,
    );
  } finally {
    await context.close();
  }
}

async function checkMobileHeroArtwork(browser) {
  // Regression for verification 12: Chromium loaded the 1200x800 source at
  // 390 px, but the initial rendered crop was a nearly uniform concrete slab
  // (entropy 0.496). Measure the pixels a visitor actually sees without
  // decode(), scrolling, or a style mutation that could hide a first-paint bug.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const image = page.locator('.hero-art img');
    const source = await image.evaluate((element) => ({
      complete: element.complete,
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
    }));
    assert.deepEqual(source, { complete: true, naturalWidth: 1200, naturalHeight: 800 }, 'The mobile hero source did not load.');

    const renderedCrop = await image.screenshot();
    const { entropy } = await sharp(renderedCrop).stats();
    assert.ok(entropy >= 3, `The 390 px hero artwork must have meaningful visible pixel variance; measured entropy ${entropy.toFixed(3)}.`);
  } finally {
    await context.close();
  }
}

async function checkMobileTextResizeReflow(browser) {
  // Regression for verification 11: at 390 px / 200% text, the hero's fixed
  // grid minimum and unbreakable display word expanded the document to 555 px
  // and the overflow-hidden hero cut off the headline. Exercise both entry
  // points because the demo banner changes the available vertical layout.
  for (const path of ['/', '/demo']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      await page.waitForTimeout(50);
      const layout = await page.evaluate(() => {
        const box = (element) => {
          const rect = element?.getBoundingClientRect();
          return rect && { width: rect.width, right: rect.right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
        };
        const h1 = document.querySelector('main h1');
        const hero = document.querySelector('.hero');
        const privacy = [...document.querySelectorAll('a')].find((link) => link.textContent?.includes('Read privacy details'));
        const privacyBox = privacy?.getBoundingClientRect();
        const targets = [...document.querySelectorAll('a[href], button, input, select, summary, [tabindex]:not([tabindex="-1"])')]
          .filter((element) => element.getClientRects().length > 0)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { label: (element.getAttribute('aria-label') || element.textContent || element.tagName).trim().replace(/\s+/g, ' ').slice(0, 60), width: rect.width, height: rect.height };
          });
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          h1: box(h1),
          heroOverflow: hero && getComputedStyle(hero).overflow,
          privacy: privacyBox && { width: privacyBox.width, height: privacyBox.height },
          targets,
        };
      });
      assert.equal(layout.scrollWidth, layout.clientWidth, `${path} overflowed at 390 px with 200% text: ${layout.scrollWidth}px / ${layout.clientWidth}px.`);
      assert.ok(layout.h1 && layout.h1.scrollWidth <= layout.h1.clientWidth, `${path} headline was clipped at 200% text.`);
      assert.ok(layout.h1 && layout.h1.right <= layout.clientWidth, `${path} headline extended beyond the viewport at 200% text.`);
      assert.notEqual(layout.heroOverflow, 'hidden', `${path} hero may not hide enlarged content.`);
      const undersized = layout.targets.filter((target) => target.width < 44 || target.height < 44);
      assert.deepEqual(undersized, [], `${path} had undersized interactive targets at 200% text: ${JSON.stringify(undersized)}.`);
      if (path === '/') {
        assert.ok(layout.privacy && layout.privacy.width >= 44 && layout.privacy.height >= 44, `Privacy target was ${layout.privacy?.width}×${layout.privacy?.height}px.`);
      }
    } finally {
      await context.close();
    }
  }
}

async function checkDesktopFirstViewport(browser) {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      const action = await page.getByRole('link', { name: /Try it with sample data/ }).boundingBox();
      assert.ok(action, `The sample action was not rendered at ${viewport.width}×${viewport.height}.`);
      assert.ok(action.y >= 0 && action.y + action.height <= viewport.height,
        `The sample action must fit ${viewport.width}×${viewport.height}, but occupied y=${action.y}–${action.y + action.height}.`);
    } finally {
      await context.close();
    }
  }
}

async function checkPromptRailGeometry(browser) {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
      const prompt = await page.locator('.game-prompt').boundingBox();
      const rail = await page.locator('.command-rail').boundingBox();
      assert.ok(prompt && rail, `The prompt or command rail was missing at ${viewport.width}×${viewport.height}.`);
      assert.ok(prompt.y >= 0 && prompt.y + prompt.height <= rail.y,
        `The longest sample prompt must stay above the command rail at ${viewport.width}×${viewport.height}; prompt y=${prompt.y}–${prompt.y + prompt.height}, rail starts ${rail.y}.`);
      const clipped = await page.locator('.game-prompt').evaluate((element) => element.scrollWidth > element.clientWidth);
      assert.equal(clipped, false, `The longest sample prompt must keep whole words at ${viewport.width}×${viewport.height}.`);
    } finally {
      await context.close();
    }
  }
}

async function checkSpanishPictureRound(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(4_000);
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.locator('#end-game').click();
    await page.locator('#room-language').selectOption('es');
    await page.locator('[data-game="draw"]').click();
    await page.getByText('Dibujen juntos').waitFor();
    await page.evaluate(() => sessionStorage.setItem('demo:living-room-lobby:session', JSON.stringify({
      role: 'player', code: 'DEMO', token: 'demo-player-demo-asha', playerId: 'demo-asha', name: 'Asha', mode: 'solo',
    })));
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Usa un dedo. Tu color aparece en la TV.').waitFor();
    const pad = await page.locator('#draw-pad').boundingBox();
    assert.ok(pad, 'The Spanish sample player did not receive a drawing pad.');
    await page.mouse.move(pad.x + 40, pad.y + 40); await page.mouse.down(); await page.mouse.move(pad.x + 130, pad.y + 130); await page.mouse.up();
    await page.evaluate(() => sessionStorage.setItem('demo:living-room-lobby:session', JSON.stringify({ role: 'host', code: 'DEMO', token: 'demo-host-token' })));
    await page.reload({ waitUntil: 'networkidle' });
    const beforeRound = await page.evaluate(() => JSON.parse(localStorage.getItem('demo:living-room-lobby:room') || '{}').round);
    await page.locator('#next-round').click();
    await page.waitForTimeout(200);
    const afterRound = await page.evaluate(() => JSON.parse(localStorage.getItem('demo:living-room-lobby:room') || '{}').round);
    assert.equal(afterRound, beforeRound + 1, `The translated round did not advance: ${beforeRound} → ${afterRound}.`);
    await page.locator('#end-game').click();
    await page.locator('#room-language').selectOption('picture');
    await page.locator('[data-game="draw"]').click();
    assert.equal(await page.locator('.game-prompt').textContent(), '🐈', 'Picture prompts must not require reading.');
  } finally {
    await context.close();
  }
}

async function checkJoinCodePath(browser) {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const host = await hostContext.newPage(); const phone = await phoneContext.newPage();
  try {
    await host.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await host.locator('#host-room').click();
    const joinUrl = await host.locator('#room-join-link').getAttribute('href');
    assert.match(joinUrl || '', /\?join=[A-Z0-9]{4}$/);
    await phone.goto(joinUrl, { waitUntil: 'networkidle' });
    await phone.locator('#player-name').fill('Marta');
    await phone.locator('#join-form button[type="submit"]').click();
    await phone.getByRole('heading', { name: 'Nice, Marta.' }).waitFor();
    await host.getByText('Marta').waitFor();
  } finally {
    await hostContext.close(); await phoneContext.close();
  }
}

async function checkRouteAnnouncement(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.getByLabel('Primary').getByRole('link', { name: 'Privacy' }).click();
    await page.getByRole('heading', { name: 'Privacy' }).waitFor();
    await page.waitForFunction(() => document.querySelector('#route-status')?.textContent === 'Privacy page');
    assert.equal(await page.locator('#route-status').textContent(), 'Privacy page');
    await page.goBack();
    await page.getByRole('heading', { name: /Play together/i }).waitFor();
    await page.waitForFunction(() => document.querySelector('#route-status')?.textContent?.includes('Play together on your TV. page'));
    assert.match(await page.locator('#route-status').textContent() || '', /Play together on your TV\. page/);
  } finally {
    await context.close();
  }
}

async function checkSharedTvCanvas(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    const before = await page.locator('#tv-canvas').evaluate((canvas) => (canvas).toDataURL());
    await page.evaluate(() => sessionStorage.setItem('demo:living-room-lobby:session', JSON.stringify({
      role: 'player', code: 'DEMO', token: 'demo-player-demo-asha', playerId: 'demo-asha', name: 'Asha', mode: 'solo',
    })));
    await page.reload({ waitUntil: 'networkidle' });
    const pad = await page.locator('#draw-pad').boundingBox();
    assert.ok(pad, 'The sample player did not receive a drawing pad.');
    await page.mouse.move(pad.x + 40, pad.y + 40);
    await page.mouse.down();
    await page.mouse.move(pad.x + 160, pad.y + 130);
    await page.mouse.up();
    await page.waitForFunction(() => {
      const saved = localStorage.getItem('demo:living-room-lobby:room');
      return saved ? JSON.parse(saved).drawing.length > 13 : false;
    });
    await page.evaluate(() => sessionStorage.setItem('demo:living-room-lobby:session', JSON.stringify({ role: 'host', code: 'DEMO', token: 'demo-host-token' })));
    await page.reload({ waitUntil: 'networkidle' });
    const after = await page.locator('#tv-canvas').evaluate((canvas) => (canvas).toDataURL());
    assert.notEqual(after, before, 'A phone drawing did not appear on the shared TV canvas.');
  } finally {
    await context.close();
  }
}

async function checkPointControls(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.locator('#end-game').click();
    await page.locator('[data-game="point"]').click();
    await page.evaluate(() => sessionStorage.setItem('demo:living-room-lobby:session', JSON.stringify({
      role: 'player', code: 'DEMO', token: 'demo-player-demo-asha', playerId: 'demo-asha', name: 'Asha', mode: 'solo',
    })));
    await page.reload({ waitUntil: 'networkidle' });
    const controls = page.locator('[data-move]');
    assert.equal(await controls.count(), 4, 'Point Panic must show all four labeled arrow controls.');
    assert.equal(await page.locator('#motion').count(), 1, 'Point Panic must offer the optional tilt control.');
    await page.locator('[data-move="up"]').click();
    await page.locator('[data-move="up"]').click();
    await page.waitForTimeout(100);
    const pointer = await page.evaluate(() => {
      const saved = localStorage.getItem('demo:living-room-lobby:room');
      return saved && JSON.parse(saved).players.find((item) => item.id === 'demo-asha');
    });
    assert.ok(pointer && pointer.y < 41, `The labeled arrow pad did not move Asha: ${JSON.stringify(pointer)}`);
  } finally {
    await context.close();
  }
}

async function assertDurableRoomReads(host, phone, code) {
  // The verifier's P0 saw a new room return both 200 and 404 as traffic hit
  // different replicas. Read through the independent TV and phone contexts
  // before the phone joins; all reads must resolve the host's exact room.
  const reads = await Promise.all(Array.from({ length: 20 }, async (_, attempt) => {
    const page = attempt % 2 === 0 ? host : phone;
    return page.evaluate(async (roomCode) => {
      const response = await fetch(`/api/rooms/${roomCode}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      return { status: response.status, code: body.room?.code };
    }, code);
  }));
  assert.deepEqual(reads.map((read) => read.status), Array(20).fill(200), 'Every host/phone room read must be 200.');
  assert.ok(reads.every((read) => read.code === code), 'A durable room read did not return the host room.');
}

async function joinPlayersViaApi(page, code, names) {
  for (const name of names) {
    const joined = await page.evaluate(async ({ roomCode, playerName }) => {
      const response = await fetch(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: playerName, mode: 'solo' }),
      });
      return { status: response.status, body: await response.json() };
    }, { roomCode: code, playerName: name });
    assert.equal(joined.status, 200, `${name} could not join room ${code}: ${JSON.stringify(joined.body)}`);
  }
  await page.waitForFunction((minimum) => document.querySelectorAll('.player').length >= minimum, names.length);
}

async function checkCoreRoomFlow(browser) {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const host = await hostContext.newPage();
  const phone = await phoneContext.newPage();
  const hostErrors = recordErrors(host);
  const phoneErrors = recordErrors(phone);
  try {
    await host.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await host.keyboard.press('Tab');
    assert.equal(await host.locator('.skip-link').evaluate((element) => document.activeElement === element), true);
    await host.locator('#host-room').click();
    await host.locator('.game-choices').waitFor();
    const roomHeading = await host.locator('.room-heading h1').textContent();
    const code = roomHeading?.match(/[A-Z0-9]{4}/)?.[0];
    assert.ok(code, `Could not read the room code from ${roomHeading}`);

    await phone.goto(`${baseUrl}/?join=${code}`, { waitUntil: 'networkidle' });
    await assertDurableRoomReads(host, phone, code);
    await phone.locator('#player-name').fill('QA Family');
    await phone.locator('input[value="shared"]').check();
    await phone.locator('#join-form button[type="submit"]').click();
    await phone.getByRole('heading', { name: 'Nice, QA Family.' }).waitFor();
    await host.waitForFunction(() => document.body.textContent?.includes('QA Family'));
    await joinPlayersViaApi(host, code, ['Kai', 'Mina']);

    await host.locator('[data-game="draw"]').focus();
    await host.keyboard.press('ArrowRight');
    assert.equal(await host.locator('[data-game="point"]').evaluate((element) => document.activeElement === element), true);
    await host.keyboard.press('ArrowLeft');
    await host.keyboard.press('Enter');
    await host.locator('#tv-canvas').waitFor();
    await phone.locator('#draw-pad').waitFor();
    const drawingPad = await phone.locator('#draw-pad').boundingBox();
    assert.ok(drawingPad, 'Draw pad was not visible on the phone.');
    await phone.mouse.move(drawingPad.x + 40, drawingPad.y + 40);
    await phone.mouse.down();
    await phone.mouse.move(drawingPad.x + 120, drawingPad.y + 120);
    await phone.mouse.up();
    await host.waitForFunction(async (roomCode) => {
      const response = await fetch(`/api/rooms/${roomCode}`);
      return (await response.json()).room.drawing.length >= 2;
    }, code);

    await host.locator('#end-game').click();
    await phone.locator('#leave-room').waitFor();
    await host.locator('[data-game="pass"]').click();
    await phone.locator('#pass-card').waitFor();
    await phone.locator('#pass-card').click();
    await phone.locator('#next-person').click();
    await phone.locator('#got-card').click();
    await host.waitForFunction(async (roomCode) => {
      const response = await fetch(`/api/rooms/${roomCode}`);
      return (await response.json()).room.players.some((player) => player.name === 'QA Family' && player.score === 1);
    }, code);

    await host.locator('#end-game').click();
    await phone.locator('#leave-room').waitFor();
    await host.locator('[data-game="point"]').click();
    await phone.locator('[data-move="up"]').waitFor();
    for (let count = 0; count < 14; count += 1) await phone.locator('[data-move="up"]').click();
    await phone.locator('#score-point').click();
    await phone.locator('.toast.show').waitFor();
    assert.match(await phone.locator('.toast.show').textContent(), /Hit! \+1|So close — aim for the moss ring\./);
    assert.deepEqual(hostErrors, [], `Core host flow errors: ${hostErrors.join(' | ')}`);
    assert.deepEqual(phoneErrors, [], `Core phone flow errors: ${phoneErrors.join(' | ')}`);
  } finally {
    await hostContext.close();
    await phoneContext.close();
  }
}

async function checkSharedRoomReads() {
  const client = '198.51.100.77';
  const created = await fetch(`${baseUrl}/api/rooms`, { method: 'POST', headers: { 'x-forwarded-for': client } });
  assert.equal(created.status, 200);
  const payload = await created.json();
  const reads = await Promise.all(Array.from({ length: 20 }, () => fetch(`${baseUrl}/api/rooms/${payload.code}`, {
    headers: { 'cache-control': 'no-store', 'x-forwarded-for': client },
  })));
  assert.deepEqual(reads.map((response) => response.status), Array(20).fill(200), 'Every immediate room read must reach the created room.');
  const rooms = await Promise.all(reads.map((response) => response.json()));
  assert.ok(rooms.every((entry) => entry.room.code === payload.code), 'A room read returned another room.');
}

async function checkRoomCreationLimit() {
  const client = '198.51.100.78';
  for (let count = 0; count < 12; count += 1) {
    const response = await fetch(`${baseUrl}/api/rooms`, { method: 'POST', headers: { 'x-forwarded-for': client } });
    assert.equal(response.status, 200, `Room creation ${count + 1} was unexpectedly limited.`);
  }
  const limited = await fetch(`${baseUrl}/api/rooms`, { method: 'POST', headers: { 'x-forwarded-for': client } });
  assert.equal(limited.status, 429, 'The thirteenth room creation must be limited.');
  assert.equal(limited.headers.get('retry-after'), '60');
}

async function checkDemoApiLimit() {
  // Verification 5 sent 100 concurrent demo provisions through one client and
  // received no 429. The first 40 may pass; request 41 must be told to wait.
  const client = '198.51.100.79';
  const responses = await Promise.all(Array.from({ length: 41 }, () => fetch(`${baseUrl}/api/demo`, {
    method: 'POST', headers: { 'x-forwarded-for': client },
  })));
  const allowed = responses.filter((response) => response.status === 200);
  const limited = responses.filter((response) => response.status === 429);
  assert.equal(allowed.length, 40, 'Exactly 40 demo requests per second may pass for one client.');
  assert.equal(limited.length, 1, 'The 41st concurrent demo request must be rate limited.');
  assert.equal(limited[0].headers.get('retry-after'), '1');
}

async function checkRemoteControls(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.locator('#end-game').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#next-round').evaluate((element) => document.activeElement === element), true);
    await page.locator('#end-game').click();
    await page.locator('[data-game="draw"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-game="point"]').evaluate((element) => document.activeElement === element), true);
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: /Point Panic/i }).waitFor();
    assert.equal(await page.locator('.point-arena').count(), 1, 'Enter/OK did not choose the focused game.');
  } finally {
    await context.close();
  }
}

async function checkSharedPhoneDemo(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.locator('#end-game').click();
    await page.locator('[data-game="pass"]').click();
    await page.evaluate(() => sessionStorage.setItem('demo:living-room-lobby:session', JSON.stringify({
      role: 'player', code: 'DEMO', token: 'demo-player-demo-marc', playerId: 'demo-marc', name: 'Marcos', mode: 'shared',
    })));
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#pass-card').click();
    await page.getByRole('heading', { name: 'Pass the phone' }).waitFor();
    assert.equal(await page.locator('#next-person').count(), 1);
  } finally {
    await context.close();
  }
}

async function checkFamilyPackUnavailable(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.locator('#start-real').click();
    await page.getByRole('heading', { name: /Extra games are not available yet/ }).waitFor();
    assert.equal(await page.getByRole('link', { name: /Buy the Family Pack/i }).count(), 0, 'An unavailable checkout must not be advertised as a purchase action.');
    assert.match(await page.locator('.family-pack').textContent(), /Buying extra games is not available yet/);
    await page.locator('#host-room').click();
    await page.locator('[data-game="statue"]').click();
    await page.locator('.toast.show').waitFor();
    assert.match(await page.locator('.toast.show').textContent(), /extra game is not available yet/i);
    const code = (await page.locator('.room-heading h1').textContent()).match(/[A-Z0-9]{4}/)?.[0];
    assert.ok(code, 'The Family Pack check room did not show a code.');
    await joinPlayersViaApi(page, code, ['Asha', 'Bo']);
    await page.locator('[data-game="draw"]').click();
    await page.locator('#tv-canvas').waitFor();
  } finally {
    await context.close();
  }
}

async function checkInactiveLicenseNotice(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const requests = [];
  await context.route('https://api.sociobot.in/api/v1/products/living-room-lobby/verify?license=inactive-license-token', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ valid: false, reason: 'revoked' }),
  }));
  page.on('request', (request) => requests.push(request.url()));
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.goto(`${baseUrl}/?license=inactive-license-token`, { waitUntil: 'networkidle' });
    await page.locator('.license-status').waitFor({ timeout: 5_000 });
    const renderedStatus = await page.locator('.license-status').textContent();
    assert.match(renderedStatus || '', /This license is no longer active/, `Inactive license status was not rendered: ${await page.locator('body').textContent()}`);
    assert.doesNotMatch(page.url(), /license=/, 'A captured license token must be removed from the address bar.');
    assert.equal(await page.locator('.unlocked').count(), 0, 'An inactive license unlocked the Family Pack.');
    const storedLicense = await page.evaluate(() => ({
      token: localStorage.getItem('sb_license:living-room-lobby'),
      verdict: JSON.parse(localStorage.getItem('sb_license:living-room-lobby:verdict') || '{}'),
    }));
    assert.equal(storedLicense.token, 'inactive-license-token');
    assert.equal(storedLicense.verdict.valid, false);
    assert.equal(typeof storedLicense.verdict.checkedAt, 'number');
    assert.ok(requests.some((url) => url.includes('/verify?license=inactive-license-token')), 'The inactive license was not checked with Sociobot.');
    assert.ok(!requests.some((url) => new URL(url).origin === baseUrl && new URL(url).pathname.startsWith('/api/rooms')), 'License verification must not send a token to the room API.');
  } finally {
    await context.close();
  }
}

async function checkNoAdvertisingOrAnalytics(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    assert.ok(requests.every((url) => new URL(url).origin === baseUrl), `A sample visit requested a third-party asset: ${requests.join(', ')}`);
    assert.equal(await page.locator('script[src]').evaluateAll((scripts) => scripts.every((script) => new URL(script.src).origin === location.origin)), true);
  } finally {
    await context.close();
  }
}

async function checkMinimalJoinData(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.locator('#start-real').click();
    await page.locator('#show-join').click();
    const controls = await page.locator('#join-form input').evaluateAll((inputs) => inputs.map((input) => ({ name: input.name, type: input.type, autocomplete: input.autocomplete })));
    assert.deepEqual(controls, [
      { name: 'code', type: 'text', autocomplete: 'off' },
      { name: 'name', type: 'text', autocomplete: 'nickname' },
      { name: 'mode', type: 'radio', autocomplete: '' },
      { name: 'mode', type: 'radio', autocomplete: '' },
    ]);
  } finally {
    await context.close();
  }
}

async function checkColdOfflineReload(browser) {
  // This context is intentionally independent: it proves a first service-worker
  // install without reusing another browser context's cache or connection state.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = recordErrors(page);
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    const cacheEntries = await page.evaluate(async () => {
      const names = await caches.keys();
      return Promise.all(names.map(async (name) => {
        const requests = await (await caches.open(name)).keys();
        return requests.map((request) => new URL(request.url).pathname);
      }));
    });
    const cachedPaths = cacheEntries.flat();
    assert.ok(cachedPaths.some((path) => /\/assets\/index-[^/]+\.js$/.test(path)), 'The release shell did not precache its JavaScript bundle.');
    assert.ok(cachedPaths.some((path) => /\/assets\/index-[^/]+\.css$/.test(path)), 'The release shell did not precache its CSS bundle.');

    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.clearBrowserCache');
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('main h1').waitFor();
    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(await page.locator('.demo-banner').count(), 1);
    assert.equal(await page.locator('.topbar').evaluate((element) => getComputedStyle(element).borderBottomStyle), 'solid');
    assert.deepEqual(errors, [], `Cold offline reload emitted errors: ${errors.join(' | ')}`);
  } finally {
    await context.close();
  }
}

const workDir = await mkdtemp(join(tmpdir(), 'living-room-lobby-e2e-'));
const databaseUrl = `sqlite://${join(workDir, 'lobby.db')}?mode=rwc`;
const server = spawn(resolve(root, 'target/debug/living-room-lobby'), [], {
  cwd: root,
  env: { ...process.env, PORT: String(port), DATABASE_URL: databaseUrl, RUST_LOG: 'warn' },
  stdio: 'pipe',
});
let serverError = '';
let serverExited = false;
const serverExit = new Promise((resolveExit) => server.once('exit', () => { serverExited = true; resolveExit(undefined); }));
server.stderr.on('data', (chunk) => { serverError += String(chunk); });

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    if (included('@claim:same-origin-requests') || !grep) await checkDesktopAndPrivacy(browser);
    if (included('@claim:demo-sandbox') || !grep) await checkDemoSandbox(browser);
    if (included('@claim:account-free-sample') || !grep) await checkAccountFreeSample(browser);
    if (included('@claim:no-account-required') || !grep) await checkNoAccountRequired(browser);
    if (included('@claim:real-room-session-storage') || !grep) await checkRealRoomSessionStorage(browser);
    if (included('@claim:browser-storage-clear') || !grep) await checkBrowserStorageClear(browser);
    if (included('@claim:demo-real-room-isolation') || !grep) await checkDemoRealRoomIsolation(browser);
    if (included('@regression:mobile-a11y') || !grep) await checkMobileCatalogueAndPointA11y(browser);
    if (included('@regression:mobile-first-viewport') || !grep) await checkMobileFirstViewport(browser);
    if (included('@regression:mobile-hero-artwork') || !grep) await checkMobileHeroArtwork(browser);
    if (included('@regression:mobile-text-resize-reflow') || !grep) await checkMobileTextResizeReflow(browser);
    if (included('@regression:desktop-first-viewport') || !grep) await checkDesktopFirstViewport(browser);
    if (included('@regression:prompt-rail-geometry') || !grep) await checkPromptRailGeometry(browser);
    if (included('@claim:language-light-round') || !grep) await checkSpanishPictureRound(browser);
    if (included('@claim:join-code-path') || !grep) await checkJoinCodePath(browser);
    if (included('@regression:route-announcement') || !grep) await checkRouteAnnouncement(browser);
    if (included('@regression:core-room-flow') || included('@claim:shared-tv-phone-round') || !grep) await checkCoreRoomFlow(browser);
    if (included('@regression:shared-room-store') || !grep) await checkSharedRoomReads();
    if (included('@regression:room-create-limit') || !grep) await checkRoomCreationLimit();
    if (included('@regression:api-rate-limit') || !grep) await checkDemoApiLimit();
    if (included('@regression:styled-404') || !grep) await checkDesignedNotFound(browser);
    if (included('@claim:remote-controls') || !grep) await checkRemoteControls(browser);
    if (included('@claim:shared-phone') || !grep) await checkSharedPhoneDemo(browser);
    if (included('@claim:shared-tv-canvas') || !grep) await checkSharedTvCanvas(browser);
    if (included('@claim:point-controls') || !grep) await checkPointControls(browser);
    if (included('@claim:family-pack-unavailable') || !grep) await checkFamilyPackUnavailable(browser);
    if (included('@claim:license-status') || !grep) await checkInactiveLicenseNotice(browser);
    if (included('@claim:no-advertising-or-analytics') || !grep) await checkNoAdvertisingOrAnalytics(browser);
    if (included('@claim:minimal-join-data') || !grep) await checkMinimalJoinData(browser);
    if (included('@claim:free-game-availability') || !grep) await checkFreeGameAvailability(browser);
    if (included('@claim:player-count-limits') || !grep) await checkPlayerCountLimits(browser);
    if (included('@claim:offline-reload') || !grep) await checkColdOfflineReload(browser);
    if (included('@regression:invalid-room-code-recovery') || !grep) await checkInvalidRoomCodeRecovery(browser);
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGINT');
  // A local Windows-compatible signal shim can acknowledge SIGINT without
  // closing the child. Do not leave a verification command hanging forever.
  await Promise.race([serverExit, delay(2_000)]);
  if (!serverExited) {
    server.kill('SIGKILL');
    await Promise.race([serverExit, delay(2_000)]);
  }
  await rm(workDir, { recursive: true, force: true });
}

if (serverError) process.stderr.write(serverError);
console.log('Browser regression checks passed.');
