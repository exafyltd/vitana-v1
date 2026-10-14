/**
 * VTID-05178 — push token registration and badge sync (N4-APP Change 10).
 *
 * - `registerPushToken(session)` posts
 *   `{ fcm_token, device_type: 'ios_native' | 'android_native', app_version }`
 *   to `/api/v1/notifications/token` (N4-GW stores the type and sets the
 *   device label itself). It runs after sign-in and on token refresh, and
 *   ONLY when the provider is available AND the remote flag `push_enabled`
 *   is on. With the Noop provider (until G2) it never makes a call.
 * - `unregisterPushToken(session)` sends `DELETE /token` for the token this
 *   install registered; N3 calls it before it clears the session.
 * - `syncBadge(session)` (on foreground): `GET /notifications/unread-count`,
 *   then `provider.setBadge(count)`. Same gate as registration.
 * - No permission prompt here: screen lanes call `requestPushPermission()`
 *   from the same UI points the web uses (TurnOnNotificationsCard,
 *   EnableRemindersPrompt).
 *
 * Nothing here throws to the caller: every outcome is a result value.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { config as buildConfig, requireUrl, type AppConfig } from '../config/env';
import { fetchWithTimeout, gatewayEndpoint, type FetchLike } from '../config/http';
import { currentAppVersion, currentPlatform, getAppFlags, type AppFlags, type NativePlatform } from '../config/remote-config';
import { getSession, subscribeSession, type SessionLike } from '../linking/auth-port';
import { getPushProvider, type PermissionStatus, type PushProvider } from './provider';

export const TOKEN_PATH = '/api/v1/notifications/token';
export const UNREAD_COUNT_PATH = '/api/v1/notifications/unread-count';
export const PUSH_TIMEOUT_MS = 10000;

export type NativeDeviceType = 'ios_native' | 'android_native';

export type PushResult =
  | { status: 'ok' }
  | { status: 'skipped'; reason: 'provider_unavailable' | 'push_disabled' | 'no_token' | 'no_session' | 'no_gateway' }
  | { status: 'error'; message: string };

export interface PushDeps {
  provider: () => PushProvider;
  flags: () => AppFlags;
  config: AppConfig;
  platform: NativePlatform;
  appVersion: string;
  fetchImpl: FetchLike;
  timeoutMs?: number;
}

export function deviceTypeFor(platform: NativePlatform): NativeDeviceType {
  return platform === 'ios' ? 'ios_native' : 'android_native';
}

export interface PushClient {
  registerPushToken(session: SessionLike | null, token?: string): Promise<PushResult>;
  unregisterPushToken(session: SessionLike | null): Promise<PushResult>;
  syncBadge(session: SessionLike | null): Promise<PushResult>;
  requestPushPermission(): Promise<PermissionStatus>;
  /** The token this install last registered (what DELETE revokes). */
  registeredToken(): string | null;
}

