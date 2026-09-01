import type { GameId, Room, Session, StrokePoint } from './types';

export const DEMO_PATH = '/demo';
const PREFIX = 'demo:living-room-lobby:';
const ROOM_KEY = `${PREFIX}room`;
const SESSION_KEY = `${PREFIX}session`;
const WORKSPACE_KEY = `${PREFIX}workspace`;

const samplePlayers: Room['players'] = [
  { id: 'demo-asha', name: 'Asha', mode: 'solo', color: '#ff8a5b', score: 3, x: 29, y: 41 },
  { id: 'demo-marc', name: 'Marcos', mode: 'shared', color: '#82c7d8', score: 2, x: 62, y: 52 },
  { id: 'demo-lee', name: 'Lee and Bo', mode: 'shared', color: '#b7d43d', score: 2, x: 75, y: 33 },
];

const sampleDrawing: StrokePoint[] = [
  { x: 27, y: 64, color: '#ff8a5b', start: true },
  { x: 35, y: 50, color: '#ff8a5b', start: false },
  { x: 42, y: 64, color: '#ff8a5b', start: false },
  { x: 29, y: 58, color: '#ff8a5b', start: true },
  { x: 40, y: 58, color: '#ff8a5b', start: false },
  { x: 50, y: 62, color: '#82c7d8', start: true },
  { x: 50, y: 43, color: '#82c7d8', start: false },
  { x: 43, y: 43, color: '#82c7d8', start: false },
  { x: 57, y: 43, color: '#82c7d8', start: true },
  { x: 50, y: 35, color: '#82c7d8', start: false },
  { x: 64, y: 66, color: '#b7d43d', start: true },
  { x: 70, y: 53, color: '#b7d43d', start: false },
  { x: 77, y: 66, color: '#b7d43d', start: false },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function demoMode(): boolean {
  return location.pathname === DEMO_PATH || new URLSearchParams(location.search).get('demo') === '1';
}

export function sampleRoom(): Room {
  return {
    code: 'DEMO',
    revision: 1,
    stage: 'playing',
    game: 'draw',
    prompt: '🎂 BIRTHDAY CAKE',
    language: 'en',
    round: 2,
    players: clone(samplePlayers),
    drawing: clone(sampleDrawing),
    targetX: 54,
    targetY: 47,
    message: 'Asha added the candles.',
  };
}

export function sampleSession(): Session {
  return { role: 'host', code: 'DEMO', token: 'demo-host-token' };
}

export function loadDemoRoom(): Room {
  try {
    const saved = localStorage.getItem(ROOM_KEY);
    if (saved) return JSON.parse(saved) as Room;
  } catch {
    // A private-browser storage failure should still leave the sample usable.
  }
  const room = sampleRoom();
  saveDemoRoom(room);
  return room;
}

export function saveDemoRoom(room: Room): void {
  try { localStorage.setItem(ROOM_KEY, JSON.stringify(room)); } catch { /* memory state still renders */ }
}

export function loadDemoSession(): Session {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved) as Session;
  } catch {
    // Start the shipped sample even when storage is unavailable.
  }
  const session = sampleSession();
  saveDemoSession(session);
  return session;
}

export function saveDemoSession(session: Session | null): void {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* see loadDemoSession */ }
}

export function resetDemo(): { room: Room; session: Session } {
  const room = sampleRoom();
  const session = sampleSession();
  try { sessionStorage.removeItem(WORKSPACE_KEY); } catch { /* storage was already unavailable */ }
  saveDemoRoom(room);
  saveDemoSession(session);
  return { room, session };
}

export function discardDemo(): void {
  try {
    localStorage.removeItem(ROOM_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(WORKSPACE_KEY);
  } catch { /* storage was already unavailable */ }
}

export async function provisionDemoWorkspace(force = false): Promise<Room | null> {
  try {
    if (!force && sessionStorage.getItem(WORKSPACE_KEY)) return null;
    const response = await fetch('/api/demo', { method: 'POST' });
    if (!response.ok) return null;
    const payload = await response.json() as { workspace?: string; expiresInSeconds?: number; room?: Room };
    if (!payload.workspace || payload.expiresInSeconds !== 86_400 || !payload.room) return null;
    sessionStorage.setItem(WORKSPACE_KEY, payload.workspace);
    saveDemoRoom(payload.room);
    return payload.room;
  } catch {
    return null;
  }
}

export function updateDemoRoom(update: {
  stage?: Room['stage']; game?: GameId; prompt?: string; language?: Room['language']; round?: number; resetRound?: boolean; message?: string;
}): Room {
  const room = loadDemoRoom();
  if (update.stage) room.stage = update.stage;
  if (update.game) room.game = update.game;
  if (update.prompt !== undefined) room.prompt = update.prompt.slice(0, 60);
  if (update.language !== undefined) room.language = update.language;
  if (update.round !== undefined) room.round = Math.min(99, Math.max(0, update.round));
  if (update.message !== undefined) room.message = update.message.slice(0, 100);
  if (update.resetRound) {
    room.drawing = [];
    room.targetX = 54;
    room.targetY = 47;
  }
  room.revision += 1;
  saveDemoRoom(room);
  return room;
}

export function demoPlayerAction(token: string, action: {
  kind: 'draw' | 'point' | 'score'; x?: number; y?: number; points?: StrokePoint[]; delta?: number;
}): void {
  const room = loadDemoRoom();
  const player = room.players.find((candidate) => candidate.id === token || token === `demo-player-${candidate.id}`);
  if (!player) return;
  if (action.kind === 'draw') room.drawing.push(...(action.points || []).slice(0, 80));
  if (action.kind === 'point') {
    player.x = Math.min(100, Math.max(0, action.x ?? 50));
    player.y = Math.min(100, Math.max(0, action.y ?? 50));
  }
  if (action.kind === 'score') player.score = Math.min(99, player.score + Math.min(1, Math.max(0, action.delta ?? 0)));
  room.revision += 1;
  saveDemoRoom(room);
}
