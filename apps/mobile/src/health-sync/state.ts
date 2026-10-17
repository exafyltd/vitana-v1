/**
 * VTID-05184 — the state the Wave 2 Health lane renders (N5a, "Interfaces").
 * No strings: the lane maps states and reasons to catalogue keys.
 */
import { CATEGORIES, type Category } from './contract/v1/catalogue';

export type ConsentState = 'granted' | 'not_granted' | 'unknown';
export type OsPermissionState = 'granted' | 'denied' | 'unknown';
export type Phase = 'idle' | 'backfill' | 'syncing' | 'paused';
export type PausedReason = 'server_disabled' | 'upgrade_required' | 'client_error' | 'auth_paused' | 'source_paused';

export interface HealthSyncState {
  flag: boolean;
  signedIn: boolean;
  platformAvailable: boolean;
  source_state: string;
  consent: Record<Category, ConsentState>;
  os_permission: Record<Category, OsPermissionState>;
  phase: Phase;
  paused_reason?: PausedReason;
  last_success_at?: number;
  queued: number;
  diagnostics: { counts: Record<string, number>; contract_mismatch: boolean; client_error: boolean; invalid_details?: string[] };
  /** iOS cannot withdraw an OS permission from code: the UI points the member to the Health app. */
  os_permission_withdrawable_in_app: boolean;
}

const all = <T>(v: T): Record<Category, T> => Object.fromEntries(CATEGORIES.map((c) => [c, v])) as Record<Category, T>;

export function initialState(): HealthSyncState {
  return {
    flag: false,
    signedIn: false,
    platformAvailable: false,
    source_state: 'unknown',
    consent: all<ConsentState>('unknown'),
    os_permission: all<OsPermissionState>('unknown'),
    phase: 'idle',
    queued: 0,
    diagnostics: { counts: {}, contract_mismatch: false, client_error: false },
    os_permission_withdrawable_in_app: false,
  };
}
