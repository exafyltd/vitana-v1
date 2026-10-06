/**
 * Live Room API Client
 *
 * Wraps Gateway Live Room endpoints with typed interfaces.
 * VTID-01228: Session management + permanent room model
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { supabase } from '@/integrations/supabase/client';
import { GATEWAY_BASE } from '@/lib/gateway-base';


const API_BASE = `${GATEWAY_BASE}/api/v1`;

// ============================================================================
// Types
// ============================================================================

export type AccessLevel = 'public' | 'group';
export type RoomStatus = 'idle' | 'scheduled' | 'lobby' | 'live' | 'ended' | 'cancelled';
export type SessionStatus = 'scheduled' | 'lobby' | 'live' | 'ended' | 'cancelled';
export type LobbyStatus = 'waiting' | 'admitted' | 'rejected';
export type ParticipantRole = 'host' | 'guest';

export interface LiveRoom {
  id: string;
  tenant_id: string;
  title: string;
  topic_keys: string[];
  host_user_id: string;
  starts_at: string | null;
  ends_at: string | null;
  status: RoomStatus;
  access_level: AccessLevel;
  room_name: string | null;
  room_slug: string | null;
  current_session_id: string | null;
  cover_image_url: string | null;
  description: string | null;
  host_present: boolean;
  metadata: {
    price?: number;
    description?: string;
    cover_image_url?: string;
    daily_room_url?: string;
    daily_room_name?: string;
    video_provider?: 'daily_co';
  };
  created_at: string;
  updated_at: string;
}

export interface LiveRoomSession {
  id: string;
  tenant_id: string;
  room_id: string;
  session_title: string | null;
  topic_keys: string[];
  status: SessionStatus;
  access_level: AccessLevel;
  starts_at: string;
  ends_at: string | null;
  lobby_open_at: string | null;
  host_present: boolean;
  auto_admit: boolean;
  lobby_buffer_minutes: number;
  max_participants: number;
  metadata: Record<string, unknown>;
  idempotency_key: string | null;
  stream_type?: string;
  enable_recording?: boolean;
  session_description?: string;
  created_at: string;
  updated_at: string;
}

export interface MyRoomResponse {
  ok: boolean;
  room: LiveRoom;
  session: LiveRoomSession | null;
  counts: { lobby_waiting: number; in_room: number };
  viewer: { role: string; lobby_status: string | null; is_banned: boolean };
}

export interface RoomStateResponse {
  ok: boolean;
  room: LiveRoom;
  session: LiveRoomSession | null;
  counts: { lobby_waiting: number; in_room: number };
  viewer: { role: string; lobby_status: string | null; is_banned: boolean };
}

export interface RoomStateSnapshot {
  room: {
    id: string;
    status: RoomStatus;
    room_name: string | null;
    room_slug: string | null;
    host_user_id: string;
    current_session_id: string | null;
  };
  session: {
    id: string;
    status: SessionStatus;
    session_title: string | null;
    starts_at: string;
    ends_at: string | null;
    lobby_open_at: string | null;
    host_present: boolean;
    access_level: AccessLevel;
    auto_admit: boolean;
    max_participants: number;
  } | null;
  counts: {
    lobby_waiting: number;
    in_room: number;
  };
  viewer: {
    role: ParticipantRole | null;
    lobby_status: LobbyStatus | null;
    is_banned: boolean;
    has_access_grant: boolean;
  } | null;
}

export interface CreateSessionRequest {
  session_title?: string;
  topic_keys?: string[];
  starts_at: string;
  ends_at?: string;
  access_level?: AccessLevel;
  auto_admit?: boolean;
  lobby_buffer_minutes?: number;
  max_participants?: number;
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
}

export interface CreateSessionPayload {
  session_title?: string;
  topic_keys?: string[];
  starts_at: string;
  ends_at?: string;
  access_level?: AccessLevel;
  auto_admit?: boolean;
  lobby_buffer_minutes?: number;
  max_participants?: number;
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
}

export interface UpdateRoomPayload {
  room_name?: string;
  room_slug?: string;
  cover_image_url?: string;
  description?: string;
}

export interface CreateRoomRequest {
  title: string;
  topic_keys?: string[];
  access_level: AccessLevel;
  metadata?: {
    price?: number;
    description?: string;
    cover_image_url?: string;
  };
}

export interface DailyRoomResponse {
  ok: boolean;
  daily_room_url: string;
  daily_room_name: string;
  already_existed: boolean;
}

/** POST /live/rooms/:id/enter — the only way into a (private) Daily room. */
export interface EnterRoomResponse {
  ok: boolean;
  daily_room_url: string;
  /** Daily meeting token: owner token for the host, participant token otherwise. */
  token: string;
  is_host: boolean;
  counts?: { in_room: number };
}

