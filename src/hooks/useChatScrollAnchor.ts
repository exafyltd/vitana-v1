/**
 * VTID-05319 (messenger-ux-v2/ui-scroll-anchoring) — "new messages" without
 * forced scrolling, shared by the DM view (ConversationView) and GroupChat.
 *
 * - At the bottom (within `threshold` px): a new message keeps the view
 *   anchored to the newest one (instant, no animation).
 * - Reading earlier messages: a new message from someone else never moves the
 *   view; it is counted for the floating "↓ N new messages" pill instead.
 * - My own new message always brings me to the bottom (I just sent it).
 * - Reaching the bottom (scrolling or the pill) clears the count.
 *
 * The view supplies how to measure and how to follow, because the two screens
 * scroll different elements (GroupChat may scroll the document in the
 * Android app, VTID-04928).
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export const NEAR_BOTTOM_PX = 80;

/** Distance of an element's scroll position from its bottom, in px. */
export function distanceFromBottom(el: { scrollHeight: number; scrollTop: number; clientHeight: number } | null): number {
  if (!el) return 0;
  return Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight);
}

export interface AnchorRow {
  id: string;
  sender_id?: string | null;
  created_at?: string | null;
  client_message_id?: string | null;
}

export interface ScrollAnchorOptions {
  /** Changes when another conversation opens (resets the count). */
  conversationKey: string | null;
  /** The rendered messages, oldest first (the last one is at the bottom). */
  rows: readonly AnchorRow[];
  /** The signed-in member. */
  meId?: string | null;
  /** True while the view is within `threshold` of its bottom. */
  isAtBottom: () => boolean;
  /** Put the view at the newest message, instantly. */
  follow: () => void;
  /** False until the conversation has its opening position. */
  enabled?: boolean;
}

/**
 * The rows that arrived below `previous` (the former bottom row). Empty when
 * nothing new is at the bottom: older pages prepended, the newest row deleted,
 * or my unsent row got its server id (same client_message_id).
 */
export function arrivedBelow(rows: readonly AnchorRow[], previous: AnchorRow): AnchorRow[] {
  const newest = rows[rows.length - 1];
  if (!newest || newest.id === previous.id) return [];
  if (previous.client_message_id && newest.client_message_id === previous.client_message_id) return [];
  const index = rows.findIndex((r) => r.id === previous.id);
  if (index >= 0) return rows.slice(index + 1);
  // The former bottom row is gone (deleted, or replaced by its server copy):
  // only rows newer than it count.
  const since = previous.created_at ? Date.parse(previous.created_at) : NaN;
  if (!Number.isFinite(since)) return [newest];
  return rows.filter((r) => {
    if (previous.client_message_id && r.client_message_id === previous.client_message_id) return false;
    const at = r.created_at ? Date.parse(r.created_at) : NaN;
    return Number.isFinite(at) && at > since;
  });
}

export function useChatScrollAnchor({ conversationKey, rows, meId, isAtBottom, follow, enabled = true }: ScrollAnchorOptions) {
  const [newCount, setNewCount] = useState(0);
  const atBottomRef = useRef(true);
  const lastNewestRef = useRef<AnchorRow | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const keyRef = useRef<string | null>(null);

  // A new conversation starts at the bottom with nothing counted.
  if (keyRef.current !== conversationKey) {
    keyRef.current = conversationKey;
    lastNewestRef.current = null;
    atBottomRef.current = true;
  }
  useLayoutEffect(() => {
    setNewCount(0);
  }, [conversationKey]);

  const newest = rows.length > 0 ? rows[rows.length - 1] : null;
  const newestId = newest?.id ?? null;

  // Runs after the DOM has the new message and before paint.
  useLayoutEffect(() => {
    const current = rowsRef.current;
    const bottom = current.length > 0 ? current[current.length - 1] : null;
    if (!enabled || !bottom) return;
    const previous = lastNewestRef.current;
    lastNewestRef.current = { id: bottom.id, sender_id: bottom.sender_id, created_at: bottom.created_at, client_message_id: bottom.client_message_id };
    if (previous === null) return; // first render of this conversation
    const arrived = arrivedBelow(current, previous);
    if (arrived.length === 0) return;
    const mine = !!meId && arrived.some((r) => r.sender_id === meId);
    if (mine || atBottomRef.current) {
      follow();
      atBottomRef.current = true;
      setNewCount(0);
      return;
    }
    setNewCount((n) => n + arrived.length);
  }, [enabled, newestId, meId, follow]);

  /** Call from the scroll handler of whatever element scrolls. */
  const onScroll = useCallback(() => {
    const bottom = isAtBottom();
    atBottomRef.current = bottom;
    if (bottom) setNewCount((n) => (n === 0 ? n : 0));
  }, [isAtBottom]);

  /** The pill: go to the newest message and clear the count. */
  const jumpToLatest = useCallback(() => {
    follow();
    atBottomRef.current = true;
    setNewCount(0);
  }, [follow]);

  /** The view positioned itself somewhere other than the bottom (unread divider, deep link). */
  const markAway = useCallback(() => {
    atBottomRef.current = false;
  }, []);

  return { newCount, onScroll, jumpToLatest, markAway, atBottomRef };
}
