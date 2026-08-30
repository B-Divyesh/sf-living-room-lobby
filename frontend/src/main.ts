import QRCode from 'qrcode';
import './style.css';
import { createRoom, getRoom, hostUpdate, joinRoom, playerAction } from './api';
import { DEMO_PATH, demoMode, discardDemo, loadDemoRoom, loadDemoSession, provisionDemoWorkspace, resetDemo, saveDemoSession } from './demo';
import { games, nextPrompt, passPrompts } from './game-data';
import { cachedUnlock, captureLicense, checkoutUrl, restoreLicense, verifyLicense } from './license';
import { releaseId } from './release';
import type { GameId, Room, Session, StrokePoint } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const buildId = releaseId(import.meta.env.VITE_BUILD_ID);
let room: Room | null = demoMode() ? loadDemoRoom() : null;
let session: Session | null = loadSession();
let unlocked = demoMode() ? false : cachedUnlock();
let routeWasDemo = demoMode();
let offline = !navigator.onLine;
let errorMessage = '';
let polling = 0;
let localPrompt = 0;
let passScreen = false;
let drawBuffer: StrokePoint[] = [];

if (!demoMode()) {
  captureLicense();
  void verifyLicense().then((valid) => { unlocked = valid; render(); });
}

window.addEventListener('online', () => { offline = false; render(); void pollRoom(); });
window.addEventListener('offline', () => { offline = true; render(); });
window.addEventListener('popstate', () => {
  if (!demoMode() && routeWasDemo) {
    discardDemo();
    room = null;
    session = null;
    unlocked = cachedUnlock();
  }
  render();
  focusRouteHeading();
});
document.addEventListener('keydown', remoteKeys);

render();
if (demoMode()) void refreshDemoWorkspace();
if (session && !demoMode()) void reconnect();
if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));

function loadSession(): Session | null {
  if (demoMode()) return loadDemoSession();
  try { return JSON.parse(sessionStorage.getItem('lrl_session') || 'null') as Session | null; } catch { return null; }
}

function saveSession(next: Session | null): void {
  session = next;
  if (demoMode()) { saveDemoSession(next); return; }
  if (next) sessionStorage.setItem('lrl_session', JSON.stringify(next)); else sessionStorage.removeItem('lrl_session');
}

async function reconnect(): Promise<void> {
  if (demoMode()) return;
  try { room = await getRoom(session!.code); errorMessage = ''; startPolling(); }
  catch (error) { errorMessage = message(error); saveSession(null); }
  render();
}

function startPolling(): void {
  window.clearInterval(polling);
  polling = window.setInterval(() => void pollRoom(), 1000);
}

async function pollRoom(): Promise<void> {
  if (!session || offline || demoMode()) return;
  try {
    const fresh = await getRoom(session.code);
    const changed = fresh.revision !== room?.revision;
    room = fresh; errorMessage = '';
    if (changed) render();
  } catch (error) { errorMessage = message(error); render(); }
}

function shell(content: string, page = 'game'): void {
  app.innerHTML = `
    ${demoMode() ? '<aside class="demo-banner" aria-label="Demo controls"><b>Demo — sample data, nothing is saved to a real room</b><span>Sample workspace expires after 24 hours.</span><div><button class="text-button" id="reset-demo">Reset demo</button><button class="text-button" id="start-real">Start for real</button></div></aside>' : ''}
    <header class="topbar">
      <a class="wordmark" href="/" data-nav><span aria-hidden="true">LR</span> Living Room Lobby</a>
      <nav aria-label="Primary"><a href="${DEMO_PATH}" data-nav>Demo</a><a href="/privacy" data-nav>Privacy</a></nav>
      <div class="network ${offline ? 'is-offline' : ''}" role="status" aria-live="polite"><i></i>${offline ? 'Offline practice' : session ? `Room ${session.code}` : 'Ready'}</div>
    </header>
    <main id="main" class="page page-${page}">${content}</main>
    <footer><p>Party games for one shared TV. <a href="/privacy" data-nav>Privacy</a> · <a href="/terms" data-nav>Terms</a></p><p>Original AI-assisted artwork · Built by Param Factory · ${buildId}</p></footer>
    <div class="toast ${errorMessage ? 'show' : ''}" role="alert">${escapeHtml(errorMessage)}</div>`;
  bindCommon();
}

