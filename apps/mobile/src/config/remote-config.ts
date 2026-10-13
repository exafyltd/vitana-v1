/**
 * VTID-05178 — remote config client (Native app Wave 1, N4-APP Change 9).
 *
 * Reads `GET <gateway>/api/v1/app-config` (N4-GW): per-platform flags and the
 * minimum supported version. The URL is built only through
 * `requireUrl(config, 'gatewayUrl')`, so a build without a G1 gateway URL
 * makes no network call at all and a production or staging host throws
 * (env.ts).
 *
 * Fail-safe, never blocking:
 * - no gateway URL, a network error, a timeout, a non-200 (the gateway answers
 *   503 when it cannot check its kill switches) or an invalid body → the
 *   cached last good config if it is younger than 7 days, otherwise the
 *   built-in defaults (every flag off, minimum version 0.0.0);
 * - fetched on launch and on return to the foreground, at most once per
 *   `ttl_seconds`.
 *
 * Validation is hand-written instead of zod so N4-APP adds no dependency
 * (Wave 0 lockfile rule): unknown flags are ignored, a missing flag is false,
 * and only the literal `true` turns a flag on.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { config as buildConfig, requireUrl, type AppConfig } from './env';
import { fetchWithTimeout, gatewayEndpoint, type FetchLike } from './http';
import { getKeyValueStore, type KeyValueStore } from './kv-store';
import { compareVersions, isVersion } from './version';

export const APP_CONFIG_PATH = '/api/v1/app-config';
export const APP_CONFIG_SCHEMA_VERSION = 1;
export const CACHE_KEY = 'vitana.native.app_config.v1';
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_TTL_SECONDS = 300;
export const FETCH_TIMEOUT_MS = 3000;

/** Every flag the app knows. A flag the gateway sends that is not here is ignored. */
export const KNOWN_FLAGS = ['push_enabled', 'health_sync_enabled', 'orb_native_enabled'] as const;
export type FlagName = (typeof KNOWN_FLAGS)[number];
export type AppFlags = Record<FlagName, boolean>;

export type NativePlatform = 'ios' | 'android';

export interface PlatformConfig {
  min_supported_version: string;
  recommended_version: string | null;
  update_url: string | null;
  flags: AppFlags;
}

export type ConfigSource = 'remote' | 'cache' | 'default';

export interface RemoteConfigState {
  platformConfig: PlatformConfig;
  source: ConfigSource;
  /** When the config in use was fetched (ms epoch); null for the defaults. */
  fetchedAt: number | null;
  ttlSeconds: number;
}

export interface AppConfigView {
  flags: AppFlags;
  updateRequired: boolean;
  updateRecommended: boolean;
  updateUrl: string | null;
  source: ConfigSource;
}

export function defaultFlags(): AppFlags {
  return Object.fromEntries(KNOWN_FLAGS.map((f) => [f, false])) as AppFlags;
}

