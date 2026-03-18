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
    /** Push notification user identity — read by Appilix bridge at page load */
    appilix_push_notification_user_identity?: string;
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

// ── Push Identity Registration ────────────────────────────

/**
 * Actively register user identity with the Appilix native bridge.
 *
 * Appilix supports three passive methods (JS variable, cookie, URL param)
 * but reads them only at page-load time.  When the user logs in *after*
 * initial load (SPA flow), the passive methods are too late.
 *
 * This function:
 *  1. Sets the window variable (for same-page reads)
 *  2. Sets a persistent cookie (for next page-load)
 *  3. Sends a postMessage to the native bridge (immediate registration)
 *
 * Returns `true` when running inside the Appilix WebView.
 */
export function setUserIdentity(userId: string): boolean {
  if (typeof window === 'undefined') return false;

  // Method 1: window variable (Appilix doc method #2)
  (window as any).appilix_push_notification_user_identity = userId;

  // Method 2: cookie (Appilix doc method #3) — survives page reloads
  document.cookie = `appilix_push_notification_user_identity=${userId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

  // Method 3: postMessage to native bridge — immediate, no page reload needed
  if (isAppilix()) {
    // Try the update_settings channel (known to work for other settings)
    post({ action: 'update_settings', settings: { user_identity: userId } });
    console.log(`[Appilix] User identity registered via postMessage: ${userId.slice(0, 8)}…`);
    return true;
  }

  return false;
}

/**
 * Check whether the identity cookie was already set (i.e. a previous
 * session already wrote it).  Used to decide whether a reload is
 * necessary to let the Appilix bridge pick up the value.
 */
export function hasIdentityCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return /appilix_push_notification_user_identity=/.test(document.cookie);
}

// ── FCM Push Token Bridge ─────────────────────────────────

/**
 * Returns true when running inside the Appilix shell on an iOS device.
 * Handles modern iPads that report "MacIntel" with desktop-class UA strings
 * by also checking maxTouchPoints.
 */
export function isIOSApp(): boolean {
  if (!isAppilix()) return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isiPhoneLike = /iPhone|iPad|iPod/i.test(ua);
  const isiPadLikeDesktopUA = platform === 'MacIntel' && maxTouchPoints > 1;
  return isiPhoneLike || isiPadLikeDesktopUA;
}

/**
 * iOS App Store Guideline 3.1.1 compliance gate.
 * Returns true when digital purchases must be hidden.
 * Will remain true on iOS until a compliant IAP solution is implemented.
 */
export function isIAPRestricted(): boolean {
  return isIOSApp();
}

// ── FCM Push Token Bridge ─────────────────────────────────

export function getNativeFcmToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.appilix_fcm_token) return window.appilix_fcm_token;
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
