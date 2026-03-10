// SW v3 — Raw push interception to prevent duplicate notifications
importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging-compat.js');

// Activate new SW immediately
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

firebase.initializeApp({
  apiKey: 'AIzaSyCthnpKTnUPpC8d-_bLt3DKz9VCQ8eiwnc',
  authDomain: 'lovable-vitana-vers1.firebaseapp.com',
  projectId: 'lovable-vitana-vers1',
  storageBucket: 'lovable-vitana-vers1.firebasestorage.app',
  messagingSenderId: '86804897789',
  appId: '1:86804897789:web:348bb41ad5025632c14394',
});

// NOTE: We intentionally do NOT call firebase.messaging() here.
// Calling it registers Firebase's own push handler which causes duplicate notifications.
// Our raw 'push' event listener below handles everything.

// Dedup cache
const recentTags = new Set();

/**
 * Raw push event handler — intercepts ALL push messages before Firebase SDK.
 * This prevents the browser from auto-displaying the `notification` payload,
 * giving us full control over what gets shown.
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    console.log('[SW] Non-JSON push data, ignoring');
    return;
  }

  // Extract notification info from both `notification` and `data` fields
  const notif = payload.notification || {};
  const data = payload.data || {};

  // Build the best possible title — prefer sender_name from data
  const senderName = data.sender_name || data.senderName || data.sender || data.from_name || data.fromName;
  const title = senderName || notif.title || data.title || 'Vitana';
  const body = notif.body || data.body || data.message || '';

  // Build a stable tag for deduplication
  // Use message_id if available, otherwise thread-based, otherwise content hash
  const tag = data.message_id || data.messageId
    || (data.thread_id ? `thread-${data.thread_id}` : null)
    || (data.threadId ? `thread-${data.threadId}` : null)
    || data.tag
    || `vitana-${hashCode(title + body)}`;

  // Deduplicate by tag (5-second window)
  if (recentTags.has(tag)) {
    console.log('[SW] Skipping duplicate tag:', tag);
    // Stop propagation to Firebase SDK
    event.stopImmediatePropagation();
    event.waitUntil(Promise.resolve());
    return;
  }
  recentTags.add(tag);
  setTimeout(() => recentTags.delete(tag), 5000);

  // Build click URL
  const url = data.url || data.click_action || notif.click_action
    || (data.thread_id ? `/inbox?thread=${data.thread_id}` : '/')
    || (data.threadId ? `/inbox?thread=${data.threadId}` : '/');

  // Stop Firebase SDK from also showing a notification
  event.stopImmediatePropagation();

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
  event.notification.close();
  const url = event.notification.data?.url || '/';
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
