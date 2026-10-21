/**
 * VTID-05320 (messenger-ux-v2/ui-send-status) — the chat send outbox.
 *
 * Every send gets a client_message_id (UUID). Until the server accepts it the
 * message lives here, not in the query cache: the conversation renders the
 * outbox items of the open thread after its server rows (status sending |
 * failed). On success the real row goes into the cache and the item is
 * removed; a real row whose client_message_id matches an item hides that item,
 * so a realtime echo or a refetch can never show the message twice.
 *
 * Items of direct conversations are persisted per user in localStorage, so a
 * reload keeps them: pending ones are re-posted once (same id — the gateway
 * dedups, VTID-05310), failed ones show with Retry. Items older than 7 days are
 * dropped. A storage error falls back to memory for the session. Items of legacy
 * group threads (global_messages, no server dedup) are kept in memory only.
 */

export type OutboxStatus = 'sending' | 'failed' | 'sent';

export interface OutboxItem {
  client_message_id: string;
  user_id: string;
  thread_id: string;
  /** 'dm' = chat_messages via the gateway (dedup by client id); 'legacy' = global_messages thread. */
  kind: 'dm' | 'legacy';
  body: string;
  message_type: string;
  content_data?: Record<string, unknown> | null;
  reply_to_message_id?: string | null;
  created_at: string;
  attempts: number;
  status: OutboxStatus;
  /** The last failure happened while the browser reported being offline. */
  offline?: boolean;
  /**
   * 'sent' only: the stored row. It keeps rendering until a fetch of the thread
   * contains it (by client_message_id or id), so a refetch that started before
   * the insert can never make a just-sent message disappear.
   */
  server_row?: { id: string; [k: string]: unknown };
  /** 'sent' only: when the server accepted it (ms). */
  sent_at?: number;
}

/** How long a 'sent' item waits for a fetch to contain its row. */
export const SENT_GRACE_MS = 2 * 60 * 1000;

export const OUTBOX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const KEY_PREFIX = 'vitana:chat:outbox:v1:';
export const TEMP_PREFIX = 'temp-';

export function outboxKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export function newClientMessageId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // RFC 4122 v4 fallback for old WebViews.
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function tempIdFor(clientMessageId: string): string {
  return `${TEMP_PREFIX}${clientMessageId}`;
}

export function isTempId(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith(TEMP_PREFIX);
}

// ── Storage (localStorage with an in-memory fallback) ─────────────────────

const memory = new Map<string, OutboxItem[]>();

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function prune(items: OutboxItem[], now: number): OutboxItem[] {
  return items.filter((i) => now - new Date(i.created_at).getTime() < OUTBOX_MAX_AGE_MS);
}

function isItem(v: unknown): v is OutboxItem {
  const i = v as OutboxItem;
  return !!i && typeof i.client_message_id === 'string' && typeof i.thread_id === 'string' && typeof i.user_id === 'string';
}