export function createPushClient(deps: PushDeps): PushClient {
  let registered: string | null = null;

  const gate = (session: SessionLike | null): PushResult | null => {
    if (!deps.provider().isAvailable()) return { status: 'skipped', reason: 'provider_unavailable' };
    if (!deps.flags().push_enabled) return { status: 'skipped', reason: 'push_disabled' };
    if (!session?.accessToken) return { status: 'skipped', reason: 'no_session' };
    return null;
  };

  const endpoint = (path: string): string | null => {
    try {
      return gatewayEndpoint(requireUrl(deps.config, 'gatewayUrl'), path);
    } catch {
      return null;
    }
  };

  const call = async (url: string, session: SessionLike, init: RequestInit): Promise<Response> =>
    fetchWithTimeout(
      deps.fetchImpl,
      url,
      {
        ...init,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
      deps.timeoutMs ?? PUSH_TIMEOUT_MS,
    );

  const errorOf = (e: unknown): PushResult => ({ status: 'error', message: e instanceof Error ? e.message : String(e) });

  return {
    async registerPushToken(session, refreshedToken) {
      const blocked = gate(session);
      if (blocked) return blocked;
      const url = endpoint(TOKEN_PATH);
      if (!url) return { status: 'skipped', reason: 'no_gateway' };
      try {
        const token = refreshedToken ?? (await deps.provider().getToken());
        if (!token) return { status: 'skipped', reason: 'no_token' };
        const res = await call(url, session as SessionLike, {
          method: 'POST',
          body: JSON.stringify({ fcm_token: token, device_type: deviceTypeFor(deps.platform), app_version: deps.appVersion }),
        });
        if (!res.ok) return { status: 'error', message: `token registration answered ${res.status}` };
        registered = token;
        return { status: 'ok' };
      } catch (e) {
        return errorOf(e);
      }
    },

    async unregisterPushToken(session) {
      // Only what this install registered: nothing registered → nothing to revoke, no call.
      if (!registered) return { status: 'skipped', reason: 'no_token' };
      if (!session?.accessToken) return { status: 'skipped', reason: 'no_session' };
      const url = endpoint(TOKEN_PATH);
      if (!url) return { status: 'skipped', reason: 'no_gateway' };
      try {
        const res = await call(url, session, { method: 'DELETE', body: JSON.stringify({ fcm_token: registered }) });
        if (!res.ok) return { status: 'error', message: `token revoke answered ${res.status}` };
        registered = null;
        return { status: 'ok' };
      } catch (e) {
        return errorOf(e);
      }
    },

    async syncBadge(session) {
      const blocked = gate(session);
      if (blocked) return blocked;
      const url = endpoint(UNREAD_COUNT_PATH);
      if (!url) return { status: 'skipped', reason: 'no_gateway' };
      try {
        const res = await call(url, session as SessionLike, { method: 'GET' });
        if (!res.ok) return { status: 'error', message: `unread-count answered ${res.status}` };
        const body = (await res.json()) as { count?: unknown };
        const count = typeof body?.count === 'number' && body.count >= 0 ? Math.floor(body.count) : 0;
        await deps.provider().setBadge(count);
        return { status: 'ok' };
      } catch (e) {
        return errorOf(e);
      }
    },

    requestPushPermission() {
      return deps.provider().requestPermission();
    },

    registeredToken: () => registered,
  };
}

let singleton: PushClient | null = null;

export function getPushClient(): PushClient {
  if (!singleton) {
    singleton = createPushClient({
      provider: getPushProvider,
      flags: getAppFlags,
      config: buildConfig,
      platform: currentPlatform(),
      appVersion: currentAppVersion(),
      fetchImpl: (input, init) => fetch(input, init),
    });
  }
  return singleton;
}

/** Test seam: replace (or reset with null) the app-wide client. */
export function setPushClient(client: PushClient | null): void {
  singleton = client;
}

/** For N3's post-sign-in hook. */
export function registerPushToken(session: SessionLike | null): Promise<PushResult> {
  return getPushClient().registerPushToken(session);
}

/** For N3's sign-out hook — call BEFORE clearing the session. */
export function unregisterPushToken(session: SessionLike | null): Promise<PushResult> {
  return getPushClient().unregisterPushToken(session);
}

export function syncBadge(session: SessionLike | null): Promise<PushResult> {
  return getPushClient().syncBadge(session);
}

/** For the screen lanes' notification prompts (never called at launch). */
export function requestPushPermission(): Promise<PermissionStatus> {
  return getPushClient().requestPushPermission();
}

/**
 * Mounted once in the root layout: re-registers on token refresh and syncs
 * the badge on sign-in and on every return to the foreground. Every call
 * passes the provider + `push_enabled` gate, so with the Noop provider this
 * does nothing.
 */
export function usePushLifecycle(): void {
  useEffect(() => {
    const client = getPushClient();
    const unsubRefresh = getPushProvider().onTokenRefresh((token) => {
      void client.registerPushToken(getSession(), token);
    });
    const unsubSession = subscribeSession((s) => {
      if (s) void client.syncBadge(s);
    });
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void client.syncBadge(getSession());
    });
    return () => {
      unsubRefresh();
      unsubSession();
      sub.remove();
    };
  }, []);
}
