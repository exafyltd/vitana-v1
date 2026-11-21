/**
 * VTID-05659 — provider-agnostic crash-free session port (native Wave 3, lane crash-port).
 *
 * `NoopCrashProvider` is the only implementation until the owner chooses a crash
 * SDK (lane `crash-sdk-owner`). That follow-up implements `CrashProvider` and
 * installs it with `setCrashProvider()`; no caller changes. Same pattern as
 * `src/push/provider.ts` (`setPushProvider`).
 *
 * This module imports no SDK, makes no network call and holds no DSN or key.
 * A provider error is logged and swallowed: crash reporting must never throw
 * into the UI.
 */

export interface CrashProvider {
  /** False when the build has no crash backend (Noop, or a provider not configured). */
  isAvailable(): boolean;
  /** A foreground session began. */
  startSession(): void;
  /** The session ended; `crashed` is true when it ended in a crash. */
  endSession(crashed: boolean): void;
}

export const NoopCrashProvider: CrashProvider = {
  isAvailable: () => false,
  startSession: () => undefined,
  endSession: () => undefined,
};

let current: CrashProvider = NoopCrashProvider;
let active = false;

export function getCrashProvider(): CrashProvider {
  return current;
}

/** The crash-SDK lane installs its provider here. Tests install fakes. Resets the active session. */
export function setCrashProvider(provider: CrashProvider): void {
  current = provider;
  active = false;
}

/** True between `startSession()` and `endSession()`. */
export function isSessionActive(): boolean {
  return active;
}

function report(action: string, error: unknown): void {
  const reason = error instanceof Error ? error.message : String(error);
  console.warn(`[crash-port] provider ${action} failed: ${reason}`);
}

/** Run a provider call; swallow sync throws and async rejections. */
function guard(action: string, call: () => unknown): void {
  try {
    const result = call();
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      (result as PromiseLike<unknown>).then(undefined, (error: unknown) => report(action, error));
    }
  } catch (error) {
    report(action, error);
  }
}

/** Begin a session. A second start while one is active is ignored. */
export function startSession(): void {
  if (active) return;
  active = true;
  const provider = current;
  guard('startSession', () => provider.startSession());
}

/** End the session. Ignored when none is active. The session is closed even if the provider throws. */
export function endSession(crashed: boolean): void {
  if (!active) return;
  active = false;
  const provider = current;
  guard('endSession', () => provider.endSession(crashed));
}
