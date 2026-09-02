import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const base = 'https://living-room-lobby.sociobot.in';
const candidate = '5aa0299dc151b2ee16ac10be6f2e07be20a7bfd2';
const report = { candidate, base, checkedAt: new Date().toISOString() };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function responseRecord(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  return {
    path,
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.text(),
  };
}

const home = await responseRecord('/?verification=15');
const health = await responseRecord('/health?verification=15');
const sw = await responseRecord('/sw.js?verification=15');
const jsPath = home.body.match(/src="([^"]+\.js)"/)?.[1];
const cssPath = home.body.match(/href="([^"]+\.css)"/)?.[1];
assert(jsPath && cssPath, 'The shell did not name hashed JavaScript and CSS.');
const [js, css, hero, manifest, robots, sitemap] = await Promise.all([
  responseRecord(jsPath),
  responseRecord(cssPath),
  responseRecord('/assets/lobby-hero.webp'),
  responseRecord('/manifest.webmanifest'),
  responseRecord('/robots.txt'),
  responseRecord('/sitemap.xml'),
]);
const healthBody = JSON.parse(health.body);
assert.equal(healthBody.build, candidate);
assert.match(js.body, new RegExp(candidate));
assert.match(sw.body, new RegExp(`living-room-lobby-${candidate}`));
for (const item of [home, health, sw, js, css]) {
  assert.equal(item.headers['x-content-type-options'], 'nosniff', `${item.path} missing nosniff`);
  assert.equal(item.headers['x-frame-options'], 'DENY', `${item.path} missing frame denial`);
  assert.match(item.headers['content-security-policy'] || '', /frame-ancestors 'none'/);
  assert.match(item.headers['strict-transport-security'] || '', /max-age=31536000/);
  assert.equal(item.headers['referrer-policy'], 'strict-origin-when-cross-origin');
}
assert.equal(health.headers['cache-control'], 'no-store');
assert.equal(sw.headers['cache-control'], 'no-cache, must-revalidate');
assert.equal(home.headers['cache-control'], 'no-cache, must-revalidate');
assert.equal(js.headers['cache-control'], 'public, max-age=31536000, immutable');
assert.equal(css.headers['cache-control'], 'public, max-age=31536000, immutable');
report.http = {
  health: healthBody,
  shellStatus: home.status,
  jsPath,
  cssPath,
  bytes: {
    javascript: Buffer.byteLength(js.body),
    css: Buffer.byteLength(css.body),
    hero: Number(hero.headers['content-length']),
    serviceWorker: Buffer.byteLength(sw.body),
  },
  cacheControl: { shell: home.headers['cache-control'], health: health.headers['cache-control'], serviceWorker: sw.headers['cache-control'], javascript: js.headers['cache-control'], css: css.headers['cache-control'] },
  security: {
    csp: home.headers['content-security-policy'],
    hsts: home.headers['strict-transport-security'],
    permissionsPolicy: home.headers['permissions-policy'],
    referrerPolicy: home.headers['referrer-policy'],
    contentTypeOptions: home.headers['x-content-type-options'],
    frameOptions: home.headers['x-frame-options'],
  },
  discovery: { manifest: manifest.status, robots: robots.status, sitemap: sitemap.status },
};

