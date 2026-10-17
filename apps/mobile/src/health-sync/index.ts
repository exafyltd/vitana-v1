/**
 * VTID-05184 — Health Sync module, the only public entry (N5a, plan change 5).
 *
 * `createHealthSync(ports)` → { getState, grantConsent, revokeConsent,
 * requestOsPermission, connect, disconnect, syncNow, onStateChange, … } and
 * `useHealthSyncState()`. No UI and no strings: the Wave 2 Health lane maps
 * state to catalogue keys.
 *
 * Dark by default: with the N4 stub (flag off) or the N3 stub (signed out)
 * nothing runs — no reader, no store, no background task, no network call,
 * and the native health libraries are never `require`d. Withdrawal is the
 * one exception: `revokeConsent` always reaches the gateway.
 */
import { useSyncExternalStore } from 'react';
import { config as envConfig, type AppConfig } from '../config/env';
import { CATEGORIES, entriesFor, type Category, type SyncPlatform } from './contract/v1/catalogue';
import { CONTRACT_MAJOR, type SourceKind } from './contract/v1/wire';
import * as consent from './consent';
import { SyncEngine, BACKFILL_DAYS } from './engine';
import { PATHS, createGatewayClient, statusQuery, type GatewayClient } from './gateway';
import { consoleLogger } from './logger';
import {
  fetchHttp,
  flagOffConfigStub,
  signedOutAuthStub,
  systemClock,
  type AppConfigPort,
  type AuthPort,
  type ClockPort,
  type DevicePort,
  type HttpPort,
  type InstallIdPort,
  type LoggerPort,
  type SchedulerPort,
} from './ports';
import type { PlatformReader } from './readers/types';
import { sourceFor } from './serialize';
import { reconcileOsPermission } from './source-state';
import { initialState, type HealthSyncState, type PausedReason } from './state';
import { HealthStore } from './store/store';
import type { Scope, TableDriver } from './store/types';
import { DAY_MS } from './time';

export type { HealthSyncState } from './state';
export type { AuthPort, AppConfigPort, HttpPort } from './ports';
export { signedOutAuthStub, flagOffConfigStub } from './ports';

export interface HealthSyncPorts {
  auth?: AuthPort;
  appConfig?: AppConfigPort;
  http?: HttpPort;
  clock?: ClockPort;
  logger?: LoggerPort;
  config?: AppConfig;
  device?: () => DevicePort;
  installId?: InstallIdPort;
  /** Opens the store (default: the SQLCipher cache database). */
  driver?: () => Promise<TableDriver>;
  /** Creates the platform reader (default: lazy require of the platform's library). */
  reader?: (device: DevicePort) => PlatformReader;
  scheduler?: (platform: SyncPlatform, run: (o: { background: boolean; budgetMs: number }) => Promise<unknown>) => SchedulerPort;
  uuid?: () => string;
  rand?: () => number;
}

export interface PassResult {
  ran: boolean;
  reason?: 'flag_off' | 'signed_out' | 'unsupported_platform' | 'unavailable' | 'paused' | 'busy' | 'locked' | 'contract_unverified';
  read?: number;
  sent?: number;
}

const FOREGROUND_BUDGET_MS = 60_000;
const LEASE_MS = 2 * 60_000;
const MAX_BATCHES_FOREGROUND = 10;
const MAX_BATCHES_BACKGROUND = 3;
const LEDGER_KEEP_MS = (BACKFILL_DAYS + 30) * DAY_MS;

function platformOf(os: string): SyncPlatform | null {
  return os === 'ios' || os === 'android' ? os : null;
}

const kindFor = (p: SyncPlatform): SourceKind => (p === 'ios' ? 'apple_health' : 'health_connect');