function render(): void {
  const path = location.pathname;
  const inDemo = demoMode();
  if (inDemo && !routeWasDemo) {
    room = loadDemoRoom();
    session = loadDemoSession();
    unlocked = false;
    void refreshDemoWorkspace();
  }
  routeWasDemo = inDemo;
  setRouteMetadata(path);
  if (path === '/privacy') return renderLegal('Privacy');
  if (path === '/terms') return renderLegal('Terms');
  if (session && room) return session.role === 'host' ? renderHost() : renderPlayer();
  renderHome();
}

function renderHome(): void {
  const joinCode = new URLSearchParams(location.search).get('join')?.toUpperCase() || '';
  shell(`
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Party games for one shared TV</p>
        <h1>Play together<br><em>on your TV.</em></h1>
        <p class="lede">For families sharing one TV, these games let kids and relatives play without everyone needing a phone.</p>
        <div class="hero-actions">
          <a class="button primary" href="${DEMO_PATH}" data-nav>Try it with sample data <span aria-hidden="true">→</span></a>
          <button class="button secondary" id="host-room">Start a real room</button>
          <button class="button secondary" id="show-join">Join a room</button>
        </div>
        <p class="action-explanation">See a ready Draw Together round with three sample families.</p>
        <ul class="plain-facts"><li>Try the sample without an account.</li><li>Sample play never changes a real room.</li><li>Extra games cost $12 once.</li></ul>
        <p class="remote-hint"><kbd>↑</kbd><kbd>↓</kbd><kbd>OK</kbd> Use a TV remote to move and choose.</p>
      </div>
      <figure class="hero-art"><picture><img src="/assets/lobby-hero.webp" width="1536" height="1024" alt="A cozy concrete living room with chairs, cushions, a shared phone and playful hands pointing at a television" fetchpriority="high" decoding="async"></picture><figcaption>One screen brings the room together.</figcaption></figure>
    </section>
    <section class="join-panel ${joinCode ? 'open' : ''}" id="join-panel" aria-labelledby="join-title">
      <div><p class="step-number">01 / JOIN</p><h2 id="join-title">Enter the four marks</h2><p>Use the code shown on the TV.</p></div>
      <form id="join-form">
        <label for="room-code">Room code</label>
        <input id="room-code" name="code" value="${escapeHtml(joinCode)}" inputmode="text" maxlength="4" autocomplete="off" required aria-describedby="join-error">
        <label for="player-name">Your name or family name</label>
        <input id="player-name" name="name" maxlength="20" autocomplete="nickname" required>
        <fieldset><legend>How are you playing?</legend>
          <label class="radio-tile"><input type="radio" name="mode" value="solo" checked><span>My own phone</span></label>
          <label class="radio-tile"><input type="radio" name="mode" value="shared"><span>Pass one phone</span></label>
        </fieldset>
        <p id="join-error" class="form-error" aria-live="polite"></p>
        <button class="button primary" type="submit">Step into the lobby</button>
      </form>
    </section>
    <section class="how" aria-labelledby="how-title"><p class="eyebrow">Choose how to play</p><h2 id="how-title">Three ways to play</h2>
      <ol><li><b>TV remote</b><span>Host with arrows and OK.</span></li><li><b>Shared phone</b><span>Pass it after each turn.</span></li><li><b>Personal phone</b><span>Scan once.</span></li></ol>
    </section>
    <section class="catalogue" aria-labelledby="games-title"><div><p class="eyebrow">Games with short prompts</p><h2 id="games-title">Choose a game</h2></div>
      <p id="game-strip-help" class="sr-only">Use the left and right arrow keys to browse all free games.</p>
      <div class="game-strip" tabindex="0" role="region" aria-label="Free games" aria-describedby="game-strip-help">${games.slice(0, 3).map(gameCard).join('')}</div>
    </section>
    <section class="family-pack" aria-labelledby="pack-title"><div><p class="eyebrow">One-time Family Pack</p><h2 id="pack-title">Two more games for $12</h2><p>Get Statue switch and Colour chorus for <strong>$12 once</strong>. Free games stay free.</p></div>
      <div class="pack-actions">${unlocked ? '<p class="unlocked">✓ Family Pack unlocked on this device</p>' : `<a class="button primary" href="${checkoutUrl}">Buy the Family Pack</a><details class="restore"><summary>Have a license? Restore it</summary><form id="restore-form"><label for="license-token">License token</label><input id="license-token" name="license" autocomplete="off" required><button class="button secondary" type="submit" aria-label="Verify Family Pack license">Verify license</button></form></details>`}</div>
    </section>`, 'home');
  bindHome();
}