export type EnterRoomErrorCode = 'NOT_LIVE' | 'PAYMENT_REQUIRED' | 'UNAUTHENTICATED' | 'NOT_FOUND' | 'FORBIDDEN' | 'UNKNOWN';

/** Typed failure of `enterRoom`, so the viewer can show the right state. */
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

export function enterErrorCode(status: number, error?: string): EnterRoomErrorCode {
  if (error === 'NOT_LIVE' || status === 409) return 'NOT_LIVE';
  if (error === 'PAYMENT_REQUIRED' || status === 402) return 'PAYMENT_REQUIRED';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  return 'UNKNOWN';
}

export interface PurchaseResponse {
  ok: boolean;
  client_secret: string;
  amount: number;
  currency: string;
}

export interface LobbyUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  waiting_since: string;
}

export interface JoinResult {
  ok: boolean;
  role: ParticipantRole;
  lobby_status: LobbyStatus;
  daily_token?: string;
  daily_room_url?: string;
}

// ============================================================================
// Helper: Get JWT Token
// ============================================================================

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const errorMsg = error.message || error.error || `Request failed: ${response.status}`;
    const errorCode = error.code || error.error_code || '';
    console.error(`[liveRoomService] API error: ${response.status} ${errorCode} - ${errorMsg}`, { path, error });
    throw new Error(`${errorMsg} [${response.status}${errorCode ? ' ' + errorCode : ''}]`);
  }
  return response;
}

// ============================================================================
// API Methods
// ============================================================================

