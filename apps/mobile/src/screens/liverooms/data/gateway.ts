/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — native twin of the web live-room
 * gateway client (`src/services/liveRoomService.ts`, the calls the list and viewer make). The same
 * paths and bodies, sent through the app's gateway fetch (`src/auth/gateway`), which adds the
 * bearer token. Enter and exit are the only calls that touch attendance.
 */
import { GatewayError } from '../../../ports/core';
import { getGateway } from '../../../auth/gateway';
import { getAccessToken } from '../../../auth/client';

export type RoomStatus = 'idle' | 'scheduled' | 'lobby' | 'live' | 'ended' | 'cancelled';

/** `GET /live/rooms/:id/state` (the fields the viewer reads). */
export interface RoomStateSnapshot {
  room: { id: string; status: RoomStatus; room_name: string | null; room_slug: string | null; host_user_id: string; current_session_id: string | null };
  session: {
    id: string;
    status: string;
    session_title: string | null;
    starts_at: string;
    ends_at: string | null;
    host_present: boolean;
    access_level: string;
    max_participants: number;
  } | null;
  counts: { lobby_waiting: number; in_room: number };
}

/** `POST /live/rooms/:id/enter`: the Daily URL plus a meeting token, the only way into a private room. */
export interface EnterRoomResponse {
  ok: boolean;
  daily_room_url: string;
  token: string;
  is_host: boolean;
  counts?: { in_room: number };
}

export type EnterRoomErrorCode = 'NOT_LIVE' | 'PAYMENT_REQUIRED' | 'UNAUTHENTICATED' | 'NOT_FOUND' | 'FORBIDDEN' | 'UNKNOWN';

/** Typed failure of `enterRoom`, so the viewer shows the matching copy. */
export class LiveRoomEnterError extends Error {
  readonly code: EnterRoomErrorCode;
  readonly status: number;
  constructor(code: EnterRoomErrorCode, status: number, message: string) {
    super(message);
    this.name = 'LiveRoomEnterError';
    this.code = code;
    this.status = status;
  }
}

/** The web mapping from an enter status (and the gateway's error key) to a copy code. */
export function enterErrorCode(status: number, error?: string): EnterRoomErrorCode {
  if (error === 'NOT_LIVE' || status === 409) return 'NOT_LIVE';
  if (error === 'PAYMENT_REQUIRED' || status === 402) return 'PAYMENT_REQUIRED';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  return 'UNKNOWN';
}

function errorKeyOf(body: unknown): string | undefined {
  const b = body as { error?: unknown } | null;
  return typeof b?.error === 'string' ? b.error : undefined;
}

export async function fetchRoomState(roomId: string): Promise<RoomStateSnapshot> {
  return gatewayCall<RoomStateSnapshot>(`/live/rooms/${encodeURIComponent(roomId)}/state`);
}

/** Enter a room. Throws `LiveRoomEnterError` with the code the viewer maps to copy. */
export async function enterRoom(roomId: string): Promise<EnterRoomResponse> {
  if (!(await getAccessToken())) throw new LiveRoomEnterError('UNAUTHENTICATED', 401, 'Not authenticated');
  let body: EnterRoomResponse;
  try {
    body = await gatewayCall<EnterRoomResponse>(`/live/rooms/${encodeURIComponent(roomId)}/enter`, { method: 'POST' });
  } catch (err) {
    if (err instanceof GatewayError) {
      const message = errorKeyOf(err.body) ?? err.message;
      throw new LiveRoomEnterError(enterErrorCode(err.status, errorKeyOf(err.body)), err.status, message);
    }
    throw new LiveRoomEnterError('UNKNOWN', 0, err instanceof Error ? err.message : String(err));
  }
  if (!body?.daily_room_url || !body?.token) {
    throw new LiveRoomEnterError('UNKNOWN', 200, 'Enter response without room url or token');
  }
  return body;
}

/** Record the exit for the current entry. Never ends the room. */
export async function exitRoom(roomId: string): Promise<void> {
  await gatewayCall(`/live/rooms/${encodeURIComponent(roomId)}/exit`, { method: 'POST' });
}

export async function hostPresent(roomId: string): Promise<void> {
  await gatewayCall(`/live/rooms/${encodeURIComponent(roomId)}/host-present`, { method: 'POST' });
}

export async function hostAbsent(roomId: string): Promise<void> {
  await gatewayCall(`/live/rooms/${encodeURIComponent(roomId)}/host-absent`, { method: 'POST' });
}

/** Host only: end the session for everyone. The gateway answers 403 to anyone else. */
export async function endRoom(roomId: string): Promise<void> {
  await gatewayCall(`/live/rooms/${encodeURIComponent(roomId)}/end`, { method: 'POST' });
}

async function gatewayCall<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await getGateway()(path, init);
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) throw new GatewayError(response.status, body);
  return body as T;
}