function gameCard(game: (typeof games)[number]): string {
  return `<article class="game-card"><span class="game-icon" aria-hidden="true">${game.icon}</span><div><h3>${game.name}</h3><p>${game.strap}</p><small>${game.players}</small></div></article>`;
}

function bindHome(): void {
  document.querySelector<HTMLElement>('.game-strip')?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const strip = event.currentTarget as HTMLElement;
    const distance = Math.max(260, Math.round(strip.clientWidth * 0.8));
    strip.scrollBy({
      left: event.key === 'ArrowRight' ? distance : -distance,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    event.preventDefault();
  });
  document.querySelector('#host-room')?.addEventListener('click', async () => {
    setBusy('#host-room', true, 'Making your lobby…');
    try { const result = await createRoom(); room = result.room; saveSession(result.session); startPolling(); render(); }
    catch (error) { errorMessage = message(error); render(); }
  });
  document.querySelector('#show-join')?.addEventListener('click', () => {
    document.querySelector('#join-panel')?.classList.add('open');
    (document.querySelector('#room-code') as HTMLInputElement)?.focus();
  });
  document.querySelector('#join-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const code = String(form.get('code') || '').trim().toUpperCase();
    const name = String(form.get('name') || '').trim();
    const mode = (form.get('mode') || 'solo') as 'solo' | 'shared';
    try { const result = await joinRoom(code, name, mode); room = result.room; saveSession(result.session); startPolling(); render(); }
    catch (error) { const target = document.querySelector('#join-error'); if (target) target.textContent = message(error); }
  });
  document.querySelector('#restore-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget as HTMLFormElement).get('license') || '');
    if (!token) return;
    const valid = await restoreLicense(token); unlocked = valid;
    errorMessage = valid ? '' : 'That license could not be verified. Check it and try again.'; render();
  });
}

function renderHost(): void {
  if (!room || !session) return;
  if (room.stage === 'lobby') return renderHostLobby();
  renderHostGame();
}

function renderHostLobby(): void {
  shell(`<section class="room-heading"><div><p class="eyebrow">Lobby is open</p><h1>Room <em>${room!.code}</em></h1><p>Scan or visit this page and enter the code.</p></div><canvas id="qr" width="180" height="180" aria-label="QR code to join room ${room!.code}"></canvas></section>
    <section class="lobby-grid"><div><div class="section-title"><h2>Who’s in the room?</h2><span>${room!.players.length} / 12</span></div>
      <div class="players ${room!.players.length ? '' : 'empty'}">${room!.players.length ? room!.players.map(playerPebble).join('') : '<div class="empty-state"><span aria-hidden="true">○</span><h3>The floor is open</h3><p>Players appear here as they join. One phone can stand for a whole family.</p></div>'}</div></div>
      <div><div class="section-title"><h2>Choose the first game</h2></div><div class="game-choices">${games.map((game) => `<button class="choice ${game.paid && !unlocked ? 'locked' : ''}" data-game="${game.id}" ${game.paid && !unlocked ? 'aria-describedby="paid-note"' : ''}><span aria-hidden="true">${game.icon}</span><b>${game.name}</b><small>${game.strap}</small>${game.paid && !unlocked ? '<i>Family Pack</i>' : ''}</button>`).join('')}</div><p id="paid-note" class="sr-only">Requires the one-time Family Pack</p></div></section>
    <div class="command-rail"><button class="button secondary" id="leave-room">Close room</button><p>${room!.players.some((p) => p.mode === 'shared') ? '↻ Shared-phone player ready' : 'Tip: choose “Pass one phone” when joining with kids.'}</p></div>`, 'host');
  const joinUrl = `${location.origin}/?join=${room!.code}`;
  void QRCode.toCanvas(document.querySelector('#qr') as HTMLCanvasElement, joinUrl, { width: 180, margin: 1, color: { dark: '#151a17', light: '#f5f3e8' } });
  document.querySelectorAll<HTMLButtonElement>('[data-game]').forEach((button) => button.addEventListener('click', () => void startGame(button.dataset.game as GameId)));
  document.querySelector('#leave-room')?.addEventListener('click', leaveRoom);
}

