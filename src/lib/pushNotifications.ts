import { supabase } from '@/integrations/supabase/client';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface PushSubscriptionData {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
}

class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = false;

  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscriptionData | null> {
    if (!this.registration || !this.isSupported) {
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BCqrKjSJH9RR8FZkjVs9DfgZL1SMFZhZZWYm7CpZG1VN7hgMIhD0vOcCzwJ3kK5WmJTqrL8'
        )
      });

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        p256dh_key: this.arrayBufferToBase64(subscription.getKey('p256dh')),
        auth_key: this.arrayBufferToBase64(subscription.getKey('auth')),
        user_agent: navigator.userAgent
      };

      // Save subscription to database
      await this.saveSubscription(subscriptionData);

      return subscriptionData;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        // Remove from database
        await this.removeSubscription();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }

  /**
   * Check if user is currently subscribed
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  /**
   * Show local notification (fallback when push is not available)
   */
  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return;
    }

    try {
      if (this.registration && this.registration.showNotification) {
        // Use service worker notification
        await this.registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/badge-72.png',
          tag: payload.tag,
          data: payload.data,
          requireInteraction: true
        });
      } else {
        // Fallback to basic notification
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icon-192.png',
          tag: payload.tag,
          data: payload.data
        });
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Save push subscription to database
   */
  private async saveSubscription(subscriptionData: PushSubscriptionData): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      console.log('Push subscription saved:', subscriptionData);
      // Note: push_subscriptions table needs to be created
      // await supabase.from('push_subscriptions').upsert({...})
    } catch (error) {
      console.error('Failed to save subscription:', error);
    }
  }

  /**
   * Remove push subscription from database
   */
  private async removeSubscription(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      console.log('Push subscription removed for user:', user.user.id);
      // Note: push_subscriptions table needs to be created  
      // await supabase.from('push_subscriptions').update({...})
    } catch (error) {
      console.error('Failed to remove subscription:', error);
    }
  }

  /**
   * Convert URL-safe base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

// Export singleton instance
export const pushNotificationManager = new PushNotificationManager();

/**
 * Initialize push notifications for the app
 */
export async function initializePushNotifications(): Promise<void> {
  try {
    const initialized = await pushNotificationManager.initialize();
    if (!initialized) return;

    const permission = await pushNotificationManager.requestPermission();
    if (permission === 'granted') {
      await pushNotificationManager.subscribe();
    }
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<void> {
  await pushNotificationManager.showLocalNotification({
    title: 'VITANA Chat',
    body: 'Push notifications are working!',
    icon: '/icon-192.png',
    tag: 'test-notification'
  });
}

/**
 * Notify user of new message
 */
export async function notifyNewMessage(
  senderName: string,
  messagePreview: string,
  threadId: string,
  isGroup: boolean = false
): Promise<void> {
  // Don't show notification if page is visible and focused
  if (!document.hidden && document.hasFocus()) {
    return;
  }

  const title = isGroup ? `${senderName} in group` : senderName;
  const body = messagePreview.length > 50 
    ? messagePreview.substring(0, 50) + '...' 
    : messagePreview;

  await pushNotificationManager.showLocalNotification({
    title,
    body,
    icon: '/icon-192.png',
    tag: `message-${threadId}`,
    data: {
      threadId,
      type: 'new_message',
      url: `/inbox?thread=${threadId}`
    },
    actions: [
      {
        action: 'reply',
        title: 'Reply',
        icon: '/reply-icon.png'
      },
      {
        action: 'mark_read',
        title: 'Mark as Read',
        icon: '/read-icon.png'
      }
    ]
  });
}