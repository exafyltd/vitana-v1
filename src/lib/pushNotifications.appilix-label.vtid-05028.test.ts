/**
 * VTID-05028 — Appilix devices register once, with their "Appilix …" label.
 *
 * Inside the Appilix app the native token must be registered by an AWAITED
 * registerAppilixDevice() only. The plain registerTokenWithBackend() (bare
 * user-agent label) must never run there — it used to race the Appilix call
 * and overwrite the label. Covered for all three call sites: subscribe(), the
 * 30-min refresh monitor, and the `appilix:fcm_token` listener. Browsers keep
 * using registerTokenWithBackend().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const appilix = vi.hoisted(() => ({
  isAppilix: vi.fn(() => true),
  waitForAppilixBridge: vi.fn(async () => false),
  getNativeFcmToken: vi.fn((): string | null => null),
  requestNativeFcmTokenFromBridge: vi.fn(async (): Promise<string | null> => null),
  showNativeNotification: vi.fn(),
  registerAppilixIdentity: vi.fn(() => true),
}));
const firebase = vi.hoisted(() => ({
  requestFCMToken: vi.fn(async (): Promise<string | null> => null),
  onForegroundMessage: vi.fn(async () => () => {}),
}));

vi.mock('@/lib/appilix', () => appilix);
vi.mock('./firebase', () => firebase);
vi.mock('@/lib/firebase', () => firebase);
vi.mock('@/lib/gateway-base', () => ({ GATEWAY_BASE: 'https://gateway.test' }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'jwt' } } })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    })),
  },
}));

type Mgr = {
  subscribe: () => Promise<string | null>;
  registerAppilixDevice: (t?: string) => Promise<void>;
  registerTokenWithBackend: (t: string) => Promise<void>;
  startTokenRefreshMonitor: () => void;
  attachAppilixTokenListener: () => void;
  refreshInterval: ReturnType<typeof setInterval> | null;
  isSupported: boolean;
  fcmToken: string | null;
};

let mgr: Mgr;
let appilixSpy: ReturnType<typeof vi.fn>;
let plainSpy: ReturnType<typeof vi.fn>;

async function freshManager(): Promise<void> {
  vi.resetModules();
  const mod = await import('./pushNotifications');
  mgr = mod.pushNotificationManager as unknown as Mgr;
  appilixSpy = vi.spyOn(mgr, 'registerAppilixDevice').mockResolvedValue(undefined) as unknown as ReturnType<typeof vi.fn>;
  plainSpy = vi.spyOn(mgr, 'registerTokenWithBackend').mockResolvedValue(undefined) as unknown as ReturnType<typeof vi.fn>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  appilix.isAppilix.mockReturnValue(true);
  appilix.getNativeFcmToken.mockReturnValue(null);
  appilix.requestNativeFcmTokenFromBridge.mockResolvedValue(null);
  firebase.requestFCMToken.mockResolvedValue(null);
  await freshManager();
});

afterEach(() => {
  if (mgr?.refreshInterval) clearInterval(mgr.refreshInterval);
  vi.useRealTimers();
});

describe('VTID-05028 — inside Appilix', () => {
  it('subscribe(): registers via an awaited registerAppilixDevice(token), never the plain path', async () => {
    appilix.getNativeFcmToken.mockReturnValue('native-tok');
    let release!: () => void;
    appilixSpy.mockImplementation(() => new Promise<void>((r) => { release = r; }));

    let settled = false;
    const p = mgr.subscribe().then((v) => { settled = true; return v; });
    await vi.waitFor(() => expect(appilixSpy).toHaveBeenCalledWith('native-tok'));
    await Promise.resolve();
    expect(settled).toBe(false); // subscribe() waits for the Appilix registration
    release();

    await expect(p).resolves.toBe('native-tok');
    expect(appilixSpy).toHaveBeenCalledTimes(1);
    expect(plainSpy).not.toHaveBeenCalled();
  });

  it('refresh monitor: a token captured on retry goes through registerAppilixDevice only', async () => {
    vi.useFakeTimers();
    appilix.requestNativeFcmTokenFromBridge.mockResolvedValue('retry-tok');
    mgr.fcmToken = null;
    mgr.startTokenRefreshMonitor();

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);

    expect(appilixSpy).toHaveBeenCalledWith('retry-tok');
    expect(plainSpy).not.toHaveBeenCalled();
  });

  it('appilix:fcm_token listener: registers via registerAppilixDevice only', async () => {
    mgr.attachAppilixTokenListener();
    document.dispatchEvent(new CustomEvent('appilix:fcm_token', { detail: 'event-tok' }));

    await vi.waitFor(() => expect(appilixSpy).toHaveBeenCalledWith('event-tok'));
    expect(plainSpy).not.toHaveBeenCalled();
  });
});

describe('VTID-05028 — browsers unchanged', () => {
  beforeEach(() => {
    appilix.isAppilix.mockReturnValue(false);
    appilix.waitForAppilixBridge.mockResolvedValue(false);
  });

  it('subscribe(): a web FCM token is registered with registerTokenWithBackend', async () => {
    mgr.isSupported = true;
    firebase.requestFCMToken.mockResolvedValue('web-tok');

    await expect(mgr.subscribe()).resolves.toBe('web-tok');

    expect(plainSpy).toHaveBeenCalledWith('web-tok');
    expect(appilixSpy).not.toHaveBeenCalled();
  });

  it('refresh monitor: a rotated web token is registered with registerTokenWithBackend', async () => {
    vi.useFakeTimers();
    firebase.requestFCMToken.mockResolvedValue('rotated-tok');
    mgr.fcmToken = 'old-tok';
    mgr.startTokenRefreshMonitor();

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);

    expect(plainSpy).toHaveBeenCalledWith('rotated-tok');
    expect(appilixSpy).not.toHaveBeenCalled();
  });

  it('appilix:fcm_token listener outside Appilix keeps the plain registration', async () => {
    mgr.attachAppilixTokenListener();
    document.dispatchEvent(new CustomEvent('appilix:fcm_token', { detail: 'event-tok-2' }));

    await vi.waitFor(() => expect(plainSpy).toHaveBeenCalledWith('event-tok-2'));
    expect(appilixSpy).not.toHaveBeenCalled();
  });
});