function playerPebble(player: Room['players'][number]): string {
  return `<div class="player"><span style="--player:${player.color}" aria-hidden="true">${escapeHtml(player.name.slice(0, 1).toUpperCase())}</span><b>${escapeHtml(player.name)}</b><small>${player.mode === 'shared' ? '↻ sharing' : 'own phone'}</small></div>`;
}

async function startGame(game: GameId): Promise<void> {
  const info = games.find((item) => item.id === game)!;
  if (info.paid && !unlocked) { errorMessage = 'That game is in the $12 one-time Family Pack.'; render(); return; }
  try { room = await hostUpdate(session!, { stage: 'playing', game, prompt: nextPrompt(game, 0), round: 0, resetRound: true, message: 'Round started' }); render(); }
  catch (error) { errorMessage = message(error); render(); }
}

function renderHostGame(): void {
  const game = room!.game!;
  const info = games.find((item) => item.id === game)!;
  let stage = '';
  if (game === 'draw') stage = `<div class="tv-prompt"><p>Draw this together</p><strong>${room!.prompt}</strong></div><canvas class="tv-canvas" id="tv-canvas" width="1000" height="560" aria-label="The players’ shared drawing"></canvas>`;
  if (game === 'point') stage = `<div class="tv-prompt compact"><p>Aim at the moss target, then tap</p><strong>POINT!</strong></div><div class="point-arena"><span class="target" style="left:${room!.targetX}%;top:${room!.targetY}%" role="img" aria-label="Moss target"></span>${room!.players.map((p) => `<span class="pointer" style="left:${p.x}%;top:${p.y}%;--player:${p.color}" title="${escapeHtml(p.name)}">${escapeHtml(p.name.slice(0, 1))}</span>`).join('')}</div>`;
  if (game === 'pass') stage = `<div class="tv-prompt"><p>Keep the clue on the phone</p><strong>ACT · POINT · SOUND</strong><span>Pass after every guess</span></div>${scoreboard()}`;
  if (game === 'statue') stage = `<div class="tv-prompt"><p>Make this shape with your whole body</p><strong>${room!.prompt}</strong><span>Freeze together. The host awards the cheer.</span></div>${scoreboard()}`;
  if (game === 'chorus') stage = `<div class="tv-prompt"><p>Tap the colour on the beat</p><strong class="chorus-mark">● &nbsp; ● &nbsp; ●</strong><span>Listen to the room, not a language.</span></div>${scoreboard()}`;
  shell(`<section class="play-header"><div><p class="eyebrow">Round ${room!.round + 1}</p><h1>${info.icon} ${info.name}</h1></div><p>${room!.players.length} playing</p></section><section class="tv-stage">${stage}</section>
    <div class="command-rail"><button class="button secondary" id="end-game">Back to games</button><p>Use <kbd>←</kbd><kbd>→</kbd> to move · <kbd>OK</kbd> to choose</p><button class="button primary" id="next-round">Next round</button></div>`, 'play');
  if (game === 'draw') paintDrawing(document.querySelector('#tv-canvas') as HTMLCanvasElement, room!.drawing);
  document.querySelector('#end-game')?.addEventListener('click', async () => { room = await hostUpdate(session!, { stage: 'lobby', message: 'Choose another game' }); render(); });
  document.querySelector('#next-round')?.addEventListener('click', nextRound);
}

function scoreboard(): string {
  return `<div class="scoreboard">${[...room!.players].sort((a, b) => b.score - a.score).map((p) => `<div><span style="background:${p.color}"></span><b>${escapeHtml(p.name)}</b><strong>${p.score}</strong></div>`).join('') || '<p>No players yet — scan the lobby code to join next round.</p>'}</div>`;
}

async function nextRound(): Promise<void> {
  const round = room!.round + 1;
  try { room = await hostUpdate(session!, { round, prompt: nextPrompt(room!.game!, round), resetRound: true, message: `Round ${round + 1}` }); render(); }
  catch (error) { errorMessage = message(error); render(); }
}

