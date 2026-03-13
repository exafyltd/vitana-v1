/**
 * Push Notification Manager — Firebase Cloud Messaging (FCM)
 * Web push + Appilix device metadata registration.
 * Tokens registered with Gateway backend.
 */
import { supabase } from '@/integrations/supabase/client';
import { requestFCMToken, onForegroundMessage } from './firebase';
import { isAppilix, getNativeFcmToken } from '@/lib/appilix';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

const RAW_GATEWAY_BASE = (import.meta.env.VITE_GATEWAY_BASE || 'https://gateway-q74ibpv6ia-uc.a.run.app').replace(/\/+$/, '');
const GATEWAY_API_BASE = RAW_GATEWAY_BASE.endsWith('/api/v1')
  ? RAW_GATEWAY_BASE
  : `${RAW_GATEWAY_BASE}/api/v1`;

class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = false;
  private mutedThreads: string[] = [];
  private fcmToken: string | null = null;
  private foregroundCleanup: (() => void) | null = null;
  private appilixTokenListenerAttached = false;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
  }

  async initialize(): Promise<boolean> {
    await this.loadMutedThreads();

    if (!this.isSupported) {
      if (isAppilix()) {
        console.log('[Push] Appilix detected — SW not supported in this WebView, will register device metadata');
        return true;
      }
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[Push] Service Worker registered');

      // Force browser to check for updated SW script (fixes stale cached versions)
      this.registration.update().catch(() => {});

      return true;
    } catch (error) {
      console.error('[Push] SW registration failed:', error);
      if (isAppilix()) {
        console.log('[Push] SW failed but Appilix detected — will register device metadata');
        return true;
      }
      return false;
    }
  }

  async subscribe(): Promise<string | null> {
    try {
      let token: string | null = null;

      this.attachAppilixTokenListener();

      // For Appilix: register device metadata for backend routing,
      // then consume pre-injected native token when available.
      if (isAppilix()) {
        console.log('[Push] Appilix device — registering metadata for backend routing');
        await this.registerAppilixDevice();

        const nativeToken = getNativeFcmToken();
        if (nativeToken) {
          token = nativeToken;
          console.log('[Push] ✅ Native Appilix FCM token detected');
        } else {
          console.warn('[Push] Appilix detected but native FCM token not available yet');
        }
      }

      // Attempt web FCM (works in browsers, may work in some WebViews)
      if (!token && this.isSupported) {
        try {
          console.log('[Push] Trying web FCM...');
          token = await requestFCMToken(this.registration || undefined);
          if (token) {
            console.log('[Push] ✅ Web FCM token obtained');
          } else {
            console.warn('[Push] ⚠️ Web FCM returned null (permission denied or unsupported)');
          }
        } catch (webErr) {
          console.warn('[Push] ⚠️ Web FCM error (expected in some WebViews):', webErr);
        }
      }

      if (!token) {
        if (isAppilix()) {
          console.log('[Push] Waiting for native Appilix FCM token event for final registration');
        } else {
          console.warn('[Push] ❌ No FCM token — push notifications unavailable');
        }
        return null;
      }

      this.fcmToken = token;
      console.log('[Push] FCM token obtained, registering with gateway...', `${GATEWAY_API_BASE}/notifications/token`);
      await this.registerTokenWithBackend(token);
      await this.setupForegroundHandler();
      this.startTokenRefreshMonitor();
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
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
      return true;
    } catch {
      return false;
    }
  }

  isSubscribed(): boolean {
    return this.fcmToken !== null;
  }

  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.isSupported || Notification.permission !== 'granted') return;
    try {
      if (this.registration?.showNotification) {
        await this.registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          badge: payload.badge,
          tag: payload.tag,
          data: payload.data,
        });
      } else {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/favicon.ico',
          tag: payload.tag,
          data: payload.data,
        });
      }
    } catch {}
  }

  private async getAuthToken(maxRetries = 6, retryDelayMs = 300): Promise<string | null> {
    for (let i = 0; i < maxRetries; i++) {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;
      if (jwt) return jwt;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
    return null;
  }

  private async registerTokenWithBackend(token: string): Promise<void> {
    const jwt = await this.getAuthToken();
    if (!jwt) {
      console.error('[Push] Token registration skipped: missing auth session token');
      return;
    }

    const res = await fetch(`${GATEWAY_API_BASE}/notifications/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ fcm_token: token, device_label: navigator.userAgent.slice(0, 120) }),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => 'no response body');
      console.error('[Push] Token registration failed:', res.status, details);
    } else {
      console.log('[Push] ✅ Token registered with backend');
    }
  }

  /**
   * Register Appilix device metadata with the backend.
   * This tells the gateway that this user has an Appilix-installed app,
   * so the backend can route notifications via Appilix Push API or FCM topic.
   */
  private async registerAppilixDevice(): Promise<void> {
    const jwt = await this.getAuthToken();
    if (!jwt) {
      console.warn('[Push] Appilix registration skipped: missing auth session token');
      return;
    }

    try {
      const res = await fetch(`${GATEWAY_API_BASE}/notifications/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          device_type: 'appilix',
          package_name: 'com.vitanaland.app',
          device_label: `Appilix ${navigator.userAgent.slice(0, 80)}`,
        }),
      });

      if (!res.ok) {
        const details = await res.text().catch(() => 'no response body');
        console.warn('[Push] Appilix device registration returned:', res.status, details);
      } else {
        console.log('[Push] ✅ Appilix device metadata registered with backend');
      }
    } catch (err) {
      console.warn('[Push] Appilix device registration failed (network):', err);
    }
  }

  private async removeTokenFromBackend(token: string): Promise<void> {
    const jwt = await this.getAuthToken();
    if (!jwt) {
      console.warn('[Push] Token removal skipped: missing auth session token');
      return;
    }

    await fetch(`${GATEWAY_API_BASE}/notifications/token`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ fcm_token: token }),
    });
  }

  private setupForegroundHandler(): void {
    if (this.foregroundCleanup) return;

    const shownTags = new Set<string>();
    this.foregroundCleanup = onForegroundMessage((payload) => {
      // App is focused — skip notification display entirely
      if (!document.hidden && document.hasFocus()) return;

      const notif = payload.notification || {};
      const data = payload.data || {};

      // Extract sender name from data payload for better notification titles
      const senderName = data.sender_name || data.senderName || data.sender || data.from_name || data.fromName;
      const title = senderName || notif.title || data.title || 'Vitana';
      const body = notif.body || data.body || data.message || '';

      // Stable tag for deduplication
      const tag =
        data.message_id ||
        data.messageId ||
        (data.thread_id ? `thread-${data.thread_id}` : null) ||
        (data.threadId ? `thread-${data.threadId}` : null) ||
        data.tag ||
        'fg-' + Date.now();

      if (shownTags.has(tag)) return;
      shownTags.add(tag);
      setTimeout(() => shownTags.delete(tag), 5000);

      if (title) {
        this.showLocalNotification({ title, body, data, tag });
      }
    });
  }

  private attachAppilixTokenListener(): void {
    if (this.appilixTokenListenerAttached || typeof document === 'undefined') return;

    const handler = async (event: Event) => {
      const token = (event as CustomEvent<string>).detail;
      if (!token || token === this.fcmToken) return;

      console.log('[Push] Received Appilix native FCM token event, registering with gateway...');
      this.fcmToken = token;
      await this.registerTokenWithBackend(token);
    };

    document.addEventListener('appilix:fcm_token', handler as EventListener);
    this.appilixTokenListenerAttached = true;
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
    this.mutedThreads = this.mutedThreads.filter((id) => id !== threadId);
    await this.persistMutedThreads();
    return true;
  }

  isThreadMuted(threadId: string): boolean {
    return this.mutedThreads.includes(threadId);
  }
  getMutedThreads(): string[] {
    return [...this.mutedThreads];
  }

  private async persistMutedThreads(): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      await (supabase as any)
        .from('user_notification_preferences')
        .upsert(
          {
            user_id: user.user.id,
            muted_threads: this.mutedThreads,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
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
    title: 'VITANA',
    body: 'Push notifications are working!',
    tag: 'test-notification',
  });
}

export async function notifyNewMessage(
  senderName: string,
  messagePreview: string,
  threadId: string,
  isGroup = false
): Promise<void> {
  if (!document.hidden && document.hasFocus()) return;
  if (pushNotificationManager.isThreadMuted(threadId)) return;
  const title = isGroup ? `${senderName} in group` : senderName;
  const body = messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview;
  await pushNotificationManager.showLocalNotification({
    title,
    body,
    tag: `message-${threadId}`,
    data: { threadId, type: 'new_message', url: `/inbox?thread=${threadId}` },
  });
}
