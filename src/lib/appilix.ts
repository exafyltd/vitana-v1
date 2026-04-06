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

// ── Native Notification Bridge ─────────────────────────────

/**
 * Ask the Appilix native shell to show a local notification.
 * This is the fallback when the browser Notification API is unavailable
 * or unreliable inside the WebView.
 */
export function showNativeNotification(title: string, body: string, data?: Record<string, unknown>): boolean {
  return post({ action: 'show_notification', title, body, data });
}

// ── Identity Registration ─────────────────────────────────

/**
 * Register the authenticated user's identity with the Appilix native shell.
 * This is the critical step that maps a Supabase user UUID to a physical device
 * so that push notifications via the Appilix Push API can find this user.
 */
export function registerAppilixIdentity(userId: string): boolean {
  if (!isAppilix()) {
    console.debug('[Appilix] Not in Appilix shell, skipping identity registration');
    return false;
  }
  console.log(`[Appilix] Registering user_identity: ${userId}`);
  try {
    window.appilix!.postMessage(JSON.stringify({
      type: "firebase_record_user_identity",
      props: { user_identity: userId }
    }));
    return true;
  } catch (e) {
    console.warn('[Appilix] Identity registration failed:', e);
    return false;
  }
}

/**
 * Wait for the Appilix native bridge (`window.appilix`) to become available.
 * The bridge may be injected after the WebView's initial page load.
 */
export function waitForAppilixBridge(timeoutMs = 5000, intervalMs = 100): Promise<boolean> {
  return new Promise((resolve) => {
    if (isAppilix()) { resolve(true); return; }
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += intervalMs;
      if (isAppilix()) { clearInterval(timer); resolve(true); return; }
      if (elapsed >= timeoutMs) { clearInterval(timer); resolve(false); }
    }, intervalMs);
  });
}

/**
 * Robustly register the user identity with the Appilix native shell.
 * Waits for the bridge to become available, then retries with exponential backoff.
 * This is critical for old users whose identity was never registered before this
 * code was deployed — when they next open the app, this ensures registration succeeds.
 */
export async function ensureAppilixIdentity(userId: string, maxRetries = 3): Promise<boolean> {
  const bridgeReady = await waitForAppilixBridge();
  if (!bridgeReady) {
    console.debug('[Appilix] Bridge not available after timeout, skipping identity registration');
    return false;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const success = registerAppilixIdentity(userId);
    if (success) {
      console.log(`[Appilix] Identity registered successfully (attempt ${attempt + 1})`);
      return true;
    }
    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
    console.warn(`[Appilix] Identity registration attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
    await new Promise(r => setTimeout(r, delay));
  }

  console.error('[Appilix] Identity registration failed after all retries');
  return false;
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
