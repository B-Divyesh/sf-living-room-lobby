import type { GameId, Room, RoomLanguage, Session, Stage, StrokePoint } from './types';
import { demoMode, demoPlayerAction, loadDemoRoom, saveDemoRoom, sampleSession, updateDemoRoom } from './demo';

const JSON_HEADERS = { 'content-type': 'application/json' };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok || data.error) throw new Error(data.error || 'The lobby did not answer. Try again.');
  return data;
}

export async function createRoom(): Promise<{ room: Room; session: Session }> {
  if (demoMode()) return { room: loadDemoRoom(), session: sampleSession() };
  const data = await request<{ room: Room; code: string; hostToken: string }>('/api/rooms', { method: 'POST' });
  return { room: data.room, session: { role: 'host', code: data.code, token: data.hostToken } };
}

export async function getRoom(code: string): Promise<Room> {
  if (demoMode() && code === 'DEMO') return loadDemoRoom();
  return (await request<{ room: Room }>(`/api/rooms/${encodeURIComponent(code)}`)).room;
}

export async function joinRoom(code: string, name: string, mode: 'solo' | 'shared'): Promise<{ room: Room; session: Session }> {
  if (demoMode() && code === 'DEMO') {
    const room = loadDemoRoom();
    const playerId = `demo-guest-${room.players.length + 1}`;
    room.players.push({ id: playerId, name, mode, color: '#ffd166', score: 0, x: 50, y: 50 });
    room.revision += 1;
    room.message = `${name} joined the sample room.`;
    saveDemoRoom(room);
    return { room, session: { role: 'player', code: 'DEMO', token: `demo-player-${playerId}`, playerId, name, mode } };
  }
  const data = await request<{ room: Room; token: string; playerId: string }>(`/api/rooms/${encodeURIComponent(code)}/join`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name, mode }),
  });
  return { room: data.room, session: { role: 'player', code, token: data.token, playerId: data.playerId, name, mode } };
}

export async function hostUpdate(session: Session, update: { stage?: Stage; game?: GameId; prompt?: string; language?: RoomLanguage; round?: number; resetRound?: boolean; message?: string }): Promise<Room> {
  if (demoMode() && session.code === 'DEMO') return updateDemoRoom(update);
  const data = await request<{ room: Room }>(`/api/rooms/${session.code}/host`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ token: session.token, ...update }),
  });
  return data.room;
}

export async function playerAction(session: Session, action: { kind: 'draw' | 'point' | 'score'; x?: number; y?: number; points?: StrokePoint[]; delta?: number }): Promise<void> {
  if (demoMode() && session.code === 'DEMO') {
    demoPlayerAction(session.token, action);
    return;
  }
  await request(`/api/rooms/${session.code}/action`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ token: session.token, ...action }),
  });
}
