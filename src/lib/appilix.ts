/**
 * Appilix Bridge Utility
 * 
 * Provides typed wrappers for the Appilix WebView shell's native APIs.
 * The Appilix native app injects a global `appilix` object into the WebView
 * that exposes a `postMessage(json)` method for communication.
 */

declare global {
  interface Window {
    appilix?: {
      postMessage: (message: string) => void;
    };
    /** Native FCM token injected by Appilix before page load */
    appilix_fcm_token?: string;
  }
}

// ── Detection ──────────────────────────────────────────────

/** Returns true when running inside the Appilix WebView shell. */
export function isAppilix(): boolean {
  return typeof window !== 'undefined' && !!window.appilix?.postMessage;
}

// ── Post Message Helpers ───────────────────────────────────

function post(payload: Record<string, unknown>): boolean {
  if (!isAppilix()) return false;
  try {
    window.appilix!.postMessage(JSON.stringify(payload));
    return true;
  } catch (e) {
    console.warn('[Appilix] postMessage failed:', e);
    return false;
  }
}

// ── Public API ─────────────────────────────────────────────

/** Open the native navigation drawer. */
export function openDrawer(): boolean {
  // Try new postMessage API first
  if (post({ action: 'open_drawer' })) return true;
  // Fallback: legacy URL scheme
  try {
    window.location.href = 'appilix-drawer://open';
    return true;
  } catch {
    return false;
  }
}

/** Navigate backward, forward, or reload. */
export function navigate(direction: 'backward' | 'forward' | 'reload'): boolean {
  return post({ action: 'navigate', direction });
}

/** Update Appilix runtime settings (e.g., App Bar visibility, colors). */
export function updateSettings(settings: Record<string, unknown>): boolean {
  return post({ action: 'update_settings', settings });
}

/** Trigger native share dialog. */
export function share(text: string, subject?: string): boolean {
  return post({ action: 'share', text, subject });
}

/** Open a URL in the device's external browser. */
export function launchExternal(url: string): boolean {
  return post({ action: 'launch_external', url });
}

/**
 * Force the App Bar and Navigation Drawer to be visible.
 * This is the key call that fixes the hamburger icon race condition.
 */
export function forceAppBarVisibility(): boolean {
  return updateSettings({
    app_bar: true,
    navigation_drawer: true,
    show_menu_icon: true,
  });
}

/**
 * Hide the native Appilix App Bar and Navigation Drawer.
 * Called when the React-based TopAppBar + SideDrawerNav takes over.
 */
export function hideAppilixAppBar(): boolean {
  return updateSettings({
    app_bar: false,
    navigation_drawer: false,
    show_menu_icon: false,
  });
}

/**
 * Set the native status bar style (background color and icon tint).
 */
export function setStatusBarStyle(background: string, lightContent: boolean): boolean {
  return updateSettings({
    status_bar_color: background,
    status_bar_style: lightContent ? 'light-content' : 'dark-content',
  });
}

// ── FCM Push Token Bridge ─────────────────────────────────

export function getNativeFcmToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check window global (set by early script or Custom JS)
  if (window.appilix_fcm_token) return window.appilix_fcm_token;

  // 2. Check URL params (?fcm_token=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('fcm_token');
    if (urlToken) {
      window.appilix_fcm_token = urlToken;
      return urlToken;
    }
  } catch {}

  return null;
}

export function requestNativeFcmToken(): Promise<string | null> {
  const preInjected = getNativeFcmToken();
  if (preInjected) {
    console.log('[Appilix] Using pre-injected FCM token');
    return Promise.resolve(preInjected);
  }

  // Even if appilix bridge not detected, still poll — Custom JS may inject token later
  const MAX_WAIT = 10_000; // 10 seconds (Custom JS timing is unpredictable)
  const INTERVAL = 500;

  console.log('[Appilix] Waiting for FCM token (polling + events, up to 10s)...');

  return new Promise((resolve) => {
    let resolved = false;
    const cleanup = () => {
      resolved = true;
      clearInterval(poller);
      clearTimeout(timeout);
      window.removeEventListener('message', msgHandler);
      document.removeEventListener('appilix:fcm_token', customHandler as EventListener);
    };

    // Timeout
    const timeout = setTimeout(() => {
      if (resolved) return;
      console.warn('[Appilix] FCM token not received after 10s — add token injection script in Appilix Dashboard → Custom CSS & JS');
      cleanup();
      resolve(null);
    }, MAX_WAIT);

    // Poll window global
    const poller = setInterval(() => {
      if (resolved) return;
      const token = getNativeFcmToken();
      if (token) {
        console.log('[Appilix] FCM token detected via polling');
        cleanup();
        resolve(token);
      }
    }, INTERVAL);

    // Listen for window.postMessage
    function msgHandler(event: MessageEvent) {
      if (resolved) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'fcm_token' && data.token) {
          window.appilix_fcm_token = data.token;
          console.log('[Appilix] FCM token from postMessage');
          cleanup();
          resolve(data.token);
        }
      } catch {}
    }

    // Listen for custom DOM event
    function customHandler(e: Event) {
      if (resolved) return;
      const token = (e as CustomEvent).detail;
      if (token) {
        window.appilix_fcm_token = token;
        console.log('[Appilix] FCM token from custom event');
        cleanup();
        resolve(token);
      }
    }

    window.addEventListener('message', msgHandler);
    document.addEventListener('appilix:fcm_token', customHandler as EventListener);

    // Also try the bridge postMessage (may work if Appilix supports it)
    post({ action: 'get_fcm_token' });
  });
}
