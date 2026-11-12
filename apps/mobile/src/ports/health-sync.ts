/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the PINNED
 * interface of the Health Sync module's public read-only-until-enabled entry,
 * and the typed stub the in-screen Health Sync affordance runs against today
 * (plan "Health Hub coordination", sparring R1-F1 / R1-F5).
 *
 * The Health Sync module (`n5a-health-sync`, VTID-05184, vitana-v1 PR #1398)
 * is NOT on main: `apps/mobile/src/health-sync/` does not exist there. Its
 * shape is vendored from the #1398 branch head
 * `claude/health-data-integration-plan-dbxyld-n5a` @ 8fea5e652:
 *   - `apps/mobile/src/health-sync/state.ts:7-25`   HealthSyncState and its unions
 *   - `apps/mobile/src/health-sync/contract/v1/catalogue.ts:10-11`  CATEGORIES
 *   - `apps/mobile/src/health-sync/index.ts:66-71`  PassResult
 *   - `apps/mobile/src/health-sync/index.ts:301-378` the `createHealthSync()` api:
 *     `snapshot()`, `onStateChange(cb)`, `connect()` are the members the
 *     affordance calls (the OS-permission, consent and sync members are N5a's
 *     own UI flow and are deliberately NOT part of this entry).
 *
 * Nothing here imports a path that is not on main. When N5a lands, its export
 * must satisfy `HealthSyncEntry` (a type-level assertion in that PR) and
 * `getHealthSync()` returns the real module; tests/health/health-sync-contract
 * flips from stub-only mode to the real export automatically.
 * Re-pin to C1's merge commit once the contract is re-vendored (next_actor: kiro).
 *
 * The stub never requests an OS permission, never reads a health store and
 * never ingests: ingest is OFF (`HEALTH_SYNC_INGEST_ENABLED = false`), so
 * `connect()` answers `{ ran: false, reason: 'flag_off' }`, exactly like the
 * N5a module with its flag-off config stub (`index.ts:354-356`).
 */

/** `contract/v1/catalogue.ts:10` */
export const HEALTH_SYNC_CATEGORIES = ['activity', 'sleep', 'heart', 'body'] as const;
export type HealthSyncCategory = (typeof HEALTH_SYNC_CATEGORIES)[number];

/** `state.ts:7-11` */
export type HealthSyncConsentState = 'granted' | 'not_granted' | 'unknown';
export type HealthSyncOsPermissionState = 'granted' | 'denied' | 'unknown';
export type HealthSyncPhase = 'idle' | 'backfill' | 'syncing' | 'paused';
export type HealthSyncPausedReason = 'server_disabled' | 'upgrade_required' | 'client_error' | 'auth_paused' | 'source_paused';

/** `state.ts:13-25` */
export interface HealthSyncState {
  flag: boolean;
  signedIn: boolean;
  platformAvailable: boolean;
  source_state: string;
  consent: Record<HealthSyncCategory, HealthSyncConsentState>;
  os_permission: Record<HealthSyncCategory, HealthSyncOsPermissionState>;
  phase: HealthSyncPhase;
  paused_reason?: HealthSyncPausedReason;
  last_success_at?: number;
  queued: number;
  diagnostics: { counts: Record<string, number>; contract_mismatch: boolean; client_error: boolean; invalid_details?: string[] };
  os_permission_withdrawable_in_app: boolean;
}

/** `index.ts:66-71` */
export interface HealthSyncPassResult {
  ran: boolean;
  reason?: 'flag_off' | 'signed_out' | 'unsupported_platform' | 'unavailable' | 'paused' | 'busy' | 'locked' | 'contract_unverified';
  read?: number;
  sent?: number;
}

/** The public read-only-until-enabled entry the in-screen affordance calls (`index.ts:301-378`, subset). */
export interface HealthSyncEntry {
  snapshot(): HealthSyncState;
  onStateChange(cb: () => void): () => void;
  connect(): Promise<HealthSyncPassResult>;
}

/** The members of `HealthSyncEntry`, for the runtime shape check. */
export const HEALTH_SYNC_ENTRY_KEYS = ['snapshot', 'onStateChange', 'connect'] as const;

/** Ingest stays off until the C1 / D10 / DPIA / 0T preconditions are met (HEALTH-HUB-PLAN §3). */
export const HEALTH_SYNC_INGEST_ENABLED = false;

/** Where the N5a module will live; the contract test checks it in stub-only mode while it is absent. */
export const HEALTH_SYNC_MODULE_PATH = 'src/health-sync/index.ts';

/** `state.ts:29-42` initialState(). */
export function healthSyncInitialState(): HealthSyncState {
  const all = <T>(v: T) => Object.fromEntries(HEALTH_SYNC_CATEGORIES.map((c) => [c, v])) as Record<HealthSyncCategory, T>;
  return {
    flag: false,
    signedIn: false,
    platformAvailable: false,
    source_state: 'unknown',
    consent: all<HealthSyncConsentState>('unknown'),
    os_permission: all<HealthSyncOsPermissionState>('unknown'),
    phase: 'idle',
    queued: 0,
    diagnostics: { counts: {}, contract_mismatch: false, client_error: false },
    os_permission_withdrawable_in_app: false,
  };
}

/** Runtime shape check: `x` has every `HealthSyncEntry` member as a function. */
export function isHealthSyncEntry(x: unknown): x is HealthSyncEntry {
  return !!x && typeof x === 'object' && HEALTH_SYNC_ENTRY_KEYS.every((k) => typeof (x as Record<string, unknown>)[k] === 'function');
}

/** The typed stub: dark, read-only, never an OS permission or an ingest call. */
export function createHealthSyncStub(): HealthSyncEntry {
  const state = healthSyncInitialState();
  return {
    snapshot: () => state,
    onStateChange: () => () => undefined,
    connect: async () => ({ ran: false, reason: 'flag_off' }),
  };
}

let entry: HealthSyncEntry | null = null;

/** The entry the affordance calls: the stub until the N5a module is on main. */
export function getHealthSync(): HealthSyncEntry {
  return (entry ??= createHealthSyncStub());
}

/** Test seam (null resets to the stub). */
export function __setHealthSyncForTests(e: HealthSyncEntry | null): void {
  entry = e;
}