function renderPlayer(): void {
  if (!room || !session) return;
  if (room.stage === 'lobby') {
    shell(`<section class="phone-state"><div class="big-check" aria-hidden="true">✓</div><p class="eyebrow">You’re in room ${room.code}</p><h1>Nice, ${escapeHtml(session.name || 'player')}.</h1><p>Look up at the TV. The host is choosing a game.</p>${session.mode === 'shared' ? '<div class="shared-note">↻ Keep this phone moving. Pass it to the next person after each turn.</div>' : ''}<button class="button secondary" id="leave-room">Leave room</button></section>`, 'phone');
    document.querySelector('#leave-room')?.addEventListener('click', leaveRoom); return;
  }
  renderPhoneGame();
}

function renderPhoneGame(): void {
  const game = room!.game!;
  let content = '';
  if (game === 'draw') content = `<p class="eyebrow">Draw together</p><h1>Draw <em>${room!.prompt}</em></h1><p>Use one finger. Your colour joins everyone else on the TV.</p><canvas class="draw-pad" id="draw-pad" width="700" height="700" aria-label="Drawing pad"></canvas><button class="button secondary" id="clear-local">Clear my pad</button>`;
  if (game === 'point') content = `<p class="eyebrow">Point panic</p><h1>Aim at <em>the moss ring</em></h1><p>Tilt your phone, or use the arrow pad. Then tap Point.</p><button class="button secondary" id="motion">Turn on tilt</button><div class="dpad" aria-label="Direction pad"><button data-move="up" aria-label="Move up">↑</button><button data-move="left" aria-label="Move left">←</button><button data-move="down" aria-label="Move down">↓</button><button data-move="right" aria-label="Move right">→</button></div><button class="button primary giant" id="score-point">POINT!</button>`;
  if (game === 'pass') content = passScreen ? `<div class="pass-screen"><span aria-hidden="true">↻</span><h1>Pass the phone</h1><p>Keep the answer covered. Hand it to the next player.</p><button class="button primary" id="next-person">I have it</button></div>` : `<p class="eyebrow">Act · point · make a sound</p><h1 class="secret-prompt">${passPrompts[localPrompt % passPrompts.length]}</h1><p>Help the room guess. Don’t say the word!</p><div class="split-actions"><button class="button secondary" id="pass-card">Pass</button><button class="button primary" id="got-card">Got it +1</button></div>`;
  if (game === 'statue') content = `<p class="eyebrow">Statue switch</p><h1>${room!.prompt}</h1><p>Put the phone down, make the shape, and freeze.</p><button class="button primary giant" id="frozen">I’m frozen</button>`;
  if (game === 'chorus') content = `<p class="eyebrow">Colour chorus</p><h1>Tap together</h1><p>Choose a colour and make a three-beat rhythm with the room.</p><div class="colour-beats"><button style="--beat:#ff8a5b" aria-label="Clay beat">●</button><button style="--beat:#82c7d8" aria-label="Sky beat">●</button><button style="--beat:#b7d43d" aria-label="Moss beat">●</button></div><p class="beat-count" aria-live="polite" id="beat-count">0 beats</p>`;
  shell(`<section class="phone-game">${content}<p class="look-up">TV says: round ${room!.round + 1}</p></section>`, 'phone');
  bindPhoneGame(game);
}

function bindPhoneGame(game: GameId): void {
  if (game === 'draw') setupDrawPad();
  if (game === 'point') setupPointing();
  if (game === 'pass') {
    document.querySelector('#pass-card')?.addEventListener('click', () => { localPrompt++; passScreen = session!.mode === 'shared'; render(); });
    document.querySelector('#got-card')?.addEventListener('click', async () => { await playerAction(session!, { kind: 'score', delta: 1 }); localPrompt++; passScreen = session!.mode === 'shared'; render(); });
    document.querySelector('#next-person')?.addEventListener('click', () => { passScreen = false; render(); });
  }
  document.querySelector('#frozen')?.addEventListener('click', async () => { await playerAction(session!, { kind: 'score', delta: 1 }); errorMessage = 'Frozen! Look up at the TV.'; render(); });
  let beats = 0;
  document.querySelectorAll<HTMLButtonElement>('.colour-beats button').forEach((button) => button.addEventListener('click', async () => {
    beats++; button.animate([{ transform: 'scale(.88)' }, { transform: 'scale(1)' }], { duration: 160 });
    const count = document.querySelector('#beat-count'); if (count) count.textContent = `${beats} beat${beats === 1 ? '' : 's'}`;
    if (beats % 3 === 0) await playerAction(session!, { kind: 'score', delta: 1 });
  }));
}

