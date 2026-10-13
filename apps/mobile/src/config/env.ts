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
 */

export type ConfigKey = 'gatewayUrl' | 'supabaseUrl' | 'dataApiUrl';

export type AppConfig = Partial<Record<ConfigKey, string>>;

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

/** Builds the config from a source of raw values; every set value is checked. */
export function loadConfig(source: AppConfig): AppConfig {
  const out: AppConfig = {};
  for (const key of ['gatewayUrl', 'supabaseUrl', 'dataApiUrl'] as const) {
    const value = source[key]?.trim();
    if (value) out[key] = assertNotProduction(value);
  }
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

/**
 * The build's configuration. Expo inlines EXPO_PUBLIC_* at bundle time; in
 * Wave 0 none of them is set, so this is `{}`.
 */
export const config: AppConfig = loadConfig({
  gatewayUrl: process.env.EXPO_PUBLIC_GATEWAY_URL,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  dataApiUrl: process.env.EXPO_PUBLIC_DATA_API_URL,
});
