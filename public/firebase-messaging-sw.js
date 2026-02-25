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

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  self.registration.showNotification(notification.title || 'Vitana', {
    body: notification.body || '',
    icon: notification.icon || '/favicon.ico',
    data: data,
    tag: data.type || 'default',
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
