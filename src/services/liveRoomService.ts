/**
 * Live Room API Client
 *
 * Wraps Gateway Live Room endpoints with typed interfaces.
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { supabase } from '@/integrations/supabase/client';

const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE || 'https://gateway-q74ibpv6ia-uc.a.run.app';
const API_BASE = `${GATEWAY_BASE}/api/v1`;

// ============================================================================
// Types
// ============================================================================

export type AccessLevel = 'public' | 'group';
export type RoomStatus = 'scheduled' | 'live' | 'ended';

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

// ============================================================================
// API Methods
// ============================================================================

export const liveRoomService = {
  /**
   * Create a new live room
   */
  async createRoom(request: CreateRoomRequest): Promise<LiveRoom> {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/live/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create room');
    }

    const { room } = await response.json();
    return room;
  },

  /**
   * Start a live room
   */
  async startRoom(roomId: string): Promise<void> {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/live/rooms/${roomId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start room');
    }
  },

  /**
   * End a live room
   */
  async endRoom(roomId: string): Promise<void> {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/live/rooms/${roomId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to end room');
    }
  },

  /**
   * Join a live room
   */
  async joinRoom(roomId: string, userId: string): Promise<void> {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/live/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to join room');
    }
  },

  /**
   * Leave a live room
   */
  async leaveRoom(roomId: string): Promise<void> {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/live/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to leave room');
    }
  },

  /**
   * Create Daily.co video room
   */
  async createDailyRoom(roomId: string): Promise<DailyRoomResponse> {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/live/rooms/${roomId}/daily`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to create Daily.co room');
    }

    return response.json();
  },

  /**
   * Delete Daily.co video room
   */
  async deleteDailyRoom(roomId: string): Promise<void> {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/live/rooms/${roomId}/daily`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete Daily.co room');
    }
  },

  /**
   * Purchase access to a paid room
   */
  async purchaseAccess(roomId: string, userId: string): Promise<PurchaseResponse> {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/live/rooms/${roomId}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to purchase access');
    }

    return response.json();
  },

  /**
   * Fetch room summary
   */
  async getRoomSummary(roomId: string): Promise<any> {
    const token = await getToken();
    const response = await fetch(`${API_BASE}/live/rooms/${roomId}/summary`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch summary');
    }

    return response.json();
  },
};
