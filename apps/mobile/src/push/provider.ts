/**
 * VTID-05178 — provider-neutral push port (Native app Wave 1, N4-APP Change 10).
 *
 * `NoopPushProvider` is the only implementation until gate G2 passes. N4-FCM
 * (its own VTID, after G2) implements this interface with
 * `@react-native-firebase/messaging` and installs it with `setPushProvider()`;
 * no caller changes. No Firebase package, no expo-notifications and no
 * google-services file is part of N4-APP.
 */

export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/** A notification the member tapped (or one that arrived in the foreground). */
export interface PushOpen {
  /** The FCM data payload: `url`, or Appilix's `open_link_url`, among others. */
  data: Record<string, unknown>;
}

export interface PushProvider {
  /** False when the build has no push backend (Noop, or a provider not configured). */
  isAvailable(): boolean;
  getToken(): Promise<string | null>;
  onTokenRefresh(listener: (token: string) => void): () => void;
  /** Called only from the same UI points the web uses, never at launch. */
  requestPermission(): Promise<PermissionStatus>;
  /** The push that launched the app from a cold start, if any. */
  getInitialOpen(): Promise<PushOpen | null>;
  onOpen(listener: (open: PushOpen) => void): () => void;
  onForegroundMessage(listener: (message: PushOpen) => void): () => void;
  setBadge(count: number): Promise<void>;
}

const noop = () => undefined;

export const NoopPushProvider: PushProvider = {
  isAvailable: () => false,
  getToken: async () => null,
  onTokenRefresh: () => noop,
  requestPermission: async () => 'unavailable',
  getInitialOpen: async () => null,
  onOpen: () => noop,
  onForegroundMessage: () => noop,
  setBadge: async () => undefined,
};

let current: PushProvider = NoopPushProvider;

export function getPushProvider(): PushProvider {
  return current;
}

/** N4-FCM installs its provider here (after G2). Tests install fakes. */
export function setPushProvider(provider: PushProvider): void {
  current = provider;
}
