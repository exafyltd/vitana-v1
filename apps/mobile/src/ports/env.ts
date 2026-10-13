/**
 * VTID-05186 (N3, plan change 5) — configuration through one port.
 *
 * N3's own keys live in `src/config/env.ts`. `config`, `requireValue`,
 * `endpoints` and `assertNotProductionKey` are N1's (N1 change 8); until N1
 * merges they come from the branch-only `./env.stub`, and the swap is the
 * second export line below pointing at `../config/env`.
 */
export { assertNotProduction, isBlockedHost, requireUrl, missingKeys, ConfigMissingError, URL_KEYS, VALUE_KEYS } from '../config/env';
export type { AppConfig, ConfigKey, ValueKey } from '../config/env';
export { config, requireValue, endpoints, assertNotProductionKey } from './env.stub';