/** Items of this user: persisted (dm) plus in-memory (legacy and storage-failure). */
export function loadOutbox(userId: string, now: number = Date.now()): OutboxItem[] {
  let persisted: OutboxItem[] = [];
  const s = storage();
  if (s) {
    try {
      const raw = s.getItem(outboxKey(userId));
      const parsed = raw ? JSON.parse(raw) : [];
      persisted = Array.isArray(parsed) ? parsed.filter(isItem).filter((i) => i.user_id === userId) : [];
    } catch {
      persisted = [];
    }
  }
  const mem = memory.get(userId) ?? [];
  const byId = new Map<string, OutboxItem>();
  for (const i of [...persisted, ...mem]) byId.set(i.client_message_id, i);
  return prune(Array.from(byId.values()), now).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Writes the user's items: dm items to localStorage (fallback memory), legacy items to memory. */
export function saveOutbox(userId: string, items: OutboxItem[]): void {
  // 'sent' items are a render-time bridge only; never persisted.
  const mine = items.filter((i) => i.user_id === userId && i.status !== 'sent');
  const durable = mine.filter((i) => i.kind === 'dm');
  const s = storage();
  let stored = false;
  if (s) {
    try {
      if (durable.length === 0) s.removeItem(outboxKey(userId));
      else s.setItem(outboxKey(userId), JSON.stringify(durable));
      stored = true;
    } catch {
      stored = false;
    }
  }
  memory.set(userId, stored ? mine.filter((i) => i.kind !== 'dm') : mine);
}

export function upsertItem(items: OutboxItem[], item: OutboxItem): OutboxItem[] {
  const rest = items.filter((i) => i.client_message_id !== item.client_message_id);
  return [...rest, item].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function removeItem(items: OutboxItem[], clientMessageId: string): OutboxItem[] {
  return items.filter((i) => i.client_message_id !== clientMessageId);
}

/** Sign-out: nothing of one member may remain for the next one on this device. */
export function clearOutbox(userId: string): void {
  memory.delete(userId);
  const s = storage();
  try {
    s?.removeItem(outboxKey(userId));
  } catch {
    /* ignore */
  }
}

// ── Rendering ─────────────────────────────────────────────────────────────

export interface OutboxRow {
  id: string;
  client_message_id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  message_type: string;
  content_data?: unknown;
  created_at: string;
  updated_at: string;
  send_status: 'sending' | 'failed';
  reply_to_message_id?: string | null;
}

export function itemToRow(item: OutboxItem): OutboxRow {
  return {
    id: tempIdFor(item.client_message_id),
    client_message_id: item.client_message_id,
    thread_id: item.thread_id,
    sender_id: item.user_id,
    body: item.body,
    message_type: item.message_type,
    content_data: item.content_data ?? undefined,
    created_at: item.created_at,
    updated_at: item.created_at,
    send_status: item.status === 'failed' ? 'failed' : 'sending',
    reply_to_message_id: item.reply_to_message_id ?? null,
  };
}

/** True when the thread's rows already contain this item's message. */
export function hasArrived(rows: Array<{ id: string; client_message_id?: string | null }>, item: OutboxItem): boolean {
  return rows.some((r) => r.client_message_id === item.client_message_id || (!!item.server_row && r.id === item.server_row.id));
}

/**
 * Server rows of a thread plus its outbox items (after them, in send order).
 * An item whose client_message_id already arrived as a real row is hidden.
 */
export function mergeOutbox<T extends { id: string; client_message_id?: string | null }>(
  rows: T[],
  items: OutboxItem[],
  threadId: string | null | undefined,
): Array<T | OutboxRow> {
  if (!threadId) return rows;
  const mine = items.filter((i) => i.thread_id === threadId && !hasArrived(rows, i));
  if (mine.length === 0) return rows;
  const extra = mine.map((i) => (i.status === 'sent' && i.server_row ? (i.server_row as unknown as OutboxRow) : itemToRow(i)));
  return [...rows, ...extra];
}

/**
 * Put a server row into a cached list: replaces the optimistic row of the same
 * client_message_id (temp id or field), or a row with the same id; else appends.
 */
export function reconcileByClientId<T extends { id: string; client_message_id?: string | null; created_at?: string }>(
  rows: T[],
  real: T,
  clientMessageId: string | null | undefined,
): T[] {
  const cid = clientMessageId ?? real.client_message_id ?? null;
  const matches = (r: T) =>
    r.id === real.id || (!!cid && (r.id === tempIdFor(cid) || r.client_message_id === cid));
  if (!rows.some(matches)) {
    // Chronological insert (a peer's message may have arrived meanwhile).
    const at = real.created_at;
    const idx = at ? rows.findIndex((r) => !!r.created_at && r.created_at > at) : -1;
    return idx < 0 ? [...rows, real] : [...rows.slice(0, idx), real, ...rows.slice(idx)];
  }
  const out: T[] = [];
  let placed = false;
  for (const r of rows) {
    if (!matches(r)) out.push(r);
    else if (!placed) {
      out.push(real);
      placed = true;
    }
  }
  return out;
}

// ── One store per member (shared by every useGlobalMessages instance) ──────
//
// The hook is mounted several times at once (inbox list, open conversation,
// profile / meetup "message" buttons). They must share ONE list, ONE send
// chain per conversation, ONE reload re-post and ONE reconnect flush, or they
// overwrite each other's items and post the same message twice.

type Listener = () => void;

interface OutboxStore {
  userId: string;
  items: OutboxItem[];
  listeners: Set<Listener>;
  /** One send at a time per conversation, in send order. */
  chains: Record<string, Promise<unknown>>;
  /** client ids queued or in flight (a second enqueue is a no-op). */
  queued: Set<string>;
  /** The reload re-post ran for this page load. */
  bootstrapped: boolean;
  /** Bumped on sign-out: late writes of an old session are dropped. */
  generation: number;
}

const stores = new Map<string, OutboxStore>();

export function outboxStore(userId: string): OutboxStore {
  let s = stores.get(userId);
  if (!s) {
    s = { userId, items: loadOutbox(userId), listeners: new Set(), chains: {}, queued: new Set(), bootstrapped: false, generation: 0 };
    stores.set(userId, s);
  }
  return s;
}

export function subscribeOutbox(userId: string, listener: Listener): () => void {
  const s = outboxStore(userId);
  s.listeners.add(listener);
  return () => s.listeners.delete(listener);
}

export function getOutboxItems(userId: string): OutboxItem[] {
  return outboxStore(userId).items;
}

/** Update, persist and notify. A write from an older generation (signed out since) is dropped. */
export function updateOutbox(userId: string, updater: (prev: OutboxItem[]) => OutboxItem[], generation?: number): void {
  const s = outboxStore(userId);
  if (generation !== undefined && generation !== s.generation) return;
  const next = updater(s.items);
  if (next === s.items) return;
  s.items = next;
  saveOutbox(userId, next);
  s.listeners.forEach((l) => l());
}

/**
 * Run `deliver` for this item after the conversation's previous send. A second
 * enqueue of an id already queued / in flight returns null at once.
 */
export function enqueueOutboxDelivery<T>(userId: string, item: OutboxItem, deliver: () => Promise<T>): Promise<T | null> {
  const s = outboxStore(userId);
  if (s.queued.has(item.client_message_id)) return Promise.resolve(null);
  s.queued.add(item.client_message_id);
  const prev = s.chains[item.thread_id] ?? Promise.resolve();
  const next = prev
    .catch(() => undefined)
    .then(deliver)
    .finally(() => s.queued.delete(item.client_message_id));
  s.chains[item.thread_id] = next.catch(() => undefined);
  return next;
}

export function isQueued(userId: string, clientMessageId: string): boolean {
  return outboxStore(userId).queued.has(clientMessageId);
}

/** Returns true the first time per member per page load (the reload re-post). */
export function claimBootstrap(userId: string): boolean {
  const s = outboxStore(userId);
  if (s.bootstrapped) return false;
  s.bootstrapped = true;
  return true;
}

/** Sign-out: drop everything of this member on this device and ignore late writes. */
export function resetOutbox(userId: string): void {
  const s = stores.get(userId);
  clearOutbox(userId);
  if (!s) return;
  s.generation += 1;
  s.items = [];
  s.chains = {};
  s.queued.clear();
  s.bootstrapped = false;
  s.listeners.forEach((l) => l());
}

/** Tests only: forget every store. */
export function __resetOutboxStoresForTests(): void {
  stores.clear();
  memory.clear();
}
