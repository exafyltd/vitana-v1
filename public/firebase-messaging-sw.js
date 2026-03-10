importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCthnpKTnUPpC8d-_bLt3DKz9VCQ8eiwnc',
  authDomain: 'lovable-vitana-vers1.firebaseapp.com',
  projectId: 'lovable-vitana-vers1',
  storageBucket: 'lovable-vitana-vers1.firebasestorage.app',
  messagingSenderId: '86804897789',
  appId: '1:86804897789:web:348bb41ad5025632c14394',
});

const messaging = firebase.messaging();

// Track recently shown notification tags to deduplicate
const recentTags = new Set();

messaging.onBackgroundMessage((payload) => {
  // If payload has a `notification` field, the browser/FCM SDK already
  // displays it automatically — do NOT call showNotification again.
  if (payload.notification) {
    console.log('[SW] Skipping showNotification — browser handles notification payload');
    return;
  }

  // Data-only message — we must show it manually
  const data = payload.data || {};
  const tag = data.tag || data.type || 'vitana-' + Date.now();

  // Deduplicate by tag
  if (recentTags.has(tag)) {
    console.log('[SW] Skipping duplicate tag:', tag);
    return;
  }
  recentTags.add(tag);
  setTimeout(() => recentTags.delete(tag), 5000);

  self.registration.showNotification(data.title || 'Vitana', {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    data: data,
    tag: tag,
  });
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