const browser = await chromium.launch({ headless: true });
const pageErrors = [];
const attachErrors = (page, label) => {
  page.on('pageerror', (error) => pageErrors.push(`${label}: pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(`${label}: console: ${message.text()}`); });
};

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  attachErrors(page, 'desktop');
  const requests = [];
  page.on('request', (request) => requests.push({ method: request.method(), url: request.url() }));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const firstRead = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    h1: [...document.querySelectorAll('h1')].map((node) => node.textContent.trim()),
    audience: document.querySelector('.hero-copy > p:not(.eyebrow)')?.textContent.trim(),
    primary: document.querySelector('.hero-actions .primary')?.textContent.trim().replace(/\s+/g, ' '),
    primaryExplanation: document.querySelector('.action-explanation')?.textContent.trim(),
    mainCount: document.querySelectorAll('main').length,
  }));
  assert.equal(firstRead.lang, 'en');
  assert.equal(firstRead.mainCount, 1);
  assert.deepEqual(firstRead.h1, ['Play together on your TV.']);
  assert.match(firstRead.audience || '', /families sharing one TV/i);
  assert.match(firstRead.primary || '', /Try it with sample data/i);
  assert.match(firstRead.primaryExplanation || '', /ready Draw Together round with three sample players/i);

  const desktopAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const severeDesktop = desktopAxe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  assert.deepEqual(severeDesktop, []);

  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    const style = getComputedStyle(element);
    return { text: element?.textContent?.trim(), href: element?.getAttribute('href'), outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor };
  });
  assert.equal(focus.href, '#main');
  assert.notEqual(focus.outlineStyle, 'none');
  assert.ok(parseFloat(focus.outlineWidth) >= 2);
  await page.screenshot({ path: '.factory/evidence-15/live-keyboard-focus.png' });

  const demoResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/demo' && response.request().method() === 'POST');
  await page.getByRole('link', { name: /Try it with sample data/ }).click();
  const seeded = await demoResponse;
  assert.equal(seeded.status(), 200);
  await page.getByRole('heading', { name: /Draw Together/i }).waitFor();
  assert.match(await page.locator('.demo-banner').innerText(), /sample data, nothing is saved to a real room/i);
  await page.screenshot({ path: '.factory/evidence-15/live-demo-desktop.png', fullPage: true });
  const demoAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  assert.deepEqual(demoAxe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)), []);
  const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie }));
  assert(storage.local.every((key) => key.startsWith('demo:')));
  assert(storage.session.every((key) => key.startsWith('demo:')));
  assert.equal(storage.cookies, '');
  assert(requests.every((request) => new URL(request.url).origin === base));
  report.desktop = { firstRead, axeViolations: desktopAxe.violations.length, demoAxeViolations: demoAxe.violations.length, focus, requestCount: requests.length, requestOrigins: [...new Set(requests.map((request) => new URL(request.url).origin))], storage };

  const routes = [];
  for (const [path, expectedStatus] of [['/', 200], ['/demo', 200], ['/privacy', 200], ['/terms', 200], ['/missing-verification-15', 404]]) {
    const routePage = await desktop.newPage();
    if (expectedStatus !== 404) attachErrors(routePage, path);
    const response = await routePage.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    const route = await routePage.evaluate(() => ({ title: document.title, h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length, lang: document.documentElement.lang, canonical: document.querySelector('link[rel="canonical"]')?.href, description: document.querySelector('meta[name="description"]')?.content, ogImage: document.querySelector('meta[property="og:image"]')?.content }));
    assert.equal(response.status(), expectedStatus);
    assert.equal(route.h1, 1);
    assert.equal(route.main, 1);
    assert.equal(route.lang, 'en');
    assert(route.canonical && route.description && route.ogImage);
    routes.push({ path, status: response.status(), ...route });
    await routePage.close();
  }
  report.routes = routes;

  const internalLinks = await page.locator('a[href]').evaluateAll((anchors) => [...new Set(anchors.map((anchor) => anchor.href).filter((href) => href.startsWith(location.origin)))]);
  report.links = [];
  for (const url of internalLinks) {
    const response = await desktop.request.get(url, { failOnStatusCode: false });
    report.links.push({ url, status: response.status() });
    assert(response.status() < 400, `${url} returned ${response.status()}`);
  }
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  attachErrors(mobilePage, 'mobile');
  await mobilePage.goto(`${base}/`, { waitUntil: 'networkidle' });
  const mobileAxe = await new AxeBuilder({ page: mobilePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  assert.deepEqual(mobileAxe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)), []);
  const mobileLayout = await mobilePage.evaluate(() => {
    const targets = [...document.querySelectorAll('a,button,input,select,summary,[tabindex]')].filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }).map((element) => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80), width: Math.round(rect.width), height: Math.round(rect.height) };
    });
    return { innerWidth, scrollWidth: document.documentElement.scrollWidth, targets, undersized: targets.filter((target) => target.width < 44 || target.height < 44) };
  });
  assert(mobileLayout.scrollWidth <= mobileLayout.innerWidth);
  await mobilePage.screenshot({ path: '.factory/evidence-15/live-mobile-390.png', fullPage: true });
  report.mobile = { axeViolations: mobileAxe.violations.length, layout: mobileLayout };
  await mobile.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  attachErrors(reducedPage, 'reduced-motion');
  await reducedPage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
  const motion = await reducedPage.evaluate(() => [...document.querySelectorAll('*')].map((element) => {
    const style = getComputedStyle(element);
    return { tag: element.tagName, transition: style.transitionDuration, animation: style.animationDuration, iteration: style.animationIterationCount };
  }).filter((item) => item.transition !== '0s' || item.animation !== '0s'));
  assert(motion.every((item) => parseFloat(item.transition) <= 0.001 && parseFloat(item.animation) <= 0.001));
  assert(motion.every((item) => item.iteration !== 'infinite'));
  report.reducedMotion = motion;
  await reduced.close();

  const offline = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const offlinePage = await offline.newPage();
  attachErrors(offlinePage, 'offline');
  await offlinePage.goto(`${base}/demo`, { waitUntil: 'networkidle' });
  await offlinePage.getByRole('heading', { name: /Draw Together/i }).waitFor();
  await offlinePage.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  const cacheBefore = await offlinePage.evaluate(() => caches.keys());
  assert(cacheBefore.includes(`living-room-lobby-${candidate}`));
  await offline.setOffline(true);
  await offlinePage.reload({ waitUntil: 'domcontentloaded' });
  await offlinePage.getByRole('heading', { name: /Draw Together/i }).waitFor();
  assert.match(await offlinePage.locator('.demo-banner').innerText(), /nothing is saved/i);
  await offlinePage.screenshot({ path: '.factory/evidence-15/live-offline-mobile.png' });
  report.offline = { cacheBefore, heading: await offlinePage.locator('h1').innerText(), banner: await offlinePage.locator('.demo-banner').innerText() };
  await offline.setOffline(false);
  await offline.close();

  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const hostPage = await hostContext.newPage();
  const phonePage = await phoneContext.newPage();
  attachErrors(hostPage, 'live-host');
  attachErrors(phonePage, 'live-phone');
  await hostPage.goto(`${base}/`, { waitUntil: 'networkidle' });
  await hostPage.locator('#host-room').click();
  await hostPage.getByText('Lobby is open').waitFor();
  const code = (await hostPage.locator('.room-heading h1 em').innerText()).trim();
  await phonePage.goto(`${base}/?join=${code}`, { waitUntil: 'networkidle' });
  await phonePage.locator('#player-name').fill('QA Family');
  await phonePage.locator('input[value="shared"]').check();
  await phonePage.locator('#join-form button[type="submit"]').click();
  await phonePage.getByRole('heading', { name: 'Nice, QA Family.' }).waitFor();
  await hostPage.getByText('QA Family', { exact: true }).waitFor();
  const secondJoin = await fetch(`${base}/api/rooms/${code}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Boundary Two', mode: 'solo' }) });
  assert.equal(secondJoin.status, 200);
  await hostPage.getByText('Boundary Two', { exact: true }).waitFor();
  await hostPage.locator('#room-language').selectOption('es');
  await hostPage.locator('[data-game="draw"]').click();
  await hostPage.getByRole('heading', { name: /Draw Together/i }).waitFor();
  assert.match(await hostPage.locator('.tv-prompt').innerText(), /DIBUJEN JUNTOS/i);
  await phonePage.reload({ waitUntil: 'networkidle' });
  await phonePage.locator('#draw-pad').waitFor();
  await hostPage.reload({ waitUntil: 'networkidle' });
  await hostPage.getByText('2 playing').waitFor();
  report.realRoom = { code, sharedPhoneJoined: true, spanishRound: true, hostAndPhoneRetainedAfterReload: true };
  await hostContext.close();
  await phoneContext.close();

  await delay(1100);
  const boundaryCreate = await fetch(`${base}/api/rooms`, { method: 'POST' });
  assert.equal(boundaryCreate.status, 200);
  const boundaryPayload = await boundaryCreate.json();
  const boundaryCode = boundaryPayload.code;
  const boundaryResults = [];
  for (let index = 1; index <= 13; index += 1) {
    const response = await fetch(`${base}/api/rooms/${boundaryCode}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: `Player ${index}`, mode: index % 2 ? 'solo' : 'shared' }) });
    boundaryResults.push({ index, status: response.status, body: await response.json() });
  }
  assert(boundaryResults.slice(0, 12).every((result) => result.status === 200));
  assert.equal(boundaryResults[12].status, 400);
  assert.match(boundaryResults[12].body.error, /already has 12 players/i);
  const invalidName = await fetch(`${base}/api/rooms/${boundaryCode}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '123456789012345678901', mode: 'solo' }) });
  assert.equal(invalidName.status, 400);
  const invalidMode = await fetch(`${base}/api/rooms/${boundaryCode}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Mode', mode: 'unknown' }) });
  assert.equal(invalidMode.status, 400);
  const invalidHost = await fetch(`${base}/api/rooms/${boundaryCode}/host`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: 'wrong', stage: 'playing' }) });
  assert.equal(invalidHost.status, 401);
  const invalidRead = await fetch(`${base}/api/rooms/ZZZZ`);
  assert.equal(invalidRead.status, 404);
  await delay(1100);
  const concurrentReads = await Promise.all(Array.from({ length: 20 }, () => fetch(`${base}/api/rooms/${boundaryCode}`)));
  assert(concurrentReads.every((response) => response.status === 200));
  report.boundaries = { roomCode: boundaryCode, joins: boundaryResults.map(({ index, status }) => ({ index, status })), invalidName: invalidName.status, invalidMode: invalidMode.status, invalidHost: invalidHost.status, invalidRead: invalidRead.status, concurrentReadStatuses: concurrentReads.map((response) => response.status) };

  await delay(1100);
  const burst = await Promise.all(Array.from({ length: 45 }, () => fetch(`${base}/api/demo`, { method: 'POST' })));
  const statusCounts = Object.fromEntries([...new Set(burst.map((response) => response.status))].map((status) => [status, burst.filter((response) => response.status === status).length]));
  const limited = burst.filter((response) => response.status === 429);
  assert.equal(statusCounts[200], 40);
  assert.equal(statusCounts[429], 5);
  assert(limited.every((response) => response.headers.get('retry-after') === '1'));
  report.rateLimit = { endpoint: 'POST /api/demo', attempted: 45, statusCounts, retryAfter: [...new Set(limited.map((response) => response.headers.get('retry-after')))] };

  assert.deepEqual(pageErrors, []);
  report.consoleAndPageErrors = pageErrors;
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
