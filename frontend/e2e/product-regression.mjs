import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

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
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.locator('#end-game').click();
    assert.match(await page.locator('.section-title').first().textContent(), /3\s*\/\s*12/, 'The demo did not retain its three-player sample.');
    for (const [id, name, range] of expectedRanges) {
      const choice = page.locator(`[data-game="${id}"]`);
      assert.match(await choice.textContent(), new RegExp(`${name}.*${range}`, 'i'), `${name} did not show ${range}.`);
    }
    for (const [id, name] of expectedRanges.slice(0, 3)) {
      await page.locator(`[data-game="${id}"]`).click();
      await page.getByRole('heading', { name: new RegExp(name, 'i') }).waitFor();
      await page.locator('#end-game').click();
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

async function checkFamilyPackPrice(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
    await page.locator('#end-game').click();
    await page.locator('[data-game="statue"]').click();
    await page.locator('.toast.show').waitFor();
    assert.match(await page.locator('.toast.show').textContent(), /\$12 one-time Family Pack/);
    await page.locator('[data-game="draw"]').click();
    await page.locator('#tv-canvas').waitFor();
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
server.stderr.on('data', (chunk) => { serverError += String(chunk); });

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    if (included('@claim:same-origin-requests') || !grep) await checkDesktopAndPrivacy(browser);
    if (included('@claim:demo-sandbox') || !grep) await checkDemoSandbox(browser);
    if (included('@claim:account-free-sample') || !grep) await checkAccountFreeSample(browser);
    if (included('@claim:demo-real-room-isolation') || !grep) await checkDemoRealRoomIsolation(browser);
    if (included('@regression:mobile-a11y') || !grep) await checkMobileCatalogueAndPointA11y(browser);
    if (included('@regression:core-room-flow') || !grep) await checkCoreRoomFlow(browser);
    if (included('@regression:shared-room-store') || !grep) await checkSharedRoomReads();
    if (included('@regression:room-create-limit') || !grep) await checkRoomCreationLimit();
    if (included('@regression:api-rate-limit') || !grep) await checkDemoApiLimit();
    if (included('@regression:styled-404') || !grep) await checkDesignedNotFound(browser);
    if (included('@claim:remote-controls') || !grep) await checkRemoteControls(browser);
    if (included('@claim:shared-phone') || !grep) await checkSharedPhoneDemo(browser);
    if (included('@claim:family-pack-price') || !grep) await checkFamilyPackPrice(browser);
    if (included('@claim:free-game-availability') || !grep) await checkFreeGameAvailability(browser);
    if (included('@claim:player-count-limits') || !grep) await checkPlayerCountLimits(browser);
    if (included('@claim:offline-reload') || !grep) await checkColdOfflineReload(browser);
    if (included('@regression:invalid-room-code-recovery') || !grep) await checkInvalidRoomCodeRecovery(browser);
  } finally {
    await browser.close();
  }
} finally {
  server.kill('SIGINT');
  await new Promise((resolveExit) => server.once('exit', resolveExit));
  await rm(workDir, { recursive: true, force: true });
}

if (serverError) process.stderr.write(serverError);
console.log('Browser regression checks passed.');
