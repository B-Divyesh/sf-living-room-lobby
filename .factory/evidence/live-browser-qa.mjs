import { strict as assert } from 'node:assert';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const base = 'https://living-room-lobby.sociobot.in';
const evidence = {};

function watch(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function axe(page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations.map((entry) => ({
    id: entry.id,
    impact: entry.impact,
    targets: entry.nodes.map((node) => node.target.join(' ')),
  }));
}

const browser = await chromium.launch({ headless: true });
try {
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = watch(page);
    const requests = [];
    page.on('request', (request) => {
      if (request.url().startsWith('http')) requests.push({ method: request.method(), url: request.url() });
    });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    const focus = await page.locator('.skip-link').evaluate((element) => ({
      focused: document.activeElement === element,
      outline: getComputedStyle(element).outline,
      box: element.getBoundingClientRect().toJSON(),
    }));
    const semantics = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      main: document.querySelectorAll('main').length,
      h1: document.querySelectorAll('h1').length,
      imagesWithoutAlt: [...document.images].filter((image) => !image.hasAttribute('alt')).length,
    }));
    const copy = {
      join: await page.getByText('Use the TV room code to join.', { exact: true }).count(),
      purchase: await page.getByText('Buying extra games is not available yet.', { exact: true }).count(),
      license: await page.getByText('Verify a Family Pack license', { exact: true }).count(),
    };
    const homeAxe = await axe(page);
    await page.screenshot({ path: '.factory/evidence/polish-2-live-first-screen.png', fullPage: false });
    await page.getByRole('link', { name: /Try it with sample data/ }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Draw together/i }).waitFor();
    const demoAxe = await axe(page);
    const demo = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      heading: document.querySelector('main h1')?.textContent?.trim(),
      banner: document.querySelector('.demo-banner')?.textContent?.replace(/\s+/g, ' ').trim(),
      localKeys: Object.keys(localStorage),
      sessionKeys: Object.keys(sessionStorage),
    }));
    await page.screenshot({ path: '.factory/evidence/live-demo-desktop.png', fullPage: false });
    await page.locator('#end-game').click();
    await page.evaluate(() => {
      const key = 'demo:living-room-lobby:room';
      const room = JSON.parse(localStorage.getItem(key));
      room.players = room.players.slice(0, 1);
      room.stage = 'lobby';
      room.game = null;
      localStorage.setItem(key, JSON.stringify(room));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-game="draw"]').click();
    const capacityMessage = await page.locator('.toast.show').textContent();
    assert.match(capacityMessage, /Draw Together needs 2–10 players\. Ask 1 more player to join\./);
    await page.screenshot({ path: '.factory/evidence/polish-2-live-player-limit.png', fullPage: false });
    evidence.desktop = {
      semantics,
      copy,
      focus,
      homeAxe,
      demoAxe,
      demo,
      origins: [...new Set(requests.map((request) => new URL(request.url).origin))],
      apiPaths: requests.filter((request) => new URL(request.url).pathname.startsWith('/api/')).map((request) => `${request.method} ${new URL(request.url).pathname}`),
      capacityMessage,
      errors,
    };
    await context.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = watch(page);
    await page.goto(base, { waitUntil: 'networkidle' });
    const cta = await page.getByRole('link', { name: /Try it with sample data/ }).boundingBox();
    const layout = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      h1: document.querySelector('h1')?.getBoundingClientRect().toJSON(),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      buttonTransitionDuration: getComputedStyle(document.querySelector('.button')).transitionDuration,
    }));
    const homeAxe = await axe(page);
    await page.screenshot({ path: '.factory/evidence/live-first-read-mobile.png', fullPage: false });
    await page.goto(`${base}/demo`, { waitUntil: 'networkidle' });
    const demoAxe = await axe(page);
    const targetSizes = await page.locator('a, button, input').evaluateAll((elements) => elements
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      })
      .map((element) => {
        const box = element.getBoundingClientRect();
        return { text: (element.textContent || element.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '), width: box.width, height: box.height };
      }));
    evidence.mobile = { cta, layout, homeAxe, demoAxe, targetSizes, errors };
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = watch(page);
    const responses = [];
    page.on('response', (response) => {
      if (new URL(response.url()).pathname.endsWith('/join')) responses.push({ status: response.status(), url: response.url() });
    });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('#show-join').click();
    await page.locator('#join-form button[type="submit"]').click();
    const emptyValidity = await page.evaluate(() => ({
      code: document.querySelector('#room-code').validity.valueMissing,
      name: document.querySelector('#player-name').validity.valueMissing,
    }));
    await page.locator('#room-code').fill('zzzz');
    await page.locator('#player-name').fill('ABCDEFGHIJKLMNOPQRSTU');
    const clampedNameLength = await page.locator('#player-name').inputValue().then((value) => value.length);
    await page.locator('#join-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('#join-error')?.textContent?.trim());
    await page.waitForTimeout(150);
    evidence.invalidRecovery = {
      emptyValidity,
      clampedNameLength,
      message: await page.locator('#join-error').textContent(),
      responses,
      errors,
    };
    await context.close();
  }

  {
    const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const host = await hostContext.newPage();
    const phone = await phoneContext.newPage();
    const hostErrors = watch(host);
    const phoneErrors = watch(phone);
    await host.goto(base, { waitUntil: 'networkidle' });
    await host.locator('#host-room').click();
    await host.locator('.game-choices').waitFor();
    const heading = await host.locator('.room-heading h1').textContent();
    const code = heading.match(/[A-Z0-9]{4}/)[0];
    await phone.goto(`${base}/?join=${code}`, { waitUntil: 'networkidle' });
    const readStatuses = await Promise.all(Array.from({ length: 20 }, (_, index) => (index % 2 ? host : phone).evaluate(async (roomCode) => {
      const response = await fetch(`/api/rooms/${roomCode}`, { cache: 'no-store' });
      return response.status;
    }, code)));
    await phone.locator('#player-name').fill('ABCDEFGHIJKLMNOPQRST');
    await phone.locator('input[value="shared"]').check();
    await phone.locator('#join-form button[type="submit"]').click();
    await phone.getByRole('heading', { name: 'Nice, ABCDEFGHIJKLMNOPQRST.' }).waitFor();
    await host.waitForFunction(() => document.body.textContent?.includes('ABCDEFGHIJKLMNOPQRST'));
    for (const name of ['Kai', 'Mina']) {
      const response = await host.evaluate(async ({ roomCode, playerName }) => {
        const result = await fetch(`/api/rooms/${roomCode}/join`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: playerName, mode: 'solo' }),
        });
        return { status: result.status, body: await result.json() };
      }, { roomCode: code, playerName: name });
      assert.equal(response.status, 200, `${name} could not join the live room: ${JSON.stringify(response.body)}`);
    }
    await host.waitForFunction(() => document.querySelectorAll('.player').length === 3);
    await host.locator('[data-game="draw"]').focus();
    await host.keyboard.press('ArrowRight');
    const remoteMoved = await host.locator('[data-game="point"]').evaluate((element) => document.activeElement === element);
    await host.keyboard.press('ArrowLeft');
    await host.keyboard.press('Enter');
    await host.locator('#tv-canvas').waitFor();
    const remoteChosen = await host.getByRole('heading', { name: /Draw Together/i }).isVisible();
    await host.screenshot({ path: '.factory/evidence/polish-2-live-remote-enter.png', fullPage: false });
    await phone.locator('#draw-pad').waitFor();
    await host.locator('#end-game').click();
    await phone.locator('#leave-room').waitFor();
    await host.locator('[data-game="pass"]').click();
    await phone.locator('#pass-card').waitFor();
    await phone.locator('#pass-card').click();
    const passHeading = await phone.locator('h1').textContent();
    evidence.realRoom = { code, readStatuses, remoteMoved, remoteChosen, passHeading, hostErrors, phoneErrors };
    await hostContext.close();
    await phoneContext.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = watch(page);
    await page.goto(`${base}/demo`, { waitUntil: 'networkidle' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    const cachesBefore = await page.evaluate(() => caches.keys());
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.clearBrowserCache');
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('main h1').waitFor();
    evidence.offline = {
      cachesBefore,
      heading: await page.locator('main h1').textContent(),
      banner: await page.locator('.demo-banner').count(),
      errors,
    };
    await context.close();
  }
} finally {
  await browser.close();
}

assert.ok(evidence.desktop.origins.every((origin) => origin === base));
assert.ok(evidence.realRoom.readStatuses.every((status) => status === 200));
console.log(JSON.stringify(evidence, null, 2));
