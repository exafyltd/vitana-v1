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
    // VTID-05180: the native ORB voice module. Its microphone usage string comes
    // from the i18n catalog at prebuild (fails closed without the keys); dev-only
    // local networking for the fake gateway.
    plugins: ['expo-router', 'expo-localization', ['./modules/vitana-voice/plugin/withVitanaVoice', { profile }]],
    experiments: { typedRoutes: false },
    extra: { profile },
  };
}

export default (): ExpoConfig => buildConfig(process.env.APP_PROFILE);
