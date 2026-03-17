/**
 * Appilix WebView Notification Fallback
 *
 * Restores the bell-style notification behaviour that previously worked
 * when the Appilix WebView was backgrounded.  Uses the browser Notification
 * API (supported by Chromium-based WebViews) as a bridge until a proper
 * native push integration is built.
 *
 * Scoped to Appilix only — this module is a no-op on desktop/web.
 */

import { isAppilix } from '@/lib/appilix';
import type { VitanaNotification } from '@/hooks/useNotifications';

// ── Dedup set with auto-expiry ────────────────────────────
const shownIds = new Set<string>();
const DEDUP_TTL_MS = 30_000; // 30 seconds

function trackShown(messageId: string) {
  shownIds.add(messageId);
  setTimeout(() => shownIds.delete(messageId), DEDUP_TTL_MS);
}

// ── Visibility & thread helpers ───────────────────────────

function isAppBackgrounded(): boolean {
  return document.hidden || document.visibilityState === 'hidden';
}

function isViewingThread(senderId: string): boolean {
  try {
    const url = new URL(window.location.href);
    const thread = url.searchParams.get('thread');
    return thread === senderId;
  } catch {
    return false;
  }
}

// ── Permission ────────────────────────────────────────────

let permissionChecked = false;

async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  if (!permissionChecked) {
    permissionChecked = true;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

// ── Public API ────────────────────────────────────────────

/**
 * Show a browser Notification for an incoming chat message when the
 * Appilix WebView is backgrounded.
 *
 * Returns `true` if a notification was shown, `false` if suppressed.
 */
export async function showAppilixFallbackNotification(
  notif: VitanaNotification,
): Promise<boolean> {
  // 1. Only inside Appilix
  if (!isAppilix()) return false;

  // 2. Only for chat messages
  if (notif.type !== 'new_chat_message') return false;

  const data = notif.data || {};
  const messageId = data.message_id as string | undefined;
  const senderId = data.sender_id as string | undefined;

  // 3. Dedup — skip if already shown
  if (messageId && shownIds.has(messageId)) return false;

  // 4. Skip if user is looking at this thread right now
  if (senderId && !isAppBackgrounded() && isViewingThread(senderId)) return false;

  // 5. Ensure permission
  const allowed = await ensurePermission();
  if (!allowed) return false;

  // 6. Track for dedup
  if (messageId) trackShown(messageId);

  // 7. Build & show notification
  const title = notif.title || 'New message';
  const body = notif.body || '';
  const tag = messageId ? `message-${messageId}` : `chat-${Date.now()}`;
  const threadParam = senderId || '';

  try {
    // Prefer service-worker showNotification (survives page hide better)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        tag,
        data: { url: `/inbox?thread=${threadParam}` },
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        renotify: true,
      } as NotificationOptions & { renotify: boolean });
      });
      return true;
    }

    // Fallback: plain Notification constructor
    const n = new Notification(title, { body, tag, icon: '/icons/icon-192x192.png' });
    n.onclick = () => {
      window.focus();
      window.location.href = `/inbox?thread=${threadParam}`;
      n.close();
    };
    return true;
  } catch (err) {
    console.warn('[AppilixFallback] Notification failed:', err);
    return false;
  }
}
