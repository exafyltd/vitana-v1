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

export type ConfigKey = 'gatewayUrl' | 'supabaseUrl' | 'dataApiUrl' | 'authRedirectUrl' | 'webBaseUrl';

/**
 * VTID-05186 (N3, plan change 5) — non-URL values. Read with N1's
 * `requireValue` (through `src/ports/env.ts`); no defaults.
 */
export type ValueKey = 'googleWebClientId' | 'googleIosClientId';

export type AppConfig = Partial<Record<ConfigKey | ValueKey, string>>;

/**
 * Every URL key goes through `assertNotProduction`.
 *   authRedirectUrl — base for e-mail confirm / password-reset links (VTID-05186)
 *   webBaseUrl      — where admin consoles open in the system browser (VTID-05186)
 * Both are unset in `development` and `test-g1` until G1 names them.
 */
export const URL_KEYS: readonly ConfigKey[] = ['gatewayUrl', 'supabaseUrl', 'dataApiUrl', 'authRedirectUrl', 'webBaseUrl'];
export const VALUE_KEYS: readonly ValueKey[] = ['googleWebClientId', 'googleIosClientId'];

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
  for (const key of URL_KEYS) {
    const value = source[key]?.trim();
    if (value) out[key] = assertNotProduction(value);
  }
  for (const key of VALUE_KEYS) {
    const value = source[key]?.trim();
    if (value) out[key] = value;
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
});
