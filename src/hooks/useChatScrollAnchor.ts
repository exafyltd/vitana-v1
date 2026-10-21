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

export interface ScrollAnchorOptions {
  /** Changes when another conversation opens (resets the count). */
  conversationKey: string | null;
  /** The newest rendered message (bottom of the list). */
  newest: { id: string; sender_id?: string | null } | null;
  /** The signed-in member. */
  meId?: string | null;
  /** True while the view is within `threshold` of its bottom. */
  isAtBottom: () => boolean;
  /** Put the view at the newest message, instantly. */
  follow: () => void;
  /** False until the conversation has its opening position. */
  enabled?: boolean;
}

export function useChatScrollAnchor({ conversationKey, newest, meId, isAtBottom, follow, enabled = true }: ScrollAnchorOptions) {
  const [newCount, setNewCount] = useState(0);
  const atBottomRef = useRef(true);
  const lastNewestRef = useRef<string | null>(null);
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

  const newestId = newest?.id ?? null;
  const newestSender = newest?.sender_id ?? null;

  // Runs after the DOM has the new message and before paint.
  useLayoutEffect(() => {
    if (!enabled || !newestId) return;
    const previous = lastNewestRef.current;
    lastNewestRef.current = newestId;
    if (previous === null || previous === newestId) return; // first render of this conversation / no new bottom row
    const mine = !!meId && newestSender === meId;
    if (mine || atBottomRef.current) {
      follow();
      atBottomRef.current = true;
      setNewCount(0);
      return;
    }
    setNewCount((n) => n + 1);
  }, [enabled, newestId, newestSender, meId, follow]);

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