export function defaultPlatformConfig(): PlatformConfig {
  return { min_supported_version: '0.0.0', recommended_version: null, update_url: null, flags: defaultFlags() };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** An https URL for the store page, or null. Anything else is dropped. */
function parseUpdateUrl(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 2048) return null;
  return /^https:\/\/[^\s/?#@]+(\/[^\s]*)?$/.test(v) ? v : null;
}

/** Validates one platform block. Null when the block is unusable. */
export function parsePlatformConfig(raw: unknown): PlatformConfig | null {
  if (!isObject(raw)) return null;
  if (!isVersion(raw.min_supported_version)) return null;
  const flags = defaultFlags();
  if (raw.flags !== undefined && !isObject(raw.flags)) return null;
  const rawFlags = (raw.flags ?? {}) as Record<string, unknown>;
  for (const f of KNOWN_FLAGS) flags[f] = rawFlags[f] === true;
  return {
    min_supported_version: raw.min_supported_version,
    recommended_version: isVersion(raw.recommended_version) ? raw.recommended_version : null,
    update_url: parseUpdateUrl(raw.update_url),
    flags,
  };
}

/** Validates the whole response body for this platform. Null when invalid. */
export function parseAppConfigResponse(
  body: unknown,
  platform: NativePlatform,
): { platformConfig: PlatformConfig; ttlSeconds: number } | null {
  if (!isObject(body) || body.ok !== true) return null;
  if (body.schema_version !== APP_CONFIG_SCHEMA_VERSION) return null;
  if (!isObject(body.platforms)) return null;
  const platformConfig = parsePlatformConfig(body.platforms[platform]);
  if (!platformConfig) return null;
  const ttl = body.ttl_seconds;
  const ttlSeconds = typeof ttl === 'number' && Number.isFinite(ttl) && ttl >= 30 && ttl <= 86400 ? ttl : DEFAULT_TTL_SECONDS;
  return { platformConfig, ttlSeconds };
}

/** What the app shows for a state: flags plus the update gate for this app version. */
export function deriveView(state: RemoteConfigState, appVersion: string): AppConfigView {
  const pc = state.platformConfig;
  const version = isVersion(appVersion) ? appVersion : '0.0.0';
  const updateRequired = compareVersions(version, pc.min_supported_version) < 0;
  const updateRecommended =
    !updateRequired && pc.recommended_version !== null && compareVersions(version, pc.recommended_version) < 0;
  return { flags: { ...pc.flags }, updateRequired, updateRecommended, updateUrl: pc.update_url, source: state.source };
}

interface CacheEntry {
  fetched_at: number;
  ttl_seconds: number;
  platform: NativePlatform;
  config: PlatformConfig;
}

export interface RemoteConfigDeps {
  config: AppConfig;
  platform: NativePlatform;
  store: KeyValueStore;
  fetchImpl: FetchLike;
  now: () => number;
  timeoutMs?: number;
}

export interface RemoteConfigClient {
  getState(): RemoteConfigState;
  /** Fetches when the TTL has passed (or `force`). Never throws. */
  refresh(opts?: { force?: boolean }): Promise<RemoteConfigState>;
  subscribe(listener: () => void): () => void;
}

export function createRemoteConfigClient(deps: RemoteConfigDeps): RemoteConfigClient {
  const listeners = new Set<() => void>();
  let lastAttemptAt: number | null = null;
  let inFlight: Promise<RemoteConfigState> | null = null;

  const defaults = (): RemoteConfigState => ({
    platformConfig: defaultPlatformConfig(),
    source: 'default',
    fetchedAt: null,
    ttlSeconds: DEFAULT_TTL_SECONDS,
  });

  const readCache = (): RemoteConfigState | null => {
    let raw: string | null;
    try {
      raw = deps.store.getItem(CACHE_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const entry = JSON.parse(raw) as CacheEntry;
      if (entry.platform !== deps.platform || typeof entry.fetched_at !== 'number') return null;
      if (deps.now() - entry.fetched_at > CACHE_MAX_AGE_MS) return null;
      const platformConfig = parsePlatformConfig(entry.config);
      if (!platformConfig) return null;
      const ttlSeconds = typeof entry.ttl_seconds === 'number' ? entry.ttl_seconds : DEFAULT_TTL_SECONDS;
      return { platformConfig, source: 'cache', fetchedAt: entry.fetched_at, ttlSeconds };
    } catch {
      return null;
    }
  };

  const fallback = (): RemoteConfigState => readCache() ?? defaults();

  let state: RemoteConfigState = fallback();

  const set = (next: RemoteConfigState) => {
    state = next;
    listeners.forEach((l) => l());
  };

  const fetchOnce = async (): Promise<RemoteConfigState> => {
    let url: string;
    try {
      url = gatewayEndpoint(requireUrl(deps.config, 'gatewayUrl'), APP_CONFIG_PATH);
    } catch {
      // No G1 gateway URL in this build (or a refused host): no network call.
      set(fallback());
      return state;
    }
    try {
      const res = await fetchWithTimeout(
        deps.fetchImpl,
        url,
        { method: 'GET', headers: { Accept: 'application/json' } },
        deps.timeoutMs ?? FETCH_TIMEOUT_MS,
      );
      if (res.status !== 200) throw new Error(`app-config answered ${res.status}`);
      const parsed = parseAppConfigResponse(await res.json(), deps.platform);
      if (!parsed) throw new Error('app-config body failed validation');
      const fetchedAt = deps.now();
      const entry: CacheEntry = {
        fetched_at: fetchedAt,
        ttl_seconds: parsed.ttlSeconds,
        platform: deps.platform,
        config: parsed.platformConfig,
      };
      try {
        deps.store.setItem(CACHE_KEY, JSON.stringify(entry));
      } catch {
        // A cache write failure only costs the next launch its cache.
      }
      set({ platformConfig: parsed.platformConfig, source: 'remote', fetchedAt, ttlSeconds: parsed.ttlSeconds });
    } catch {
      set(fallback());
    }
    return state;
  };

  return {
    getState: () => state,
    refresh(opts = {}) {
      if (inFlight) return inFlight;
      const now = deps.now();
      if (!opts.force && lastAttemptAt !== null && now - lastAttemptAt < state.ttlSeconds * 1000) {
        return Promise.resolve(state);
      }
      lastAttemptAt = now;
      inFlight = fetchOnce().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function currentPlatform(): NativePlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

/** The running app's version (app.config.ts `version`). */
export function currentAppVersion(): string {
  const v = Constants.expoConfig?.version;
  return isVersion(v) ? v : '0.0.0';
}

let singleton: RemoteConfigClient | null = null;

/** The app-wide client, created on first use with the build config and N1's store. */
export function getRemoteConfigClient(): RemoteConfigClient {
  if (!singleton) {
    singleton = createRemoteConfigClient({
      config: buildConfig,
      platform: currentPlatform(),
      store: getKeyValueStore(),
      fetchImpl: (input, init) => fetch(input, init),
      now: () => Date.now(),
    });
  }
  return singleton;
}

/** Test seam: replace (or reset with null) the app-wide client. */
export function setRemoteConfigClient(client: RemoteConfigClient | null): void {
  singleton = client;
}

/** Current flags without React (push registration reads this). */
export function getAppFlags(): AppFlags {
  return { ...getRemoteConfigClient().getState().platformConfig.flags };
}

/** For N3, N5, N6: flags plus the update gate. N3 renders the update-required screen. */
export function useAppConfig(): AppConfigView {
  const client = getRemoteConfigClient();
  const state = useSyncExternalStore(client.subscribe, client.getState, client.getState);
  return deriveView(state, currentAppVersion());
}

/** Mounted once in the root layout: fetch on launch and on every return to the foreground. */
export function useRemoteConfigRefresh(): void {
  useEffect(() => {
    const client = getRemoteConfigClient();
    void client.refresh();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void client.refresh();
    });
    return () => sub.remove();
  }, []);
}
