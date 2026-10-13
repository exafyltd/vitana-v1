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
 */
import type { ExpoConfig } from 'expo/config';

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

export function buildPlugins(env: Record<string, string | undefined>): PluginEntry[] {
  const plugins: PluginEntry[] = ['expo-router', 'expo-localization', 'expo-secure-store', 'expo-apple-authentication'];
  const scheme = googleIosUrlScheme(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  if (scheme) plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: scheme }]);
  return plugins;
}

export function buildConfig(profileValue: string | undefined, env: Record<string, string | undefined> = process.env): ExpoConfig {
  const profile = resolveProfile(profileValue);
  return {
    name: profile === 'development' ? 'Vitana Dev' : 'Vitana Test',
    slug: 'vitana-mobile',
    version: '0.0.0',
    // Placeholder; the link scheme and universal links / App Links are N4's (Wave 1).
    scheme: 'maxina',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    // usesAppleSignIn: Sign in with Apple (VTID-05186); the App ID capability waits for G3.
    ios: { bundleIdentifier: IDENTIFIERS.ios, supportsTablet: false, usesAppleSignIn: true },
    android: { package: IDENTIFIERS.android },
    plugins: buildPlugins(env),
    experiments: { typedRoutes: false },
    extra: { profile },
  };
}

export default (): ExpoConfig => buildConfig(process.env.APP_PROFILE);
