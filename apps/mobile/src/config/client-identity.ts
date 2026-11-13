/**
 * VTID-05656 — the native client-identity header.
 *
 * Every gateway call from `http.ts` carries `X-Vitana-Client: native/<platform>/<version>`
 * so the gateway can tell native traffic from the Appilix web view (adoption
 * measurement, plan native-wave3-release-r2, decision 2). The header carries no
 * member data. No version available → `unknown`; the request still goes out.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isVersion } from './version';

export const CLIENT_HEADER = 'X-Vitana-Client';

/**
 * `native/<ios|android|test>/<version|unknown>`. Never throws. Matches the gateway classifier
 * (vitana-platform services/gateway/src/services/client-identity/classify.ts, VTID-05657): any other
 * platform (jest, web) is sent as `test`, which the classifier accepts.
 */
export function buildClientIdentity(platform: string | undefined, version: unknown): string {
  const p = platform === 'ios' || platform === 'android' ? platform : 'test';
  const v = isVersion(version) ? version : 'unknown';
  return `native/${p}/${v}`;
}

export function currentClientIdentity(): string {
  let version: unknown;
  try {
    version = Constants.expoConfig?.version;
  } catch {
    version = undefined;
  }
  return buildClientIdentity(Platform.OS, version);
}

export function clientIdentityHeaders(): Record<string, string> {
  return { [CLIENT_HEADER]: currentClientIdentity() };
}
