// SW v4 — Firebase onBackgroundMessage suppression + raw push interception
importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging-compat.js');

// Lifecycle: activate new SW immediately
self.addEventListener('install', (event) => {
  console.log('[SW v4] Installing...');
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  console.log('[SW v4] Activating...');
  event.waitUntil(self.clients.claim());
});

firebase.initializeApp({
  apiKey: 'AIzaSyCthnpKTnUPpC8d-_bLt3DKz9VCQ8eiwnc',
  authDomain: 'lovable-vitana-vers1.firebaseapp.com',
  projectId: 'lovable-vitana-vers1',
  storageBucket: 'lovable-vitana-vers1.firebasestorage.app',
  messagingSenderId: '86804897789',
  appId: '1:86804897789:web:348bb41ad5025632c14394',
});

// Initialize messaging AND register onBackgroundMessage.
// This tells Firebase SDK: "I'm handling background messages — don't auto-display."
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW v4] onBackgroundMessage fired (no-op). Payload:', JSON.stringify(payload));
  // Return without showing a notification — our raw push handler already did it.
  return;
});

// Dedup cache
const recentTags = new Set();

/**
 * Raw push event handler — intercepts ALL push messages.
 * Fires alongside Firebase's internal handler, but we call stopImmediatePropagation()
 * to prevent Firebase from also processing it. Combined with the no-op onBackgroundMessage
 * above, this ensures only ONE notification is shown.
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW v4] Push received with no data, ignoring');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    console.log('[SW v4] Non-JSON push data, ignoring');
    return;
  }

  const notif = payload.notification || {};
  const data = payload.data || {};

  console.log('[SW v4] Push received. Has notification:', !!payload.notification, '| Has data:', !!payload.data, '| Payload:', JSON.stringify(payload));

  // Build the best possible title — prefer sender_name from data
  const senderName = data.sender_name || data.senderName || data.sender || data.from_name || data.fromName;
  const title = senderName || notif.title || data.title || 'Vitana';
  const body = notif.body || data.body || data.message || '';

  console.log('[SW v4] Resolved title:', title, '| body:', body);

  // Build a stable tag for deduplication
  const tag = data.message_id || data.messageId
    || (data.thread_id ? `thread-${data.thread_id}` : null)
    || (data.threadId ? `thread-${data.threadId}` : null)
    || data.tag
    || `vitana-${hashCode(title + body)}`;

  // Deduplicate by tag (5-second window)
  if (recentTags.has(tag)) {
    console.log('[SW v4] Skipping duplicate tag:', tag);
    event.stopImmediatePropagation();
    event.waitUntil(Promise.resolve());
    return;
  }
  recentTags.add(tag);
  setTimeout(() => recentTags.delete(tag), 5000);

  // Build click URL — use null for intermediate fallbacks so final '/' is the true default
  const url = data.url || data.click_action || notif.click_action
    || (data.thread_id ? `/inbox?thread=${data.thread_id}` : null)
    || (data.threadId ? `/inbox?thread=${data.threadId}` : null)
    || '/';

  // Stop Firebase SDK from also processing this push
  event.stopImmediatePropagation();

  console.log('[SW v4] Showing notification. Tag:', tag, '| URL:', url);

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: notif.icon || data.icon || '/favicon.ico',
      badge: notif.badge || data.badge || undefined,
      tag: tag,
      renotify: false,
      data: { ...data, url: url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  const url = event.notification.data?.url || '/';
  console.log('[SW v4] Notification clicked. URL:', url);
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Simple string hash for tag generation
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
