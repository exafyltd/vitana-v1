import { getLocalStorageItem, setLocalStorageItem } from "@/lib/localStorage";

// Minimal pending event shape to store locally (no user_id)
export type PendingSenderEvent = {
  title: string;
  description?: string | null;
  start_time: string; // ISO string
  end_time?: string | null;
  location?: string | null;
  event_type?: 'personal' | 'community' | 'professional' | 'health' | 'workout' | 'nutrition';
  status?: 'confirmed' | 'pending' | 'conflict' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  is_recurring?: boolean;
  source_type?: 'manual' | 'invite' | 'imported';
  source_message_id?: string | null;
  created_at: string; // when queued
  ttl_hours?: number; // default 24h
};

const MODULE = "calendar";
const KEY = "pending_sender_events";

function readQueue(): PendingSenderEvent[] {
  const raw = getLocalStorageItem("global", MODULE, KEY, "[]");
  try {
    const list = JSON.parse(raw || "[]") as PendingSenderEvent[];
    // Filter out expired items
    const now = Date.now();
    return list.filter(item => {
      const ttl = (item.ttl_hours ?? 24) * 60 * 60 * 1000;
      const created = new Date(item.created_at).getTime();
      return !isNaN(created) && now - created < ttl;
    });
  } catch {
    return [];
  }
}

function writeQueue(list: PendingSenderEvent[]) {
  setLocalStorageItem("global", MODULE, KEY, JSON.stringify(list));
}

export function enqueuePendingSenderEvent(event: Omit<PendingSenderEvent, "created_at" | "ttl_hours"> & Partial<Pick<PendingSenderEvent, "ttl_hours">>) {
  const queue = readQueue();
  const payload: PendingSenderEvent = {
    ...event,
    created_at: new Date().toISOString(),
    ttl_hours: event.ttl_hours ?? 24,
    event_type: event.event_type ?? 'personal',
    status: event.status ?? 'confirmed',
    priority: event.priority ?? 'medium',
    is_recurring: !!event.is_recurring,
    source_type: event.source_type ?? 'invite',
  };

  // Idempotency in queue: if same source_message_id already queued, replace it
  if (payload.source_message_id) {
    const idx = queue.findIndex(q => q.source_message_id === payload.source_message_id);
    if (idx >= 0) {
      queue[idx] = payload;
      writeQueue(queue);
      return;
    }
  }

  queue.push(payload);
  writeQueue(queue);
}

export function dequeueBySourceMessageId(sourceMessageId?: string | null) {
  if (!sourceMessageId) return;
  const queue = readQueue();
  const filtered = queue.filter(q => q.source_message_id !== sourceMessageId);
  writeQueue(filtered);
}

export function listPendingSenderEvents(): PendingSenderEvent[] {
  return readQueue();
}
