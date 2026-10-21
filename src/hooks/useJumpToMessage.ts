/**
 * VTID-05318 (messenger-ux-v2/ui-reply-jump) — jump to any message of the open
 * conversation (plan I8). Used by reply quotes (and by search results).
 *
 * jump(id): if the message is rendered, scroll it to the middle of the view
 * (no animation) and highlight it for 1.5 s. Otherwise load the window around
 * it (`loadAround`, gateway ?around=), let it render, then jump. A message the
 * conversation does not have (deleted, another conversation) shows a toast and
 * returns false.
 */
import { useCallback, useRef } from 'react';
import { notifyError } from '@/lib/i18n-toast';

export const HIGHLIGHT_MS = 1500;

function findRow(messageId: string): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById(`msg-${messageId}`);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

const highlightTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export function scrollToRow(el: HTMLElement): void {
  if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'auto', block: 'center' });
  // A second jump to the same row restarts the highlight (and its 1.5 s).
  const previous = highlightTimers.get(el);
  if (previous) clearTimeout(previous);
  el.classList.remove('message-highlight');
  void el.offsetWidth; // reflow, so the CSS animation starts again
  el.classList.add('message-highlight');
  highlightTimers.set(el, setTimeout(() => {
    el.classList.remove('message-highlight');
    highlightTimers.delete(el);
  }, HIGHLIGHT_MS));
}

export interface JumpOptions {
  /** Load the messages around `messageId` into the view. False = not in this conversation; null = abandoned (left the conversation): no jump, no toast. */
  loadAround: (messageId: string) => Promise<boolean | null>;
  /** Called right before the scroll (e.g. so the view stops following the bottom). */
  onJump?: () => void;
}

export function useJumpToMessage({ loadAround, onJump }: JumpOptions) {
  const pending = useRef<string | null>(null);

  return useCallback(async (messageId: string): Promise<boolean> => {
    if (!messageId || pending.current === messageId) return false;
    const here = findRow(messageId);
    if (here) {
      onJump?.();
      scrollToRow(here);
      return true;
    }
    pending.current = messageId;
    try {
      const ok = await loadAround(messageId).catch(() => false);
      if (ok === null) return false;
      if (ok) {
        // The window renders on the next commit; give it up to a few frames.
        for (let i = 0; i < 5; i++) {
          await nextFrame();
          const el = findRow(messageId);
          if (el) {
            onJump?.();
            scrollToRow(el);
            return true;
          }
        }
      }
      notifyError('inbox.reply.unavailable');
      return false;
    } finally {
      pending.current = null;
    }
  }, [loadAround, onJump]);
}

// ── Merging a context window without leaving a hole ──────────────────────
//
// The window around an old message (gateway ?around=) sits somewhere before
// the loaded page. To keep the list continuous, the rows between the window and
// the loaded page are fetched forward (?after=) in pages, up to `maxPages`.
// Rows are unioned by id and kept in created_at order.

export interface Timed { id: string; created_at: string }

export function unionByIdSorted<T extends Timed>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const r of a) byId.set(r.id, r);
  for (const r of b) if (!byId.has(r.id)) byId.set(r.id, r);
  return Array.from(byId.values()).sort((x, y) => (x.created_at < y.created_at ? -1 : x.created_at > y.created_at ? 1 : 0));
}

/**
 * The rendered list: the loaded rows plus the jump rows OLDER than the oldest
 * loaded row. Jump rows that overlap the loaded range are never shown, so a
 * delete, an edit or a realtime update of the loaded rows always wins (a stale
 * copy can't bring a deleted message back).
 */
export function withJumpRows<T extends Timed>(loaded: T[], jump: T[]): T[] {
  if (jump.length === 0) return loaded;
  if (loaded.length === 0) return unionByIdSorted([], jump);
  const oldest = loaded.reduce((min, r) => (r.created_at < min ? r.created_at : min), loaded[0].created_at);
  const older = jump.filter((r) => r.created_at < oldest);
  return older.length === 0 ? loaded : unionByIdSorted(loaded, older);
}

/**
 * Rows to add so that `window` connects to `loaded`. `fetchAfter(iso)` returns
 * up to one page of rows newer than iso, ascending.
 */
export async function bridgeWindow<T extends Timed>(
  window: T[],
  hasNewer: boolean,
  loaded: T[],
  fetchAfter: (afterIso: string) => Promise<T[]>,
  maxPages = 10,
): Promise<T[]> {
  if (window.length === 0) return [];
  let rows = window.slice();
  // Connected once the rows reach the NEWEST loaded row (or there is nothing
  // newer): the loaded page only ever holds the latest messages and moves
  // forward as new ones arrive, so a bridge that only touched its oldest row
  // would leave a hole later. Copies of loaded rows stay hidden (withJumpRows)
  // until the page moves past them.
  const newestLoaded = loaded.reduce<string | null>((max, r) => (max === null || r.created_at > max ? r.created_at : max), null);
  const connected = () => !hasNewerLeft || (newestLoaded !== null && rows[rows.length - 1].created_at >= newestLoaded);
  let hasNewerLeft = hasNewer;
  let pages = 0;
  while (!connected() && pages < maxPages) {
    const page = await fetchAfter(rows[rows.length - 1].created_at);
    pages += 1;
    if (page.length === 0) { hasNewerLeft = false; break; }
    rows = unionByIdSorted(rows, page);
  }
  return rows;
}
