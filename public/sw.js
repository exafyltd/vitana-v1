// Service Worker for Web Push Notifications
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      tag: data.tag || 'default',
      data: data.data || {},
      badge: '/favicon.ico',
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Vitana', options)
    );
  } catch (error) {
    console.error('Error processing push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Vitana', {
        body: 'You have a new message',
        icon: '/favicon.ico',
        tag: 'fallback'
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/inbox';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/inbox') && 'focus' in client) {
          // If we have a thread ID, navigate to it
          if (data.threadId && data.threadId !== 'test') {
            client.postMessage({
              type: 'NAVIGATE_TO_THREAD',
              threadId: data.threadId
            });
          }
          return client.focus();
        }
      }
      
      // If no suitable window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});

// Handle messages from the main thread
self.addEventListener('message', function(event) {
  console.log('Service worker received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event
self.addEventListener('install', function(event) {
  console.log('Service worker installing');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('Service worker activating');
  event.waitUntil(self.clients.claim());
});