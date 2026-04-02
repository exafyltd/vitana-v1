/**
 * Builds a serializable screen context payload for sending to the ai-chat edge function.
 * Called from service layers that don't have access to React hooks.
 *
 * Uses a global store that is updated by the ScreenContextBridge component
 * mounted inside the React tree.
 */

export interface ScreenContextPayload {
  screenId: string | null;
  screenName: string | null;
  module: string;
  moduleDescription: string;
  description: string | null;
  capabilities: string[];
  promptHint: string | null;
  previousScreen: string | null;
  navigationTrail: string | null;
  dwellSeconds: number;
  pathname: string;
}

/** Global store updated by ScreenContextBridge */
let _currentPayload: ScreenContextPayload | null = null;

/**
 * Called by ScreenContextBridge to keep the global state in sync.
 */
export function setScreenContextPayload(payload: ScreenContextPayload | null) {
  _currentPayload = payload;
}

/**
 * Returns the current screen context payload for injection into AI requests.
 * Returns null if no screen context is available (e.g., before React mounts).
 */
export function getScreenContextPayload(): ScreenContextPayload | null {
  return _currentPayload;
}
