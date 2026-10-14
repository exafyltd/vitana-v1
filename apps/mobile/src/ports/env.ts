/**
 * VTID-05186 (N3, plan change 5) — configuration through one port.
 *
 * Everything comes from `src/config/env.ts`, the single production gate:
 * N1's (VTID-05183) publishable-key check, `requireValue` and `endpoints`,
 * and N3's own keys (authRedirectUrl, webBaseUrl, the Google client ids) and
 * ConfigMissingError.
 */
export {
  assertNotProduction,
  assertNotProductionKey,
  isBlockedHost,
  requireUrl,
  requireValue,
  endpoints,
  config,
  missingKeys,
  ConfigMissingError,
  URL_KEYS,
  VALUE_KEYS,
} from '../config/env';
export type { AppConfig, ConfigKey, ValueKey } from '../config/env';
