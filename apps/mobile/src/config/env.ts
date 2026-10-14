/**
 * VTID-05157 — native app configuration (Native app Wave 0, plan change 4).
 *
 * Every endpoint comes from build configuration. In Wave 0 all of them are
 * OPTIONAL AND UNSET: the skeleton makes no network calls. Unlike the web
 * clients (src/integrations/supabase/client.ts, src/lib/gateway-base.ts) there
 * is NO default URL — a missing value is an error, never a fallback.
 *
 * Production AND staging hosts are refused: staging frontends and the staging
 * gateway share the production database (CLAUDE.md "Why no host is exempt"),
 * so a "safer" host is not safer. Native dev/test builds point at G1 only.
 *
 * VTID-05183 — also the publishable key (assertNotProductionKey) and
 * `endpoints(config)`, the only input of the @vitana/core client factories.
 * This file stays the single production gate; packages/core has no defaults.
 */

// VTID-05186: through the core port (tests/ports.test.ts — app code reaches lane packages only via src/ports).
import type { CoreEndpoints } from '../ports/core';

export type ConfigKey = 'gatewayUrl' | 'supabaseUrl' | 'dataApiUrl' | 'authRedirectUrl' | 'webBaseUrl';

/**
 * Non-URL values; no defaults. `supabasePublishableKey` is N1's (VTID-05183,
 * checked by assertNotProductionKey); the Google client ids are N3's
 * (VTID-05186, plan change 5), plain values read with `requireValue`.
 */
export type ValueKey = 'supabasePublishableKey' | 'googleWebClientId' | 'googleIosClientId';

export type AppConfig = Partial<Record<ConfigKey | ValueKey, string>>;

/**
 * Every URL key goes through `assertNotProduction`.
 *   authRedirectUrl — base for e-mail confirm / password-reset links (VTID-05186)
 *   webBaseUrl      — where admin consoles open in the system browser (VTID-05186)
 * Both are unset in `development` and `test-g1` until G1 names them.
 */
export const URL_KEYS: readonly ConfigKey[] = ['gatewayUrl', 'supabaseUrl', 'dataApiUrl', 'authRedirectUrl', 'webBaseUrl'];
export const VALUE_KEYS: readonly ValueKey[] = ['supabasePublishableKey', 'googleWebClientId', 'googleIosClientId'];

/**
 * A required value is unset. The app renders the ConfigMissing screen for it
 * (plan change 15), tests see the throw; nothing ever falls back to a default.
 */
export class ConfigMissingError extends Error {
  readonly keys: readonly string[];
  constructor(keys: readonly string[]) {
    super(`Native config ${keys.map((k) => `"${k}"`).join(', ')} is not set. There is no default (VTID-05157); set it for the G1 test environment.`);
    this.name = 'ConfigMissingError';
    this.keys = keys;
  }
}

/** The keys among `keys` that `config` does not set. Names only, never values. */
export function missingKeys(config: AppConfig, keys: readonly (ConfigKey | ValueKey | string)[]): string[] {
  return keys.filter((k) => !(config as Record<string, string | undefined>)[k]);
}

// The host list and check live in blocked-hosts.js so app.config.ts can share
// them (VTID-05178); the exports below are unchanged.
import { BLOCKED_HOSTS, hostnameOf, isBlockedHost } from './blocked-hosts';

export { BLOCKED_HOSTS, isBlockedHost };

/** Throws when `url` is a production or staging host. Returns the URL otherwise. */
export function assertNotProduction(url: string): string {
  if (isBlockedHost(url)) {
    throw new Error(
      `Refusing ${hostnameOf(url)}: native dev/test builds never reach production or staging (they share the production database). Use the G1 test environment.`,
    );
  }
  return url;
}

/** The production Supabase project ref (src/integrations/supabase/client.ts falls back to it). */
const PROD_SUPABASE_PROJECT_REF = 'inmkhvwdcuyhnxkgfvsb';

function decodeBase64Url(segment: string): string {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof globalThis.atob === 'function') return globalThis.atob(padded);
  throw new Error('No base64 decoder available to inspect the Supabase key.');
}

