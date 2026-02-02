/**
 * Realtime Debounce Utility
 * 
 * Prevents cascade refetches when multiple realtime events fire rapidly.
 * Uses a shared debounce mechanism to batch invalidations.
 */

type DebouncedFn = (...args: any[]) => void;

const debounceTimers = new Map<string, NodeJS.Timeout>();

/**
 * Creates a debounced version of a callback for realtime handlers.
 * Uses a shared key to prevent multiple handlers from triggering rapid refetches.
 * 
 * @param key - Unique key for this debounce group
 * @param fn - Function to debounce
 * @param delayMs - Debounce delay in milliseconds (default: 2000ms)
 */
export function createRealtimeDebounce<T extends DebouncedFn>(
  key: string,
  fn: T,
  delayMs: number = 2000
): T {
  return ((...args: any[]) => {
    // Clear existing timer for this key
    const existingTimer = debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      debounceTimers.delete(key);
      fn(...args);
    }, delayMs);

    debounceTimers.set(key, timer);
  }) as T;
}

/**
 * Hook-friendly debounce that returns a stable callback.
 * Call this once in your component/hook setup, not on every render.
 */
export function debounceCallback<T extends DebouncedFn>(
  fn: T,
  delayMs: number = 2000
): T {
  let timer: NodeJS.Timeout | null = null;

  return ((...args: any[]) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  }) as T;
}

/**
 * Cleans up all pending debounce timers.
 * Call this in cleanup/unmount if needed.
 */
export function clearAllRealtimeDebounce(): void {
  debounceTimers.forEach((timer) => clearTimeout(timer));
  debounceTimers.clear();
}

/**
 * Check if tab is visible - use this to skip operations when hidden.
 */
export function isTabVisible(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible';
}
