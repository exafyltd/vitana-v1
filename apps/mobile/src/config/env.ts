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

import type { CoreEndpoints } from '@vitana/core/config';

export type ConfigKey = 'gatewayUrl' | 'supabaseUrl' | 'dataApiUrl';

/** VTID-05183 — config values that are not URLs (the Supabase publishable key). */
export type ValueKey = 'supabasePublishableKey';

export type AppConfig = Partial<Record<ConfigKey | ValueKey, string>>;

/** Hostnames a native dev/test build may never talk to (exact match). */
export const BLOCKED_HOSTS: readonly string[] = [
  'vitanaland.com',
  'www.vitanaland.com',
  'gateway.vitanaland.com',
  'inmkhvwdcuyhnxkgfvsb.supabase.co',
];

/** Staging hosts (preview-aws.vitanaland.com, preview-aws-gateway.vitanaland.com, …). */
const STAGING_HOST = /^preview-aws[a-z0-9-]*\.vitanaland\.com$/;
/** The production Supabase project ref, in any subdomain form. */
const PROD_SUPABASE_REF = /(^|\.)inmkhvwdcuyhnxkgfvsb\./;

function hostnameOf(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL in native config: ${JSON.stringify(url)}`);
  }
  // hostname, not host: a port or a trailing dot must not slip a host past the check.
  return parsed.hostname.toLowerCase().replace(/\.$/, '');
}

export function isBlockedHost(url: string): boolean {
  const host = hostnameOf(url);
  return BLOCKED_HOSTS.includes(host) || STAGING_HOST.test(host) || PROD_SUPABASE_REF.test(`${host}.`);
}

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
  for (const key of ['gatewayUrl', 'supabaseUrl', 'dataApiUrl'] as const) {
    const value = source[key]?.trim();
    if (value) out[key] = assertNotProduction(value);
  }
  const key = source.supabasePublishableKey?.trim();
  if (key) out.supabasePublishableKey = assertNotProductionKey(key);
  return out;
}

/** The value for `key`, or an error. Never a default. */
export function requireUrl(config: AppConfig, key: ConfigKey): string {
  const value = config[key];
  if (!value) {
    throw new Error(`Native config "${key}" is not set. There is no default URL (VTID-05157); set it for the G1 test environment.`);
  }
  return assertNotProduction(value);
}

/** VTID-05183 — a non-URL value (the publishable key), or an error. Never a default. */
export function requireValue(config: AppConfig, key: ValueKey): string {
  const value = config[key]?.trim();
  if (!value) {
    throw new Error(`Native config "${key}" is not set. There is no default (VTID-05183); set it for the G1 test environment.`);
  }
  return assertNotProductionKey(value);
}

/**
 * VTID-05183 — the endpoints every @vitana/core client is built from. Each
 * value passes requireUrl / requireValue, so a client built from these has
 * passed the host and key checks. `dataApiUrl` is optional.
 */
export function endpoints(cfg: AppConfig): CoreEndpoints {
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
 * Wave 0 none of them is set, so this is `{}`.
 */
export const config: AppConfig = loadConfig({
  gatewayUrl: process.env.EXPO_PUBLIC_GATEWAY_URL,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  dataApiUrl: process.env.EXPO_PUBLIC_DATA_API_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
