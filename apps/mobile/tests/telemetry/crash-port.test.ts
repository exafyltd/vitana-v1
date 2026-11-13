/**
 * VTID-05659 — crash-free session port (native Wave 3, lane crash-port).
 * Pure unit tests: no SDK, no network, no timers.
 */
import {
  NoopCrashProvider,
  endSession,
  getCrashProvider,
  isSessionActive,
  setCrashProvider,
  startSession,
  type CrashProvider,
} from '../../src/telemetry/crash-port';

function fakeProvider(overrides: Partial<CrashProvider> = {}) {
  const calls: Array<['start'] | ['end', boolean]> = [];
  const provider: CrashProvider = {
    isAvailable: () => true,
    startSession: () => {
      calls.push(['start']);
    },
    endSession: (crashed) => {
      calls.push(['end', crashed]);
    },
    ...overrides,
  };
  return { provider, calls };
}

describe('crash port', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    setCrashProvider(NoopCrashProvider);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    setCrashProvider(NoopCrashProvider);
    warn.mockRestore();
  });

  it('defaults to the no-op provider, which is unavailable', () => {
    expect(getCrashProvider()).toBe(NoopCrashProvider);
    expect(NoopCrashProvider.isAvailable()).toBe(false);
  });

  it('the default provider sends nothing and never throws', () => {
    const fetchSpy = jest.fn();
    const g = globalThis as unknown as { fetch?: unknown };
    const original = g.fetch;
    g.fetch = fetchSpy;
    try {
      expect(() => startSession()).not.toThrow();
      expect(() => endSession(true)).not.toThrow();
    } finally {
      g.fetch = original;
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('forwards session start to the installed provider', () => {
    const { provider, calls } = fakeProvider();
    setCrashProvider(provider);
    startSession();
    expect(calls).toEqual([['start']]);
    expect(isSessionActive()).toBe(true);
  });

  it('forwards a clean session end with crashed=false', () => {
    const { provider, calls } = fakeProvider();
    setCrashProvider(provider);
    startSession();
    endSession(false);
    expect(calls).toEqual([['start'], ['end', false]]);
    expect(isSessionActive()).toBe(false);
  });

  it('forwards a crashed session end with crashed=true', () => {
    const { provider, calls } = fakeProvider();
    setCrashProvider(provider);
    startSession();
    endSession(true);
    expect(calls).toEqual([['start'], ['end', true]]);
  });

  it('ignores a second start while a session is active', () => {
    const { provider, calls } = fakeProvider();
    setCrashProvider(provider);
    startSession();
    startSession();
    expect(calls).toEqual([['start']]);
  });

  it('ignores an end with no active session', () => {
    const { provider, calls } = fakeProvider();
    setCrashProvider(provider);
    endSession(true);
    expect(calls).toEqual([]);
  });

  it('allows a new session after the previous one ended', () => {
    const { provider, calls } = fakeProvider();
    setCrashProvider(provider);
    startSession();
    endSession(false);
    startSession();
    expect(calls).toEqual([['start'], ['end', false], ['start']]);
  });

  it('swallows and logs a provider error on start', () => {
    const { provider } = fakeProvider({
      startSession: () => {
        throw new Error('sdk exploded');
      },
    });
    setCrashProvider(provider);
    expect(() => startSession()).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('swallows and logs a provider error on end, and still closes the session', () => {
    const { provider } = fakeProvider({
      endSession: () => {
        throw new Error('sdk exploded');
      },
    });
    setCrashProvider(provider);
    startSession();
    expect(() => endSession(true)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(isSessionActive()).toBe(false);
  });

  it('swallows a provider that rejects asynchronously', async () => {
    const { provider } = fakeProvider({
      endSession: () => Promise.reject(new Error('async boom')) as unknown as void,
    });
    setCrashProvider(provider);
    startSession();
    expect(() => endSession(false)).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('switching provider resets the active session', () => {
    const a = fakeProvider();
    const b = fakeProvider();
    setCrashProvider(a.provider);
    startSession();
    setCrashProvider(b.provider);
    expect(isSessionActive()).toBe(false);
    startSession();
    expect(b.calls).toEqual([['start']]);
  });
});
