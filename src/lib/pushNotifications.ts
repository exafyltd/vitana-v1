/**
 * Push Notification Manager — Firebase Cloud Messaging (FCM)
 * Unified web + Appilix native path. Tokens registered with Gateway backend.
 */
import { supabase } from '@/integrations/supabase/client';
import { requestFCMToken, onForegroundMessage } from './firebase';
import { isAppilix, requestNativeFcmToken } from '@/lib/appilix';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || 'https://gateway-86804897789.us-central1.run.app';

class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = false;
  private mutedThreads: string[] = [];
  private fcmToken: string | null = null;
  private foregroundCleanup: (() => void) | null = null;

  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'Notification' in window;
  }

  async initialize(): Promise<boolean> {
    await this.loadMutedThreads();
    if (isAppilix()) {
      console.log('[Push] Appilix detected — trying native push first');
      // Also register SW as fallback in case native FCM is not configured
      if (this.isSupported) {
        try {
          this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('[Push] Service Worker registered (Appilix fallback)');
        } catch {
          // WebView may not support SW — that's fine, native path is primary
        }
      }
      return true;
    }
    if (!this.isSupported) return false;
    try {
      this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[Push] Service Worker registered');
      return true;
    } catch (error) {
      console.error('[Push] SW registration failed:', error);
      return false;
    }
  }

  async subscribe(): Promise<string | null> {
    try {
      let token: string | null = null;
      let tokenSource: string = 'none';

      if (isAppilix()) {
        console.log('[Push] Appilix detected — attempting native FCM token...');
        token = await requestNativeFcmToken();
        if (token) {
          tokenSource = 'native';
          console.log('[Push] ✅ Native FCM token obtained from Appilix');
        } else {
          console.warn('[Push] ⚠️ Native FCM token failed — trying web FCM fallback...');
        }
      }

      if (!token && this.isSupported) {
        try {
          token = await requestFCMToken();
          if (token) {
            tokenSource = 'web';
            console.log('[Push] ✅ Web FCM token obtained' + (isAppilix() ? ' (Appilix fallback)' : ''));
            this.setupForegroundHandler();
          } else {
            console.warn('[Push] ⚠️ Web FCM returned null (permission denied or unsupported)');
          }
        } catch (webErr) {
          console.warn('[Push] ⚠️ Web FCM threw error (expected in WebView):', webErr);
        }
      }

      if (!token) {
        console.warn('[Push] ❌ No FCM token obtained — push notifications unavailable');
        if (isAppilix()) {
          console.warn('[Push] 💡 Ensure google-services.json is uploaded in Appilix dashboard');
        }
        return null;
      }

      this.fcmToken = token;
      console.log(`[Push] Token source: ${tokenSource}, registering with backend...`);
      await this.registerTokenWithBackend(token);
      return token;
    } catch (error) {
      console.error('[Push] Subscribe failed:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.fcmToken) return false;
    try {
      await this.removeTokenFromBackend(this.fcmToken);
      this.fcmToken = null;
      this.foregroundCleanup?.();
      this.foregroundCleanup = null;
      return true;
    } catch { return false; }
  }

  isSubscribed(): boolean { return this.fcmToken !== null; }

  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.isSupported || Notification.permission !== 'granted') return;
    try {
      if (this.registration?.showNotification) {
        await this.registration.showNotification(payload.title, {
          body: payload.body, icon: payload.icon || '/favicon.ico',
          badge: payload.badge, tag: payload.tag, data: payload.data,
        });
      } else {
        new Notification(payload.title, {
          body: payload.body, icon: payload.icon || '/favicon.ico',
          tag: payload.tag, data: payload.data,
        });
      }
    } catch {}
  }

  private async registerTokenWithBackend(token: string): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData?.session?.access_token;
    if (!jwt) return;
    const res = await fetch(`${GATEWAY_URL}/api/v1/notifications/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ fcm_token: token, device_label: navigator.userAgent.slice(0, 120) }),
    });
    if (!res.ok) console.error('[Push] Token registration failed:', res.status);
    else console.log('[Push] Token registered with backend');
  }

  private async removeTokenFromBackend(token: string): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData?.session?.access_token;
    if (!jwt) return;
    await fetch(`${GATEWAY_URL}/api/v1/notifications/token`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ fcm_token: token }),
    });
  }

  private setupForegroundHandler(): void {
    this.foregroundCleanup = onForegroundMessage((payload) => {
      if (!document.hidden && document.hasFocus()) return;
      const { title, body } = payload.notification || {};
      if (title) {
        this.showLocalNotification({ title, body: body || '', data: payload.data, tag: payload.data?.type || 'default' });
      }
    });
  }

  private async loadMutedThreads(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await (supabase as any)
        .from('user_notification_preferences')
        .select('muted_threads')
        .eq('user_id', user.user.id)
        .maybeSingle();
      if (data?.muted_threads) this.mutedThreads = data.muted_threads as string[];
    } catch {}
  }

  async muteThread(threadId: string): Promise<boolean> {
    if (this.mutedThreads.includes(threadId)) return true;
    this.mutedThreads.push(threadId);
    await this.persistMutedThreads();
    return true;
  }

  async unmuteThread(threadId: string): Promise<boolean> {
    this.mutedThreads = this.mutedThreads.filter(id => id !== threadId);
    await this.persistMutedThreads();
    return true;
  }

  isThreadMuted(threadId: string): boolean { return this.mutedThreads.includes(threadId); }
  getMutedThreads(): string[] { return [...this.mutedThreads]; }

  private async persistMutedThreads(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      await (supabase as any).from('user_notification_preferences').upsert({
        user_id: user.user.id, muted_threads: this.mutedThreads, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch {}
  }
}

export const pushNotificationManager = new PushNotificationManager();
export const muteThread = (threadId: string) => pushNotificationManager.muteThread(threadId);
export const unmuteThread = (threadId: string) => pushNotificationManager.unmuteThread(threadId);
export const isThreadMuted = (threadId: string) => pushNotificationManager.isThreadMuted(threadId);
export const getMutedThreads = () => pushNotificationManager.getMutedThreads();

export async function initializePushNotifications(): Promise<void> {
  try {
    const initialized = await pushNotificationManager.initialize();
    if (!initialized) return;
    await pushNotificationManager.subscribe();
  } catch (error) {
    console.error('[Push] Initialization failed:', error);
  }
}

export async function sendTestNotification(): Promise<void> {
  await pushNotificationManager.showLocalNotification({
    title: 'VITANA', body: 'Push notifications are working!', tag: 'test-notification',
  });
}

export async function notifyNewMessage(senderName: string, messagePreview: string, threadId: string, isGroup = false): Promise<void> {
  if (!document.hidden && document.hasFocus()) return;
  if (pushNotificationManager.isThreadMuted(threadId)) return;
  const title = isGroup ? `${senderName} in group` : senderName;
  const body = messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview;
  await pushNotificationManager.showLocalNotification({
    title, body, tag: `message-${threadId}`, data: { threadId, type: 'new_message', url: `/inbox?thread=${threadId}` },
  });
}