function setupDrawPad(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#draw-pad')!;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#f5f3e8'; context.fillRect(0, 0, canvas.width, canvas.height);
  let drawing = false;
  const add = (event: PointerEvent, start: boolean) => {
    const rect = canvas.getBoundingClientRect(); const x = ((event.clientX - rect.left) / rect.width) * 100; const y = ((event.clientY - rect.top) / rect.height) * 100;
    drawBuffer.push({ x, y, color: '#b7d43d', start });
    context.lineWidth = 12; context.lineCap = 'round'; context.strokeStyle = '#151a17';
    if (start) { context.beginPath(); context.moveTo(x * 7, y * 7); } else { context.lineTo(x * 7, y * 7); context.stroke(); }
    if (drawBuffer.length >= 8) flushDrawing();
  };
  canvas.addEventListener('pointerdown', (event) => { drawing = true; canvas.setPointerCapture(event.pointerId); add(event, true); });
  canvas.addEventListener('pointermove', (event) => { if (drawing) add(event, false); });
  canvas.addEventListener('pointerup', () => { drawing = false; flushDrawing(); });
  document.querySelector('#clear-local')?.addEventListener('click', () => { context.fillStyle = '#f5f3e8'; context.fillRect(0, 0, canvas.width, canvas.height); });
}

function flushDrawing(): void {
  if (!drawBuffer.length || !session) return;
  const points = drawBuffer.splice(0, drawBuffer.length); void playerAction(session, { kind: 'draw', points }).catch((error) => { errorMessage = message(error); });
}

function paintDrawing(canvas: HTMLCanvasElement, points: StrokePoint[]): void {
  const context = canvas.getContext('2d')!; context.fillStyle = '#f5f3e8'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = 9; context.lineCap = 'round';
  points.forEach((point) => { context.strokeStyle = point.color; if (point.start) { context.beginPath(); context.moveTo(point.x * 10, point.y * 5.6); } else { context.lineTo(point.x * 10, point.y * 5.6); context.stroke(); } });
}

function setupPointing(): void {
  const me = room!.players.find((p) => p.id === session!.playerId); let x = me?.x || 50; let y = me?.y || 50;
  const send = () => void playerAction(session!, { kind: 'point', x, y });
  document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => button.addEventListener('click', () => {
    const direction = button.dataset.move; if (direction === 'up') y -= 8; if (direction === 'down') y += 8; if (direction === 'left') x -= 8; if (direction === 'right') x += 8;
    x = Math.max(0, Math.min(100, x)); y = Math.max(0, Math.min(100, y)); send();
  }));
  document.querySelector('#motion')?.addEventListener('click', async () => {
    const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
    if (orientation.requestPermission && await orientation.requestPermission() !== 'granted') { errorMessage = 'Tilt permission was not granted. Use the arrows instead.'; render(); return; }
    window.addEventListener('deviceorientation', (event) => { x = Math.max(0, Math.min(100, 50 + (event.gamma || 0) * 1.3)); y = Math.max(0, Math.min(100, 50 + ((event.beta || 45) - 45) * 1.2)); send(); }, { passive: true });
    const button = document.querySelector('#motion'); if (button) button.textContent = 'Tilt is on ✓';
  });
  document.querySelector('#score-point')?.addEventListener('click', async () => {
    const distance = Math.hypot(x - room!.targetX, y - room!.targetY);
    if (distance < 16) { await playerAction(session!, { kind: 'score', delta: 1 }); errorMessage = 'Hit! +1'; }
    else errorMessage = 'So close — aim for the moss ring.';
    render();
  });
}

