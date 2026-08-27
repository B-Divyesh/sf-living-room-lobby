import type { GameId, Room, Session, Stage, StrokePoint } from './types';

const JSON_HEADERS = { 'content-type': 'application/json' };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'The lobby did not answer. Try again.');
  return data;
}

export async function createRoom(): Promise<{ room: Room; session: Session }> {
  const data = await request<{ room: Room; code: string; hostToken: string }>('/api/rooms', { method: 'POST' });
  return { room: data.room, session: { role: 'host', code: data.code, token: data.hostToken } };
}

export async function getRoom(code: string): Promise<Room> {
  return (await request<{ room: Room }>(`/api/rooms/${encodeURIComponent(code)}`)).room;
}

export async function joinRoom(code: string, name: string, mode: 'solo' | 'shared'): Promise<{ room: Room; session: Session }> {
  const data = await request<{ room: Room; token: string; playerId: string }>(`/api/rooms/${encodeURIComponent(code)}/join`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name, mode }),
  });
  return { room: data.room, session: { role: 'player', code, token: data.token, playerId: data.playerId, name, mode } };
}

export async function hostUpdate(session: Session, update: { stage?: Stage; game?: GameId; prompt?: string; round?: number; resetRound?: boolean; message?: string }): Promise<Room> {
  const data = await request<{ room: Room }>(`/api/rooms/${session.code}/host`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ token: session.token, ...update }),
  });
  return data.room;
}

export async function playerAction(session: Session, action: { kind: 'draw' | 'point' | 'score'; x?: number; y?: number; points?: StrokePoint[]; delta?: number }): Promise<void> {
  await request(`/api/rooms/${session.code}/action`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ token: session.token, ...action }),
  });
}