export const liveRoomService = {
  /**
   * Get current user's permanent room
   */
  async getMyRoom(): Promise<MyRoomResponse> {
    const res = await apiFetch('/live/rooms/me');
    return res.json();
  },

  /**
   * Get room state (for polling)
   */
  async getRoomState(roomId: string): Promise<RoomStateResponse> {
    const res = await apiFetch(`/live/rooms/${roomId}/state`);
    return res.json();
  },

  /**
   * Update permanent room identity (name, slug, cover, description)
   */
  async updateRoom(roomId: string, updates: UpdateRoomPayload): Promise<{ ok: boolean }> {
    const res = await apiFetch(`/live/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  /**
   * Create a session on a permanent room (go live or schedule)
   */
  async createSession(roomId: string, request: CreateSessionRequest): Promise<{ ok: boolean; session_id: string; status: SessionStatus; room_id: string; daily_room_url?: string }> {
    const res = await apiFetch(`/live/rooms/${roomId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return res.json();
  },

  /**
   * Get session history for a room
   */
  async getSessions(roomId: string): Promise<{ ok: boolean; sessions: LiveRoomSession[] }> {
    const res = await apiFetch(`/live/rooms/${roomId}/sessions`);
    return res.json();
  },

  /**
   * Open lobby (scheduled -> lobby)
   */
  async openLobby(roomId: string): Promise<{ ok: boolean }> {
    const res = await apiFetch(`/live/rooms/${roomId}/open-lobby`, { method: 'POST' });
    return res.json();
  },

  /**
   * Cancel a scheduled session
   */
  async cancelRoom(roomId: string, userId: string): Promise<void> {
    await apiFetch(`/live/rooms/${roomId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId })
    });
  },

  /**
   * Start a live room
   */
  async startRoom(roomId: string): Promise<void> {
    await apiFetch(`/live/rooms/${roomId}/start`, { method: 'POST' });
  },

  /**
   * End a live room
   */
  async endRoom(roomId: string): Promise<void> {
    await apiFetch(`/live/rooms/${roomId}/end`, { method: 'POST' });
  },

  /**
   * Join a live room
   */
  async joinRoom(roomId: string, userId: string): Promise<void> {
    await apiFetch(`/live/rooms/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  /**
   * Leave a live room
   */
  async leaveRoom(roomId: string): Promise<void> {
    await apiFetch(`/live/rooms/${roomId}/leave`, { method: 'POST' });
  },

  /**
   * Signal host presence (mount)
   */
  async hostPresent(roomId: string): Promise<void> {
    await apiFetch(`/live/rooms/${roomId}/host-present`, { method: 'POST' });
  },

  /**
   * Signal host absence (unmount)
   */
  async hostAbsent(roomId: string): Promise<void> {
    await apiFetch(`/live/rooms/${roomId}/host-absent`, { method: 'POST' });
  },

  // --------------------------------------------------------------------------
  // Lobby Management (VTID-01228) - NEWLY ADDED
  // --------------------------------------------------------------------------

  /**
   * Get list of waiting guests (host only)
   */
  async getLobby(roomId: string): Promise<{ ok: boolean; users: LobbyUser[] }> {
    const res = await apiFetch(`/live/rooms/${roomId}/lobby`);
    return res.json();
  },

  /**
   * Admit guest from lobby (host only)
   */
  async admitUser(roomId: string, userId: string): Promise<{ ok: boolean }> {
    const res = await apiFetch(`/live/rooms/${roomId}/admit`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
    return res.json();
  },

  /**
   * Admit all waiting guests (host only)
   */
  async admitAll(roomId: string): Promise<{ ok: boolean; count: number }> {
    const res = await apiFetch(`/live/rooms/${roomId}/admit-all`, { method: 'POST' });
    return res.json();
  },

  /**
   * Reject guest from lobby (host only)
   */
  async rejectUser(roomId: string, userId: string): Promise<{ ok: boolean }> {
    const res = await apiFetch(`/live/rooms/${roomId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
    return res.json();
  },

  /**
   * Kick guest (can rejoin)
   */
  async kickUser(roomId: string, userId: string): Promise<{ ok: boolean }> {
    const res = await apiFetch(`/live/rooms/${roomId}/kick`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
    return res.json();
  },

  /**
   * Ban guest (cannot rejoin)
   */
  async banUser(roomId: string, userId: string): Promise<{ ok: boolean }> {
    const res = await apiFetch(`/live/rooms/${roomId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
    return res.json();
  },

  /**
   * Signal WebRTC disconnection
   */
  async disconnect(roomId: string): Promise<{ ok: boolean }> {
    const res = await apiFetch(`/live/rooms/${roomId}/disconnect`, { method: 'POST' });
    return res.json();
  },

  // --------------------------------------------------------------------------
  // Enter / exit (LR-B, VTID-04906)
  // --------------------------------------------------------------------------

  /**
   * Enter a room: the gateway checks access (live session, paid grant),
   * records attendance and returns the Daily URL plus a meeting token.
   * Rooms are private Daily rooms — a bare URL no longer gets anyone in.
   */
  async enterRoom(roomId: string): Promise<EnterRoomResponse> {
    const token = await getToken().catch(() => {
      throw new LiveRoomEnterError('UNAUTHENTICATED', 401, 'Not authenticated');
    });
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/live/rooms/${roomId}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
    } catch (err) {
      throw new LiveRoomEnterError('UNKNOWN', 0, err instanceof Error ? err.message : String(err));
    }
    const body = await response.json().catch(() => ({} as Record<string, unknown>));
    if (!response.ok) {
      const errorCode = typeof body?.error === 'string' ? body.error : undefined;
      console.error(`[liveRoomService] enter failed: ${response.status} ${errorCode ?? ''}`, { roomId, body });
      throw new LiveRoomEnterError(
        enterErrorCode(response.status, errorCode),
        response.status,
        (typeof body?.message === 'string' && body.message) || errorCode || `Request failed: ${response.status}`,
      );
    }
    if (!body?.daily_room_url || !body?.token) {
      throw new LiveRoomEnterError('UNKNOWN', response.status, 'Enter response without room url or token');
    }
    return body as EnterRoomResponse;
  },

  /**
   * Leave a room (records the leave for the current session on the gateway).
   * `keepalive` lets the request finish while the page is being hidden/closed.
   */
  async exitRoom(roomId: string, options: { keepalive?: boolean } = {}): Promise<void> {
    await apiFetch(`/live/rooms/${roomId}/exit`, {
      method: 'POST',
      keepalive: options.keepalive,
    });
  },

  // --------------------------------------------------------------------------
  // Daily.co & Payment
  // --------------------------------------------------------------------------

  /**
   * Create/refresh the Daily.co room — HOST ONLY (the gateway answers 403 to
   * everyone else). Viewers get in through `enterRoom`.
   */
  async createDailyRoom(roomId: string): Promise<DailyRoomResponse> {
    const res = await apiFetch(`/live/rooms/${roomId}/daily`, { method: 'POST' });
    return res.json();
  },

  /**
   * Delete Daily.co video room
   */
  async deleteDailyRoom(roomId: string): Promise<void> {
    await apiFetch(`/live/rooms/${roomId}/daily`, { method: 'DELETE' });
  },

  /**
   * Purchase access to a paid room
   */
  async purchaseAccess(roomId: string, userId: string): Promise<PurchaseResponse> {
    const res = await apiFetch(`/live/rooms/${roomId}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
    return res.json();
  },

  /**
   * Fetch room summary
   */
  async getRoomSummary(roomId: string): Promise<any> {
    const res = await apiFetch(`/live/rooms/${roomId}/summary`);
    return res.json();
  },

  /**
   * Legacy: Create a new live room (kept for backwards compat)
   */
  async createRoom(request: CreateRoomRequest): Promise<LiveRoom> {
    const res = await apiFetch('/live/rooms', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    const { room } = await res.json();
    return room;
  },
};
