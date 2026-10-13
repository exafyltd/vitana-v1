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
 * VTID-05184 (N5a) — Health Sync config plugins, both profiles: HealthKit
 * read-only (no update string, background delivery on, no clinical-records
 * access) with the purpose string from the catalogue in all 11 locales;
 * Health Connect READ permissions; Android minSdk 26 for the native build only
 * (the Health Connect library's minimum; owner item at the Wave 3 store-release
 * Gate 2); SQLCipher for the encrypted queue; background task.
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

const BASE_PLUGINS: NonNullable<ExpoConfig['plugins']> = ['expo-router', 'expo-localization'];

/** VTID-05184 — Health Sync (N5a plan change 4). The module itself stays dark behind the N4 flag. */
export const HEALTH_SYNC_PLUGINS: NonNullable<ExpoConfig['plugins']> = [
  ['@kingstinct/react-native-healthkit', { NSHealthShareUsageDescription: true, NSHealthUpdateUsageDescription: false, background: true }],
  './plugins/with-ios-health-locales.js',
  'react-native-health-connect',
  './plugins/with-health-connect-permissions.js',
  ['expo-build-properties', { android: { minSdkVersion: 26 } }],
  ['expo-sqlite', { useSQLCipher: true }],
  'expo-background-task',
];

export function buildConfig(profileValue: string | undefined): ExpoConfig {
  const profile = resolveProfile(profileValue);
  return {
    name: profile === 'development' ? 'Vitana Dev' : 'Vitana Test',
    slug: 'vitana-mobile',
    version: '0.0.0',
    // Placeholder; universal links / App Links come in Wave 1.
    scheme: 'maxina',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    ios: { bundleIdentifier: IDENTIFIERS.ios, supportsTablet: false },
    android: { package: IDENTIFIERS.android },
    plugins: [...BASE_PLUGINS, ...HEALTH_SYNC_PLUGINS],
    experiments: { typedRoutes: false },
    extra: { profile },
  };
}

export default (): ExpoConfig => buildConfig(process.env.APP_PROFILE);
