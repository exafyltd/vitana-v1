/**
 * Firebase Configuration & Cloud Messaging Init
 *
 * firebase/app and firebase/messaging are dynamic-imported on first use so
 * the Firebase SDK stays out of the main bundle and initializeApp() no longer
 * runs at boot for every visitor — it only loads when push messaging is
 * actually requested (permission granted or Appilix subscribe).
 */
import type { Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCthnpKTnUPpC8d-_bLt3DKz9VCQ8eiwnc",
  authDomain: "lovable-vitana-vers1.firebaseapp.com",
  projectId: "lovable-vitana-vers1",
  storageBucket: "lovable-vitana-vers1.firebasestorage.app",
  messagingSenderId: "86804897789",
  appId: "1:86804897789:web:348bb41ad5025632c14394",
  measurementId: "G-B6BNC02MGK",
};

const VAPID_KEY = 'BK_lu3UlVM0UwMJ23a7KIcoKar2-XFVrqyuxmrkfx0ssCTQmsBgtgn-C0_lXhwrM55cBA8iU64zkRDOsz9D5vbE';

let messagingInstance: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const { getMessaging, isSupported } = await import('firebase/messaging');
  const supported = await isSupported();
  if (!supported) {
    console.warn('[Firebase] Messaging not supported in this browser');
    return null;
  }
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function requestFCMToken(swRegistration?: ServiceWorkerRegistration): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const messaging = await getMessagingInstance();
    if (!messaging) return null;
    const { getToken } = await import('firebase/messaging');
    const tokenOptions: { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = { vapidKey: VAPID_KEY };
    if (swRegistration) {
      tokenOptions.serviceWorkerRegistration = swRegistration;
    }
    const token = await getToken(messaging, tokenOptions);
    console.log('[Firebase] FCM token obtained');
    return token;
  } catch (err) {
    console.error('[Firebase] Failed to get FCM token:', err);
    return null;
  }
}

export async function onForegroundMessage(callback: (payload: any) => void): Promise<(() => void) | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;
  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, callback);
}