function renderLegal(kind: 'Privacy' | 'Terms'): void {
  const privacy = `<p><strong>Effective 27 August 2026</strong></p><p>Living Room Lobby is designed without accounts. A room stores a chosen display name, game actions, and scores in our database for up to six hours, then expires. We do not sell data, run advertising trackers, or create profiles.</p><h2>Sample data</h2><p>A demo visit creates an isolated sample workspace that expires after 24 hours. Sample play never changes a real room.</p><h2>On your device</h2><p>A room session is held in session storage. A Family Pack license and its last verification result are held in local storage. You can clear either in your browser settings.</p><h2>Payments</h2><p>Checkout and license verification are handled by Sociobot and its merchant-of-record provider, Dodo. We receive only the license result needed to unlock the pack.</p><h2>Children</h2><p>No email, birth date, voice, photo, or precise location is requested. Adults should choose non-identifying nicknames for children.</p><h2>Questions</h2><p>Email privacy@sociobot.in.</p>`;
  const terms = `<p><strong>Effective 27 August 2026</strong></p><p>Living Room Lobby provides casual local party games as-is. Use it lawfully and supervise young players around screens and devices.</p><h2>Family Pack</h2><p>The $12 Family Pack is a one-time license for the listed extra games. Sociobot/Dodo is the merchant of record and handles checkout and refunds. Refunded, revoked, or invalid licenses stop unlocking paid games. Core games remain free.</p><h2>Fair play</h2><p>Do not disrupt rooms, automate requests, probe other room codes, or upload harmful content. Rooms and display names are temporary.</p><h2>Availability</h2><p>TV browsers vary. We aim for broad compatibility but cannot promise every browser or network will work without interruption.</p><h2>Contact</h2><p>Email support@sociobot.in.</p>`;
  shell(`<article class="legal"><p class="eyebrow">The plain-language version</p><h1>${kind}</h1>${kind === 'Privacy' ? privacy : terms}<a class="button secondary" href="/" data-nav>Back to the lobby</a></article>`, 'legal');
}

function bindCommon(): void {
  document.querySelector('#reset-demo')?.addEventListener('click', () => {
    const sample = resetDemo();
    room = sample.room;
    saveSession(sample.session);
    errorMessage = '';
    history.replaceState({}, '', DEMO_PATH);
    render();
    void refreshDemoWorkspace(true);
  });
  document.querySelector('#start-real')?.addEventListener('click', startForReal);
  document.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((link) => link.addEventListener('click', (event) => {
    if (link.origin !== location.origin) return;
    event.preventDefault();
    const destination = new URL(link.href).pathname;
    if (demoMode() && destination !== DEMO_PATH) {
      discardDemo();
      room = null;
      session = null;
      unlocked = cachedUnlock();
    }
    history.pushState({}, '', link.href);
    render();
    window.scrollTo(0, 0);
    focusRouteHeading();
  }));
}

function startForReal(): void {
  window.clearInterval(polling);
  discardDemo();
  room = null;
  session = null;
  unlocked = cachedUnlock();
  history.replaceState({}, '', '/');
  render();
  focusRouteHeading();
}

async function refreshDemoWorkspace(force = false): Promise<void> {
  if (!demoMode() || !navigator.onLine) return;
  const seeded = await provisionDemoWorkspace(force);
  if (seeded && demoMode()) {
    room = seeded;
    render();
  }
}

function leaveRoom(): void {
  if (demoMode()) {
    const sample = resetDemo();
    room = sample.room;
    saveSession(sample.session);
    render();
    return;
  }
  window.clearInterval(polling); room = null; saveSession(null); history.replaceState({}, '', '/'); render();
}

function setRouteMetadata(path: string): void {
  const title = path === DEMO_PATH ? 'Demo — Living Room Lobby'
    : path === '/privacy' ? 'Privacy — Living Room Lobby'
      : path === '/terms' ? 'Terms — Living Room Lobby'
        : 'Living Room Lobby — party games for your TV';
  document.title = title;
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `${location.origin}${path}`);
}

function focusRouteHeading(): void {
  window.requestAnimationFrame(() => {
    const heading = document.querySelector<HTMLElement>('main h1');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  });
}
function message(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong. Try again.'; }
function escapeHtml(value: string): string { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!); }
function setBusy(selector: string, busy: boolean, label: string): void { const button = document.querySelector<HTMLButtonElement>(selector); if (button) { button.disabled = busy; button.textContent = label; } }

function remoteKeys(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  if ((event.target as HTMLElement).matches('input, textarea, canvas')) return;
  const elements = [...document.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)')].filter((item) => item.offsetParent !== null);
  if (!elements.length) return;
  const current = Math.max(0, elements.indexOf(document.activeElement as HTMLElement));
  const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
  elements[(current + delta + elements.length) % elements.length].focus(); event.preventDefault();
}
