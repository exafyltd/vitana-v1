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
  private mutedThreads: string[] = [];

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
      console.log('✅ Service Worker registered:', this.registration);
      
      // Load existing subscription and muted threads
      await this.loadExistingSubscription();
      
      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
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
   * Load existing subscription from database
   */
  private async loadExistingSubscription(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, muted_threads, is_active')
        .eq('user_id', user.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('❌ Failed to load subscription:', error);
        return;
      }

      if (data?.muted_threads) {
        this.mutedThreads = data.muted_threads;
        console.log('✅ Loaded muted threads:', this.mutedThreads.length);
      }
    } catch (error) {
      console.error('❌ Failed to load subscription:', error);
    }
  }

  /**
   * Save push subscription to database
   */
  private async saveSubscription(subscriptionData: PushSubscriptionData): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.user.id,
          endpoint: subscriptionData.endpoint,
          p256dh_key: subscriptionData.p256dh_key,
          auth_key: subscriptionData.auth_key,
          user_agent: subscriptionData.user_agent,
          is_active: true,
          muted_threads: this.mutedThreads,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;
      
      console.log('✅ Push subscription saved to database');
    } catch (error) {
      console.error('❌ Failed to save subscription:', error);
    }
  }

  /**
   * Remove push subscription from database
   */
  private async removeSubscription(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('push_subscriptions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user.id);

      if (error) throw error;

      console.log('✅ Push subscription removed from database');
    } catch (error) {
      console.error('❌ Failed to remove subscription:', error);
    }
  }

  /**
   * Mute a thread (no notifications for this thread)
   */
  async muteThread(threadId: string): Promise<boolean> {
    try {
      if (this.mutedThreads.includes(threadId)) {
        return true; // Already muted
      }

      this.mutedThreads.push(threadId);
      await this.updateMutedThreads();
      console.log('✅ Thread muted:', threadId);
      return true;
    } catch (error) {
      console.error('❌ Failed to mute thread:', error);
      return false;
    }
  }

  /**
   * Unmute a thread
   */
  async unmuteThread(threadId: string): Promise<boolean> {
    try {
      this.mutedThreads = this.mutedThreads.filter(id => id !== threadId);
      await this.updateMutedThreads();
      console.log('✅ Thread unmuted:', threadId);
      return true;
    } catch (error) {
      console.error('❌ Failed to unmute thread:', error);
      return false;
    }
  }

  /**
   * Check if a thread is muted
   */
  isThreadMuted(threadId: string): boolean {
    return this.mutedThreads.includes(threadId);
  }

  /**
   * Get all muted threads
   */
  getMutedThreads(): string[] {
    return [...this.mutedThreads];
  }

  /**
   * Update muted threads in database
   */
  private async updateMutedThreads(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('push_subscriptions')
        .update({ 
          muted_threads: this.mutedThreads,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user.id)
        .eq('is_active', true);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Failed to update muted threads:', error);
      throw error;
    }
  }

  /**
   * Check if we're in quiet hours
   */
  private async isQuietHours(): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('dnd_enabled, dnd_start_time, dnd_end_time')
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (!settings?.dnd_enabled || !settings.dnd_start_time || !settings.dnd_end_time) {
        return false;
      }

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const [startHour, startMin] = settings.dnd_start_time.split(':').map(Number);
      const [endHour, endMin] = settings.dnd_end_time.split(':').map(Number);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      // Handle overnight quiet hours (e.g., 22:00 to 07:00)
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime < endTime;
      }
      
      return currentTime >= startTime && currentTime < endTime;
    } catch (error) {
      console.error('❌ Failed to check quiet hours:', error);
      return false;
    }
  }

  /**
   * Check notification settings for a specific notification type
   */
  private async shouldNotify(notificationType: 'push_group_messages' | 'inapp_messages'): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data: settings } = await supabase
        .from('notification_settings')
        .select(notificationType)
        .eq('user_id', user.user.id)
        .maybeSingle();

      // Default to true if no settings found
      return settings?.[notificationType] ?? true;
    } catch (error) {
      console.error('❌ Failed to check notification settings:', error);
      return true; // Default to allowing notifications on error
    }
  }

  /**
   * Convert URL-safe base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray as Uint8Array<ArrayBuffer>;
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
 * Thread muting exports for easy access
 */
export const muteThread = (threadId: string) => pushNotificationManager.muteThread(threadId);
export const unmuteThread = (threadId: string) => pushNotificationManager.unmuteThread(threadId);
export const isThreadMuted = (threadId: string) => pushNotificationManager.isThreadMuted(threadId);
export const getMutedThreads = () => pushNotificationManager.getMutedThreads();

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
 * Notify user of new message (respects settings and quiet hours)
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

  // Check if thread is muted
  if (pushNotificationManager.isThreadMuted(threadId)) {
    console.log('🔇 Thread is muted, skipping notification');
    return;
  }

  // Check if we're in quiet hours
  if (await (pushNotificationManager as any).isQuietHours()) {
    console.log('🌙 Quiet hours active, skipping notification');
    return;
  }

  // Check user's notification preferences
  const notificationType = isGroup ? 'push_group_messages' : 'push_group_messages';
  if (!await (pushNotificationManager as any).shouldNotify(notificationType)) {
    console.log('⚙️ Notifications disabled in settings');
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