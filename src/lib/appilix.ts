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
      /**
       * Native -> Web reply channel. Set this once to receive responses to
       * `appilix.postMessage(...)` requests (e.g. `firebase_token`).
       * The callback should null itself out after handling so it doesn't
       * intercept unrelated messages.
       */
      onmessage?: ((event: { data: string }) => void) | null;
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
 *
 * Sends via BOTH the documented appilix.postMessage bridge AND the direct
 * WKWebView messageHandlers channel, same redundancy as
 * requestNativeFcmTokenFromBridge() below — per that function's own finding,
 * which channel the native wrapper actually listens on differs between
 * wrapper builds and platforms (Android reliably uses appilix.postMessage;
 * iOS wrapper builds have been unreliable on that channel alone). This
 * message type has no delivery confirmation from the native side, so unlike
 * the FCM token bridge we can't detect a channel failing — sending on both
 * is the only mitigation available.
 */
export function registerAppilixIdentity(userId: string): boolean {
  if (!isAppilix()) {
    console.debug('[Appilix] Not in Appilix shell, skipping identity registration');
    return false;
  }
  console.log(`[Appilix] Registering user_identity: ${userId}`);
  const payload = JSON.stringify({
    type: "firebase_record_user_identity",
    props: { user_identity: userId }
  });
  let sent = false;
  try {
    window.appilix!.postMessage(payload);
    sent = true;
  } catch (e) {
    console.warn('[Appilix] Identity registration via appilix.postMessage failed:', e);
  }
  try {
    const handlers = (window as any).webkit?.messageHandlers;
    if (handlers?.appilix?.postMessage) {
      handlers.appilix.postMessage(payload);
      sent = true;
    }
  } catch (e) {
    console.warn('[Appilix] Identity registration via webkit.messageHandlers failed:', e);
  }
  return sent;
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

/**
 * Actively ask Appilix's native shell for the device's FCM token.
 *
 * Per Appilix support the iOS/Android wrapper exposes a JS bridge:
 *
 *   appilix.postMessage(JSON.stringify({ type: "firebase_token" }))
 *   appilix.onmessage = (event) => JSON.parse(event.data).token
 *
 * In practice the response delivery channel differs between wrapper
 * versions and platforms. The Android wrapper has been observed to reply
 * via `appilix.onmessage`. iOS may use `window.postMessage`, a custom
 * document event, set `window.appilix_fcm_token` directly, or call a
 * global callback we register. We listen on ALL of those simultaneously
 * and resolve on whichever fires first.
 *
 * Resolves with the token, or null if no channel responds within
 * timeoutMs.
 */
export async function requestNativeFcmTokenFromBridge(timeoutMs = 8000): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!isAppilix()) return null;

  const existing = getNativeFcmToken();
  if (existing) return existing;

  console.log('[Appilix] Requesting native FCM token via bridge…');

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const cleanups: Array<() => void> = [];

    const cleanup = () => {
      for (const fn of cleanups) {
        try { fn(); } catch {}
      }
    };

    const finish = (value: string | null, source: string) => {
      if (settled) return;
      settled = true;
      console.log(`[Appilix] FCM token bridge settled via ${source} (token=${value ? 'present' : 'null'})`);
      cleanup();
      resolve(value);
    };

    const extractToken = (raw: unknown): string | null => {
      if (raw == null) return null;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return parsed?.token || parsed?.firebase_token || parsed?.fcm_token || null;
        } catch {
          return /^[\w:_-]{20,}$/.test(raw) ? raw : null;
        }
      }
      if (typeof raw === 'object') {
        const o = raw as Record<string, any>;
        return o.token || o.firebase_token || o.fcm_token || o.data?.token || null;
      }
      return null;
    };

    const captureToken = (token: string | null, source: string) => {
      if (!token || typeof token !== 'string') return;
      window.appilix_fcm_token = token;
      try {
        document.dispatchEvent(new CustomEvent('appilix:fcm_token', { detail: token }));
      } catch {}
      finish(token, source);
    };

    // Channel 1: window.appilix.onmessage (Appilix's documented bridge).
    if (window.appilix) {
      const previous = window.appilix.onmessage;
      window.appilix.onmessage = (event: { data: string }) => {
        const token = extractToken(event?.data);
        if (token) captureToken(token, 'appilix.onmessage');
      };
      cleanups.push(() => {
        if (window.appilix) window.appilix.onmessage = previous ?? null;
      });
    }

    // Channel 2: standard window.postMessage events (some WKWebView builds
    // deliver native replies as MessageEvents).
    const onWindowMessage = (event: MessageEvent) => {
      const token = extractToken(event?.data);
      if (token) captureToken(token, 'window.message');
    };
    window.addEventListener('message', onWindowMessage);
    cleanups.push(() => window.removeEventListener('message', onWindowMessage));

    // Channel 3: document custom events under any of the plausible names.
    const eventNames = ['appilix:firebase_token', 'appilix:fcm_token', 'firebase:token'];
    const onCustomEvent = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      const token = typeof detail === 'string' ? detail : extractToken(detail);
      if (token) captureToken(token, `event:${evt.type}`);
    };
    for (const name of eventNames) {
      document.addEventListener(name, onCustomEvent);
      cleanups.push(() => document.removeEventListener(name, onCustomEvent));
    }

    // Channel 4: a global callback the native side may invoke directly.
    const previousGlobalCallback = (window as any).appilixOnFirebaseToken;
    (window as any).appilixOnFirebaseToken = (token: unknown) => {
      const t = typeof token === 'string' ? token : extractToken(token);
      if (t) captureToken(t, 'window.appilixOnFirebaseToken');
    };
    cleanups.push(() => {
      (window as any).appilixOnFirebaseToken = previousGlobalCallback;
    });

    // Channel 5: poll window.appilix_fcm_token in case the native side sets
    // it asynchronously without firing any event.
    const poll = window.setInterval(() => {
      const t = window.appilix_fcm_token;
      if (t) captureToken(t, 'window.appilix_fcm_token (poll)');
    }, 250);
    cleanups.push(() => window.clearInterval(poll));

    // Fire the request through both the appilix.postMessage channel and the
    // WKWebView messageHandlers channel (some wrapper builds use one, some
    // the other).
    try {
      window.appilix?.postMessage(JSON.stringify({ type: 'firebase_token' }));
    } catch (err) {
      console.warn('[Appilix] postMessage(firebase_token) failed:', err);
    }
    try {
      const handlers = (window as any).webkit?.messageHandlers;
      if (handlers?.appilix?.postMessage) {
        handlers.appilix.postMessage(JSON.stringify({ type: 'firebase_token' }));
      }
    } catch {
      // Best effort — ignore
    }

    window.setTimeout(() => finish(null, 'timeout'), timeoutMs);
  });
}
