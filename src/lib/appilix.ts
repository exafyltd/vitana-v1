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
