/**
 * Live Room API Client
 *
 * Wraps Gateway Live Room endpoints with typed interfaces.
 * VTID-01228: Session-based Live Room management
 */

import { supabase } from '@/integrations/supabase/client';

const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE || 'https://gateway-86804897789.us-central1.run.app';
const API_BASE = `${GATEWAY_BASE}/api/v1`;

// ============================================================================
// Types
// ============================================================================

export type AccessLevel = 'public' | 'group';
export type RoomStatus = 'idle' | 'scheduled' | 'lobby' | 'live' | 'ended';

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
  room_id: string;
  session_title: string;
  session_description: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  starts_at: string | null;
  ends_at: string | null;
  scheduled_for: string | null;
  stream_type: string | null;
  tags: string[];
  access_level: string;
  cover_image_url: string | null;
  enable_chat: boolean;
  enable_polls: boolean;
  enable_recording: boolean;
  viewer_count: number;
  peak_viewers: number;
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

export interface CreateSessionRequest {
  session_title: string;
  session_description?: string;
  stream_type?: string;
  tags?: string[];
  access_level?: string;
  cover_image_url?: string;
  scheduled_for?: string;
  enable_chat?: boolean;
  enable_polls?: boolean;
  enable_recording?: boolean;
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

export interface PurchaseResponse {
  ok: boolean;
  client_secret: string;
  amount: number;
  currency: string;
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
    throw new Error(error.message || error.error || `Request failed: ${response.status}`);
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
   * Create a session on a permanent room (go live or schedule)
   */
  async createSession(roomId: string, request: CreateSessionRequest): Promise<{ ok: boolean; session: LiveRoomSession }> {
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
   * Cancel a scheduled session
   */
  async cancelRoom(roomId: string): Promise<void> {
    await apiFetch(`/live/rooms/${roomId}/cancel`, { method: 'POST' });
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

  /**
   * Create Daily.co video room
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
