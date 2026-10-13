/**
 * VTID-05157 — Expo app config (Native app Wave 0, plan change 3).
 *
 * APP_PROFILE selects the build profile and is REQUIRED:
 *   development — local development and CI bundles
 *   test-g1     — the isolated G1 test environment (program §2a), once it exists
 *
 * There is no production profile in Wave 0. An unset, unknown or `production`
 * profile throws, so no Wave 0 artefact can be built for production by
 * accident. Identifiers end in `.dev` so nothing here can ever collide with
 * the store apps (com.exafy.maxina / com.vitanaland.app, added only after G3).
 * No googleServicesFile and no plugin that needs native credentials (G2).
 *
 * VTID-05178 (N4-APP Change 13) — associated domains per build profile.
 * APP_LINK_HOSTS (comma-separated hostnames) is read for `test-g1` only and is
 * meant for the G1 test web host once G1 has one; that host serves its own
 * AASA / assetlinks.json for the .dev identifiers. `development` never
 * associates. A production or staging host (`isBlockedHost`, shared with env.ts) fails
 * the build. Production `public/.well-known/*` is not touched (Change 14).
 */
import type { ExpoConfig } from 'expo/config';
import { isBlockedHost } from './src/config/blocked-hosts';

export const PROFILES = ['development', 'test-g1'] as const;
export type Profile = (typeof PROFILES)[number];

export const IDENTIFIERS = {
  ios: 'com.exafy.maxina.dev',
  android: 'com.vitanaland.app.dev',
} as const;

export function resolveProfile(value: string | undefined): Profile {
  if (!value) {
    throw new Error('APP_PROFILE is not set. Use APP_PROFILE=development (or test-g1). There is no production profile in Wave 0.');
  }
  if (value === 'production') {
    throw new Error('APP_PROFILE=production does not exist in Wave 0: native builds never point at production (VTID-05157).');
  }
  if (!(PROFILES as readonly string[]).includes(value)) {
    throw new Error(`Unknown APP_PROFILE "${value}". Allowed: ${PROFILES.join(', ')}.`);
  }
  return value as Profile;
}

/**
 * VTID-05186 (N3, plan change 6) — the Google Sign-In iOS URL scheme is the
 * reversed iOS client id. No client id → no plugin, so `development` builds
 * without any Google config.
 */
export function googleIosUrlScheme(iosClientId: string | undefined): string | null {
  const id = iosClientId?.trim();
  if (!id) return null;
  const suffix = '.apps.googleusercontent.com';
  const prefix = id.endsWith(suffix) ? id.slice(0, -suffix.length) : id;
  return `com.googleusercontent.apps.${prefix}`;
}

type PluginEntry = string | [string, Record<string, unknown>];

export function buildPlugins(env: Record<string, string | undefined>, profile: Profile = 'development'): PluginEntry[] {
  const plugins: PluginEntry[] = ['expo-router', 'expo-localization', 'expo-secure-store', 'expo-apple-authentication'];
  const scheme = googleIosUrlScheme(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  if (scheme) plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: scheme }]);
  // VTID-05180/05181: the native ORB voice module. Its microphone usage string comes
  // from the i18n catalog at prebuild (fails closed without the keys); dev-only
  // local networking for the fake gateway.
  plugins.push(['./modules/vitana-voice/plugin/withVitanaVoice', { profile }]);
  return plugins;
}


/** The four link paths the app handles from a universal link / App Link. */
export const LINK_PATHS = {
  exact: ['/auth/confirmed', '/reset-password', '/oauth/complete'],
  prefix: ['/i/'],
} as const;

const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Parses APP_LINK_HOSTS for a profile. Throws on a bad, production or staging host. */
export function resolveLinkHosts(profile: Profile, value: string | undefined): string[] {
  const hosts = (value ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (hosts.length === 0) return [];
  if (profile !== 'test-g1') {
    throw new Error(`APP_LINK_HOSTS is only for the test-g1 profile (the G1 test web host), not "${profile}" (VTID-05178).`);
  }
  for (const host of hosts) {
    if (!HOSTNAME.test(host)) throw new Error(`APP_LINK_HOSTS: "${host}" is not a bare hostname.`);
    if (isBlockedHost(`https://${host}`)) {
      throw new Error(`APP_LINK_HOSTS: refusing ${host} — native dev/test builds never associate with a production or staging host (VTID-05178).`);
    }
  }
  return [...new Set(hosts)];
}

export function buildConfig(
  profileValue: string | undefined,
  linkHostsValue?: string,
  env: Record<string, string | undefined> = process.env,
): ExpoConfig {
  const profile = resolveProfile(profileValue);
  const linkHosts = resolveLinkHosts(profile, linkHostsValue);
  // usesAppleSignIn: Sign in with Apple (VTID-05186); the App ID capability waits for G3.
  const ios: ExpoConfig['ios'] = { bundleIdentifier: IDENTIFIERS.ios, supportsTablet: false, usesAppleSignIn: true };
  const android: ExpoConfig['android'] = { package: IDENTIFIERS.android };
  if (linkHosts.length > 0) {
    ios.associatedDomains = linkHosts.map((host) => `applinks:${host}`);
    android.intentFilters = [
      {
        action: 'VIEW',
        autoVerify: true,
        data: linkHosts.flatMap((host) => [
          ...LINK_PATHS.exact.map((path) => ({ scheme: 'https', host, path })),
          ...LINK_PATHS.prefix.map((pathPrefix) => ({ scheme: 'https', host, pathPrefix })),
        ]),
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ];
  }
  return {
    name: profile === 'development' ? 'Vitana Dev' : 'Vitana Test',
    slug: 'vitana-mobile',
    version: '0.0.0',
    // Custom scheme: the route for `xcrun simctl openurl` / `adb shell am start` link tests (VTID-05178).
    scheme: 'maxina',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    ios,
    android,
    plugins: buildPlugins(env, profile),
    experiments: { typedRoutes: false },
    extra: { profile, linkHosts },
  };
}

export default (): ExpoConfig => buildConfig(process.env.APP_PROFILE, process.env.APP_LINK_HOSTS);