/* eslint-disable @typescript-eslint/no-require-imports */
const defaultDevice = (): DevicePort => (require('./device') as typeof import('./device')).defaultDevice();
const defaultInstallId = (): InstallIdPort => (require('./device') as typeof import('./device')).secureInstallId();
const defaultDriver = async (): Promise<TableDriver> => (require('./store/sqlite-driver') as typeof import('./store/sqlite-driver')).openEncryptedDriver();
const defaultReader = (device: DevicePort): PlatformReader =>
  device.os === 'ios'
    ? (require('./readers/healthkit') as typeof import('./readers/healthkit')).loadHealthKitReader()
    : (require('./readers/health-connect') as typeof import('./readers/health-connect')).loadHealthConnectReader(() => device.timeZone());
const defaultScheduler: NonNullable<HealthSyncPorts['scheduler']> = (platform, run) => (require('./background') as typeof import('./background')).createScheduler(platform, run);
const defaultUuid = (): string => (require('expo-crypto') as typeof import('expo-crypto')).randomUUID();
/* eslint-enable @typescript-eslint/no-require-imports */

export function createHealthSync(ports: HealthSyncPorts = {}) {
  const auth = ports.auth ?? signedOutAuthStub;
  const appConfig = ports.appConfig ?? flagOffConfigStub;
  const http = ports.http ?? fetchHttp;
  const clock = ports.clock ?? systemClock;
  const logger = ports.logger ?? consoleLogger;
  const gateway: GatewayClient = createGatewayClient(ports.config ?? envConfig, http, auth);
  const installIdPort = ports.installId ?? defaultInstallId();

  let device: DevicePort | null = null;
  let reader: PlatformReader | null = null;
  let store: HealthStore | null = null;
  let engine: SyncEngine | null = null;
  let scheduler: SchedulerPort | null = null;
  let state: HealthSyncState = initialState();
  let flagWasOn = false;
  let running: Promise<PassResult> | null = null;
  const listeners = new Set<() => void>();

  const emit = (patch: Partial<HealthSyncState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };
  const getDevice = () => (device ??= (ports.device ?? defaultDevice)());
  const platform = (): SyncPlatform | null => platformOf(getDevice().os);
  const flagOn = (): boolean => {
    const p = platform();
    return p !== null && appConfig.getFlag('health_sync', p);
  };
  const getReader = () => (reader ??= (ports.reader ?? defaultReader)(getDevice()));
  const getStore = async () => (store ??= new HealthStore(await (ports.driver ?? defaultDriver)()));
  const getScheduler = (p: SyncPlatform) => (scheduler ??= (ports.scheduler ?? defaultScheduler)(p, (o) => syncNow(o)));

  const getEngine = async (): Promise<SyncEngine> => {
    if (engine) return engine;
    const d = getDevice();
    const installId = await installIdPort.get();
    const source = sourceFor(d.os, { install_id: installId, os_version: d.osVersion, app_version: d.appVersion, manufacturer: d.manufacturer, model: d.model });
    const s = await getStore();
    engine = new SyncEngine(
      { store: s, reader: getReader(), gateway, auth, clock, logger, source, os: d.os, deviceTz: () => d.timeZone(), uuid: ports.uuid ?? defaultUuid, rand: ports.rand },
      {
        onNotConsented: (cat) => {
          emit({ consent: { ...state.consent, [cat]: 'not_granted' } });
          void persistConsent();
        },
        onConsentMap: (map) => {
          emit({ consent: { ...state.consent, ...map } });
          void persistConsent();
        },
        onSourceState: (st) => emit({ source_state: st }),
        onPaused: (reason) => void setPaused(reason),
        onSuccess: (at) => emit({ last_success_at: at }),
        count: (code, n = 1) => emit({ diagnostics: { ...state.diagnostics, counts: { ...state.diagnostics.counts, [code]: (state.diagnostics.counts[code] ?? 0) + n } } }),
        flag: (name, details) =>
          emit({ diagnostics: { ...state.diagnostics, [name]: true, ...(details && details.length ? { invalid_details: details } : {}) } }),
      },
    );
    return engine;
  };

  let currentScope: Scope | null = null;
  const persistConsent = async () => {
    if (store && currentScope) await store.setState(currentScope, 'consent', state.consent);
  };
  const setPaused = async (reason: PausedReason | null) => {
    emit({ paused_reason: reason ?? undefined, phase: reason ? 'paused' : 'idle' });
    if (store && currentScope) await store.setState(currentScope, 'paused', reason ? { reason, app_version: getDevice().appVersion } : null);
  };

  /** Sign-out, member switch or flag off: stop observers, clear background types, delete queued rows. */
  const stopAndWipe = async (keepUserId: string | null) => {
    await scheduler?.clear().catch(() => undefined);
    if (store) await store.wipeOtherMembers(keepUserId);
    emit({ queued: 0, phase: 'idle' });
  };

  /** Flag switched off after being on: queued records go, committed anchors stay (readers rewind to them). */
  const onFlagOff = async () => {
    await scheduler?.clear().catch(() => undefined);
    if (engine && currentScope) await engine.pauseSource(currentScope);
    if (store && currentScope) await store.purge(currentScope, () => true);
    emit({ flag: false, queued: 0, phase: 'idle' });
  };

  const contractCheck = async (s: HealthStore): Promise<Set<string> | null> => {
    const appVersion = getDevice().appVersion;
    const cached = await s.getState<{ app_version: string; allowed: string[] }>(null, 'contract_check');
    if (cached && cached.app_version === appVersion) return new Set(cached.allowed);
    const res = await gateway.get(PATHS.contract);
    if ('error' in res || res.status !== 200) return null;
    const body = res.json as { ok?: boolean; supported_majors?: number[]; catalogue?: { codes: { type: string; unit: string }[] }[] } | undefined;
    if (!body?.ok || !body.supported_majors?.includes(CONTRACT_MAJOR)) {
      await setPaused('upgrade_required');
      return null;
    }
    const server = new Map<string, string>();
    for (const cat of body.catalogue ?? []) for (const c of cat.codes ?? []) server.set(c.type, c.unit);
    const p = platform() as SyncPlatform;
    const allowed = entriesFor(p).filter((e) => server.get(e.type) === e.unit).map((e) => e.type);
    await s.setState(null, 'contract_check', { app_version: appVersion, allowed });
    return new Set(allowed);
  };

  async function pass(opts: { background: boolean; budgetMs: number }): Promise<PassResult> {
    const p = platform();
    if (p === null) return { ran: false, reason: 'unsupported_platform' };
    if (!flagOn()) {
      if (flagWasOn) await onFlagOff();
      flagWasOn = false;
      emit({ flag: false });
      return { ran: false, reason: 'flag_off' };
    }
    flagWasOn = true;
    const session = await auth.getSession();
    emit({ flag: true, signedIn: !!session });
    if (!session) return { ran: false, reason: 'signed_out' };

    const r = getReader();
    const available = await r.available();
    emit({ platformAvailable: available, os_permission_withdrawable_in_app: p === 'android' });
    const s = await getStore();
    const e = await getEngine();
    const owner = `${opts.background ? 'bg' : 'fg'}:${clock.now()}`;
    if (!(await s.tryLease(owner, clock.now(), LEASE_MS))) return { ran: false, reason: 'busy' };
    try {
      const lastUser = await s.getState<string>(null, 'last_user');
      if (lastUser && lastUser !== session.user_id) await stopAndWipe(session.user_id);
      await s.setState(null, 'last_user', session.user_id);
      const scope = e.scopeFor(session.user_id);
      currentScope = scope;

      // Paused states and when they clear.
      const paused = await s.getState<{ reason: PausedReason; app_version: string } | null>(scope, 'paused');
      let reason = paused?.reason ?? null;
      if (reason === 'auth_paused' && !opts.background) reason = null;
      if ((reason === 'upgrade_required' || reason === 'client_error') && paused?.app_version !== getDevice().appVersion) reason = null;
      if (reason !== (paused?.reason ?? null)) await setPaused(reason);
      if (reason) {
        emit({ paused_reason: reason, phase: 'paused' });
        return { ran: false, reason: 'paused' };
      }

      const savedConsent = await s.getState<HealthSyncState['consent']>(scope, 'consent');
      if (savedConsent) emit({ consent: { ...state.consent, ...savedConsent } });
      if (!opts.background) {
        const view = await consent.fetchConsents(gateway);
        if (view) {
          const granted = consent.grantedCategories(view, kindFor(p));
          const map = Object.fromEntries(CATEGORIES.map((c) => [c, granted.has(c) ? 'granted' : 'not_granted'])) as HealthSyncState['consent'];
          for (const c of CATEGORIES) if (state.consent[c] === 'granted' && map[c] === 'not_granted') await e.notConsented(scope, c);
          emit({ consent: map });
          await persistConsent();
        }
      }

      await s.recoverQueueLoss(scope);
      await s.indexSweep(scope, clock.now());
      await s.ledgerPrune(scope, clock.now() - LEDGER_KEEP_MS);

      const allowed = await contractCheck(s);
      const consented = CATEGORIES.filter((c) => state.consent[c] === 'granted');
      // Android: also when Health Connect is gone (→ os_permission_revoked once). iOS: never posts.
      const os = p === 'android' || available ? await reconcileOsPermission({ reader: r, gateway, store: s, scope, kind: kindFor(p), consented }) : { permitted: [] as Category[], history: false, background: false, posted: null };
      emit({ os_permission: Object.fromEntries(CATEGORIES.map((c) => [c, p === 'ios' ? 'unknown' : os.permitted.includes(c) ? 'granted' : consented.includes(c) ? 'denied' : 'unknown'])) as HealthSyncState['os_permission'] });

      let read = 0;
      const canRead = allowed !== null && available && (p !== 'ios' || (r.dataAccessible?.() ?? true)) && (!opts.background || p === 'ios' || os.background);
      if (canRead && allowed) {
        emit({ phase: 'syncing' });
        for (const c of os.permitted) read += await e.readCategory(scope, c, { allowedTypes: allowed, history: os.history });
        read += await e.processDeferrals(scope, allowed);
      }

      let sent = 0;
      const started = clock.now();
      const maxBatches = opts.background ? MAX_BATCHES_BACKGROUND : MAX_BATCHES_FOREGROUND;
      while (sent < maxBatches && clock.now() - started < opts.budgetMs) {
        const outcome = await e.sendOne(scope);
        if (outcome !== 'sent') break;
        sent += 1;
      }
      emit({ queued: await s.queueSize(scope), phase: state.paused_reason ? 'paused' : 'idle' });
      if (consented.length > 0) await getScheduler(p).register(os.permitted);
      return { ran: true, read, sent };
    } finally {
      await s.releaseLease(owner);
    }
  }

  /** One pass at a time in this process (the store lease covers other processes). */
  function syncNow(opts: { background?: boolean; budgetMs?: number } = {}): Promise<PassResult> {
    if (running) return running;
    running = pass({ background: opts.background ?? false, budgetMs: opts.budgetMs ?? FOREGROUND_BUDGET_MS }).finally(() => {
      running = null;
    });
    return running;
  }

  const sourceKind = (): SourceKind | null => {
    const p = platform();
    return p ? kindFor(p) : null;
  };

  const api = {
    /** Snapshot for the hook. */
    snapshot: (): HealthSyncState => state,
    /** Refreshes consent (GET /consents) and source state (GET /status) — read-only, flag on and signed in only. */
    async getState(): Promise<HealthSyncState> {
      const kind = sourceKind();
      if (!kind || !flagOn()) return state;
      const session = await auth.getSession();
      emit({ flag: true, signedIn: !!session });
      if (!session) return state;
      const view = await consent.fetchConsents(gateway);
      if (view) {
        const granted = consent.grantedCategories(view, kind);
        emit({ consent: Object.fromEntries(CATEGORIES.map((c) => [c, granted.has(c) ? 'granted' : 'not_granted'])) as HealthSyncState['consent'] });
      }
      const st = await gateway.get(PATHS.status, statusQuery(kind, await installIdPort.get()));
      if (!('error' in st) && st.status === 200) {
        const b = st.json as { source_state?: string } | undefined;
        if (b?.source_state) emit({ source_state: b.source_state });
      }
      return state;
    },
    async grantConsent(category: Category, shown: { text_version: string; shown_locale: string }): Promise<consent.GrantResult | { status: 'disabled' }> {
      const kind = sourceKind();
      if (!kind || !flagOn() || !(await auth.getSession())) return { status: 'disabled' };
      const r = await consent.grantConsent(gateway, kind, category, shown);
      if (r.status === 'granted') {
        emit({ consent: { ...state.consent, [category]: 'granted' } });
        await persistConsent();
      }
      return r;
    },
    /** Always reaches the gateway (withdrawal never depends on the flag); local data of that category goes at once. */
    async revokeConsent(category: Category, locale?: string): Promise<consent.RevokeResult> {
      const kind = sourceKind();
      if (!kind) return { status: 'error', code: 'unsupported_platform' };
      const r = await consent.revokeConsent(gateway, kind, category, locale);
      if (engine && currentScope) await engine.notConsented(currentScope, category);
      emit({ consent: { ...state.consent, [category]: 'not_granted' } });
      await persistConsent();
      const remaining = CATEGORIES.filter((c) => state.consent[c] === 'granted');
      if (scheduler) {
        if (remaining.length === 0) await scheduler.clear();
        else await scheduler.register(remaining);
      }
      return r;
    },
    async requestOsPermission(categories: readonly Category[]): Promise<consent.PermissionResult | { status: 'disabled' }> {
      const p = platform();
      if (!p || !flagOn() || !(await auth.getSession())) return { status: 'disabled' };
      return consent.requestOsPermission(gateway, getReader, p, kindFor(p), categories);
    },
    /** Re-enable after a pause: tells the server the source is active again, then syncs. */
    async connect(): Promise<PassResult> {
      const p = platform();
      if (!p || !flagOn()) return { ran: false, reason: 'flag_off' };
      const session = await auth.getSession();
      if (!session) return { ran: false, reason: 'signed_out' };
      const s = await getStore();
      const e = await getEngine();
      currentScope = e.scopeFor(session.user_id);
      if (state.paused_reason === 'source_paused' || (await s.getState<{ reason: string } | null>(currentScope, 'paused'))?.reason === 'source_paused') {
        const permitted = CATEGORIES.filter((c) => state.consent[c] === 'granted');
        await gateway.postJson(PATHS.sourceState, { source_kind: kindFor(p), install_id: currentScope.install_id, state: 'active', permitted_categories: permitted });
        await setPaused(null);
      }
      return syncNow();
    },
    /** Disconnect: revokes every sync_* consent for this source (iOS cannot withdraw the OS permission from code). */
    async disconnect(): Promise<void> {
      for (const c of CATEGORIES) await api.revokeConsent(c);
      await scheduler?.clear().catch(() => undefined);
    },
    syncNow,
    onStateChange(cb: () => void): () => void {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    /** App start: clears `server_disabled`, follows sign-in/out and flag changes, runs a foreground pass. */
    start(): () => void {
      const offAuth = auth.onChange(async (s) => {
        if (!s) {
          currentScope = null;
          await stopAndWipe(null);
          emit({ signedIn: false });
        } else void syncNow();
      });
      const offConfig = appConfig.onChange(() => {
        if (state.paused_reason === 'server_disabled') void setPaused(null);
        void syncNow();
      });
      void (async () => {
        await clearServerDisabledOnStart();
        await syncNow();
      })();
      return () => {
        offAuth();
        offConfig();
      };
    },
  };

  async function clearServerDisabledOnStart() {
    if (!flagOn()) return;
    const session = await auth.getSession();
    if (!session) return;
    const s = await getStore();
    const e = await getEngine();
    const scope = e.scopeFor(session.user_id);
    const paused = await s.getState<{ reason: PausedReason } | null>(scope, 'paused');
    if (paused?.reason === 'server_disabled') {
      currentScope = scope;
      await setPaused(null);
    }
  }

  return api;
}

export type HealthSync = ReturnType<typeof createHealthSync>;

/** State only, no UI, no strings. */
export function useHealthSyncState(sync: HealthSync): HealthSyncState {
  return useSyncExternalStore(sync.onStateChange, sync.snapshot, sync.snapshot);
}
