/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the Health Sync
 * stub contract test (plan R1-F5, sparring R1-F1) and the in-screen
 * affordance.
 *
 * STUB-ONLY MODE today: the N5a module (`apps/mobile/src/health-sync/`,
 * vitana-v1 PR #1398) is not on main, so this test asserts the typed stub
 * satisfies the pinned `HealthSyncEntry` interface (type-level assignability
 * + runtime shape check) and that `getHealthSync()` hands out the stub. The
 * real-import assertion is CONDITIONAL: once `src/health-sync/index.ts`
 * exists, the same test loads its `createHealthSync()` and requires the same
 * shape, so a signature drift fails NATIVE-CI instead of shipping a broken
 * delegate call. No path that is absent on main is imported statically.
 */
import '../helpers/no-network';
import { searchParams } from './mocks';
import { existsSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import {
  HEALTH_SYNC_CATEGORIES,
  HEALTH_SYNC_ENTRY_KEYS,
  HEALTH_SYNC_INGEST_ENABLED,
  HEALTH_SYNC_MODULE_PATH,
  __setHealthSyncForTests,
  createHealthSyncStub,
  getHealthSync,
  healthSyncInitialState,
  isHealthSyncEntry,
  type HealthSyncEntry,
  type HealthSyncPassResult,
  type HealthSyncState,
} from '../../src/ports/health-sync';
import { HealthSyncAffordance } from '../../src/screens/health/sync/HealthSyncAffordance';
import { HealthScreen } from '../../src/screens/health/HealthScreen';
import { healthOnly, healthWrapper } from './helpers';

const APP = join(__dirname, '../..');

afterEach(() => __setHealthSyncForTests(null));
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

// ── type level: the stub is assignable to the pinned interface ──────────
const stubAsEntry: HealthSyncEntry = createHealthSyncStub();
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const keysMatch: Exact<(typeof HEALTH_SYNC_ENTRY_KEYS)[number], keyof HealthSyncEntry> = true;
const connectResult: Exact<Awaited<ReturnType<HealthSyncEntry['connect']>>, HealthSyncPassResult> = true;
const snapshotResult: Exact<ReturnType<HealthSyncEntry['snapshot']>, HealthSyncState> = true;

describe('pinned interface (stub-only mode)', () => {
  it('the stub is a HealthSyncEntry: type-level assignability and the runtime shape check', () => {
    expect([keysMatch, connectResult, snapshotResult]).toEqual([true, true, true]);
    expect(isHealthSyncEntry(stubAsEntry)).toBe(true);
    expect(Object.keys(stubAsEntry).sort()).toEqual([...HEALTH_SYNC_ENTRY_KEYS].sort());
    expect(isHealthSyncEntry({ snapshot: () => null })).toBe(false);
    expect(isHealthSyncEntry(null)).toBe(false);
  });

  it('the entry exposes no OS-permission, consent or ingest member (those stay N5a’s)', () => {
    for (const k of ['requestOsPermission', 'grantConsent', 'revokeConsent', 'syncNow', 'start']) expect(k in stubAsEntry).toBe(false);
  });

  it('read-only until enabled: ingest is off, the snapshot is the dark initial state, connect answers flag_off', async () => {
    expect(HEALTH_SYNC_INGEST_ENABLED).toBe(false);
    const s = stubAsEntry.snapshot();
    expect(s).toEqual(healthSyncInitialState());
    expect(s.flag).toBe(false);
    expect(Object.keys(s.consent)).toEqual([...HEALTH_SYNC_CATEGORIES]);
    expect(Object.values(s.os_permission).every((v) => v === 'unknown')).toBe(true);
    await expect(stubAsEntry.connect()).resolves.toEqual({ ran: false, reason: 'flag_off' });
    const off = stubAsEntry.onStateChange(() => undefined);
    expect(typeof off).toBe('function');
    off();
  });

  it('the N5a module: absent on main → getHealthSync() is the stub; present → its createHealthSync() satisfies the pinned shape', async () => {
    const modulePath = join(APP, HEALTH_SYNC_MODULE_PATH);
    if (!existsSync(modulePath)) {
      const entry = getHealthSync();
      expect(isHealthSyncEntry(entry)).toBe(true);
      await expect(entry.connect()).resolves.toEqual({ ran: false, reason: 'flag_off' });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const real = require(modulePath) as { createHealthSync: () => unknown };
    const sync = real.createHealthSync();
    expect(isHealthSyncEntry(sync)).toBe(true);
    expect(Object.keys((sync as HealthSyncEntry).snapshot()).sort()).toEqual(Object.keys(healthSyncInitialState()).sort());
  });
});

describe('the in-screen affordance delegates, never requests an OS permission or ingests', () => {
  function spyEntry() {
    const state = healthSyncInitialState();
    return {
      snapshot: jest.fn(() => state),
      onStateChange: jest.fn(() => () => undefined),
      connect: jest.fn(async (): Promise<HealthSyncPassResult> => ({ ran: false, reason: 'flag_off' })),
      requestOsPermission: jest.fn(),
      grantConsent: jest.fn(),
      syncNow: jest.fn(),
    };
  }

  it.each([
    ['device', 'Connect Device'],
    ['api', 'Connect API'],
  ] as const)('%s: renders the web label and resolves to the module entry (connect) once', async (kind, label) => {
    const entry = spyEntry();
    const onResult = jest.fn();
    const { wrapper, sb, gw } = healthWrapper();
    render(<HealthSyncAffordance kind={kind} entry={entry} onResult={onResult} />, { wrapper });
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByTestId(`health-sync-connect-${kind}`).props.accessibilityHint).toBe('Health sync is not enabled yet.');
    fireEvent.press(screen.getByTestId(`health-sync-connect-${kind}`));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith({ ran: false, reason: 'flag_off' }));
    expect(entry.connect).toHaveBeenCalledTimes(1);
    expect(entry.requestOsPermission).not.toHaveBeenCalled();
    expect(entry.grantConsent).not.toHaveBeenCalled();
    expect(entry.syncNow).not.toHaveBeenCalled();
    expect(healthOnly(sb.requests)).toEqual([]);
    expect(healthOnly(sb.rpcCalls)).toEqual([]);
    expect(sb.requests.filter((r) => r.method !== 'select')).toEqual([]);
    expect(gw.requests).toEqual([]);
  });

  it('by default it runs against the port’s entry (the stub today)', async () => {
    const entry = spyEntry();
    __setHealthSyncForTests(entry);
    const onResult = jest.fn();
    const { wrapper } = healthWrapper();
    render(<HealthSyncAffordance kind="device" onResult={onResult} />, { wrapper });
    fireEvent.press(screen.getByTestId('health-sync-connect-device'));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith({ ran: false, reason: 'flag_off' }));
    expect(entry.connect).toHaveBeenCalledTimes(1);
  });

  it('the /health dashboard renders no connect entry point (the mobile web shows none there, R1.1)', async () => {
    for (const mode of ['overview', 'medical', 'supplements']) {
      searchParams.current = { mode };
      const { wrapper } = healthWrapper();
      const r = render(<HealthScreen />, { wrapper });
      expect(screen.queryByTestId('health-sync-connect-device')).toBeNull();
      expect(screen.queryByTestId('health-sync-connect-api')).toBeNull();
      r.unmount();
    }
    searchParams.current = {};
  });
});