/**
 * VTID-05183 — throws when `key` is the production project's publishable key.
 * Two formats exist:
 *  - a legacy JWT anon key: the payload is decoded (not verified) and a
 *    `ref` equal to the production project is refused;
 *  - an `sb_publishable_…` key: refused when the production ref appears in it
 *    as a `_`-separated segment.
 * A value in neither format is refused as invalid. The URL check on
 * `supabaseUrl` stays the primary gate: a key cannot reach production without
 * the production URL, which assertNotProduction already refuses.
 */
export function assertNotProductionKey(key: string): string {
  const value = (key ?? '').trim();
  const refuse = () => {
    throw new Error(
      'Refusing the production Supabase publishable key: native dev/test builds never reach production or staging (they share the production database). Use the G1 test environment.',
    );
  };
  if (value.startsWith('sb_publishable_')) {
    if (value.split('_').some((segment) => segment.toLowerCase() === PROD_SUPABASE_PROJECT_REF)) refuse();
    if (value.length <= 'sb_publishable_'.length) throw new Error('Invalid Supabase publishable key in native config: empty sb_publishable_ key.');
    return value;
  }
  const parts = value.split('.');
  if (parts.length === 3 && parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p))) {
    let payload: { ref?: unknown };
    try {
      payload = JSON.parse(decodeBase64Url(parts[1]));
    } catch {
      throw new Error('Invalid Supabase publishable key in native config: the JWT payload does not decode.');
    }
    if (typeof payload.ref === 'string' && payload.ref.toLowerCase() === PROD_SUPABASE_PROJECT_REF) refuse();
    return value;
  }
  throw new Error('Invalid Supabase publishable key in native config: expected a legacy JWT anon key or an sb_publishable_ key.');
}

/** Builds the config from a source of raw values; every set value is checked. */
export function loadConfig(source: AppConfig): AppConfig {
  const out: AppConfig = {};
  for (const key of URL_KEYS) {
    const value = source[key]?.trim();
    if (value) out[key] = assertNotProduction(value);
  }
  for (const key of VALUE_KEYS) {
    const value = source[key]?.trim();
    if (value) out[key] = key === 'supabasePublishableKey' ? assertNotProductionKey(value) : value;
  }
  return out;
}

/** The value for `key`, or an error. Never a default. */
export function requireUrl(config: AppConfig, key: ConfigKey): string {
  const value = config[key];
  if (!value) throw new ConfigMissingError([key]);
  return assertNotProduction(value);
}

/**
 * A non-URL value, or ConfigMissingError. Never a default. The publishable key
 * (VTID-05183) passes assertNotProductionKey; the Google client ids
 * (VTID-05186) are plain values.
 */
export function requireValue(config: AppConfig, key: ValueKey): string {
  const value = config[key]?.trim();
  if (!value) throw new ConfigMissingError([key]);
  return key === 'supabasePublishableKey' ? assertNotProductionKey(value) : value;
}

/**
 * VTID-05183 — the endpoints every @vitana/core client is built from. Each
 * value passes requireUrl / requireValue, so a client built from these has
 * passed the host and key checks. `dataApiUrl` is optional. VTID-05186: the
 * missing required values are reported together (the ConfigMissing screen
 * names them all).
 */
export function endpoints(cfg: AppConfig): CoreEndpoints {
  const missing = missingKeys(cfg, ['gatewayUrl', 'supabaseUrl', 'supabasePublishableKey']);
  if (missing.length > 0) throw new ConfigMissingError(missing);
  const out: CoreEndpoints = {
    gatewayOrigin: requireUrl(cfg, 'gatewayUrl'),
    supabaseUrl: requireUrl(cfg, 'supabaseUrl'),
    supabasePublishableKey: requireValue(cfg, 'supabasePublishableKey'),
  };
  if (cfg.dataApiUrl) out.dataApiUrl = requireUrl(cfg, 'dataApiUrl');
  return out;
}

/**
 * The build's configuration. Expo inlines EXPO_PUBLIC_* at bundle time; in
 * `development` none of them is set, so this is `{}`.
 */
export const config: AppConfig = loadConfig({
  gatewayUrl: process.env.EXPO_PUBLIC_GATEWAY_URL,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  dataApiUrl: process.env.EXPO_PUBLIC_DATA_API_URL,
  authRedirectUrl: process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL,
  webBaseUrl: process.env.EXPO_PUBLIC_WEB_BASE_URL,
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
