/**
 * Firebase Configuration & Cloud Messaging Init
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';

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

const app = initializeApp(firebaseConfig);
let messagingInstance: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) {
    console.warn('[Firebase] Messaging not supported in this browser');
    return null;
  }
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function requestFCMToken(swRegistration?: ServiceWorkerRegistration): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const messaging = await getMessagingInstance();
    if (!messaging) return null;
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
  return onMessage(messaging, callback);
}

export { app as firebaseApp };
