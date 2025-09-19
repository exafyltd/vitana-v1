// Service Worker for Push Notifications
const CACHE_NAME = 'vitana-chat-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  const options = {
    body: data.body || 'New message received',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || [
      {
        action: 'open',
        title: 'Open',
        icon: '/open-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/close-icon.png'
      }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'VITANA', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'reply') {
    // Handle reply action
    event.waitUntil(
      clients.openWindow(data.url || '/inbox')
    );
  } else if (action === 'mark_read') {
    // Handle mark as read action
    // This would require a background sync or API call
    console.log('Mark as read:', data.threadId);
  } else if (action === 'open' || !action) {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(data.url || '/inbox') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(data.url || '/inbox');
        }
      })
    );
  }
});

// Background sync for offline message queue (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'message-sync') {
    event.waitUntil(
      // Sync pending messages when connection is restored
      syncPendingMessages()
    );
  }
});

async function syncPendingMessages() {
  // Implementation for syncing offline messages
  // This would read from IndexedDB and send to server
  console.log('Syncing pending messages...');
}