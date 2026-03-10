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
  if (typeof window !== 'undefined' && window.appilix_fcm_token) {
    return window.appilix_fcm_token;
  }
  return null;
}

export function requestNativeFcmToken(): Promise<string | null> {
  const preInjected = getNativeFcmToken();
  if (preInjected) {
    console.log('[Appilix] Using pre-injected FCM token');
    return Promise.resolve(preInjected);
  }
  if (!isAppilix()) return Promise.resolve(null);

  console.log('[Appilix] Requesting native FCM token via bridge...');
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[Appilix] Native FCM token request timed out after 5s — is google-services.json configured in Appilix dashboard?');
      window.removeEventListener('message', handler);
      resolve(null);
    }, 5000);

    function handler(event: MessageEvent) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'fcm_token' && data.token) {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          window.appilix_fcm_token = data.token;
          resolve(data.token);
        }
      } catch {}
    }

    window.addEventListener('message', handler);
    post({ action: 'get_fcm_token' });
  });
}
