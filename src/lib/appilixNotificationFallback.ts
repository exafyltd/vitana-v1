/**
 * Browser Notification Fallback
 *
 * Shows browser-level notifications for incoming chat messages when the
 * app is backgrounded or the user is not viewing the relevant thread.
 *
 * Works on ALL platforms (desktop browsers, Appilix WebView, etc.).
 * Uses the browser Notification API as a bridge until proper native
 * push integration is built for each platform.
 */

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

async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') {
    console.log('[NotifFallback] Notification API not available');
    return false;
  }

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') {
    console.log('[NotifFallback] Permission denied by user');
    return false;
  }

  // Permission is 'default' — request it
  try {
    console.log('[NotifFallback] Requesting permission...');
    const result = await Notification.requestPermission();
    console.log('[NotifFallback] Permission result:', result);
    return result === 'granted';
  } catch (err) {
    console.warn('[NotifFallback] Permission request failed:', err);
    return false;
  }
}

// ── Public API ────────────────────────────────────────────

/**
 * Show a browser Notification for an incoming chat message when the
 * app is backgrounded or the user is not viewing the relevant thread.
 *
 * Returns `true` if a notification was shown, `false` if suppressed.
 */
export async function showAppilixFallbackNotification(
  notif: VitanaNotification,
): Promise<boolean> {
  // Native Appilix push (trg_appilix_push) now handles delivery — skip browser fallback
  if (isAppilix()) {
    console.log('[NotifFallback] Skipped: Appilix native push active');
    return false;
  }

  // 1. Only for chat messages
  if (notif.type !== 'new_chat_message') {
    console.log('[NotifFallback] Skipped: type is', notif.type);
    return false;
  }

  const data = notif.data || {};
  const messageId = data.message_id as string | undefined;
  const senderId = data.sender_id as string | undefined;

  // 2. Dedup — skip if already shown
  if (messageId && shownIds.has(messageId)) {
    console.log('[NotifFallback] Skipped: dedup for', messageId);
    return false;
  }

  // 3. Skip if user is looking at this exact thread right now (foreground + thread open)
  if (senderId && !isAppBackgrounded() && isViewingThread(senderId)) {
    console.log('[NotifFallback] Skipped: viewing thread', senderId);
    return false;
  }

  // 4. Ensure permission
  const allowed = await ensurePermission();
  if (!allowed) return false;

  // 5. Track for dedup
  if (messageId) trackShown(messageId);

  // 6. Build & show notification
  const title = notif.title || 'New message';
  const body = notif.body || '';
  const tag = messageId ? `message-${messageId}` : `chat-${Date.now()}`;
  const threadParam = senderId || '';

  console.log('[NotifFallback] Showing notification:', { title, tag, backgrounded: isAppBackgrounded() });

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
      });
      console.log('[NotifFallback] Shown via service worker');
      return true;
    }

    // Fallback: plain Notification constructor
    const n = new Notification(title, { body, tag, icon: '/icons/icon-192x192.png' });
    n.onclick = () => {
      window.focus();
      window.location.href = `/inbox?thread=${threadParam}`;
      n.close();
    };
    console.log('[NotifFallback] Shown via Notification constructor');
    return true;
  } catch (err) {
    console.warn('[NotifFallback] Notification failed:', err);
    return false;
  }
}
