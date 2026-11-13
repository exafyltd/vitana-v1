/** VTID-05648 — AnalyticsTracker: consent from auth, SHA-256 user hash, one screen_viewed per path change. No network. */
import { act, render, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

let mockPath = '/home';
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPath,
  useGlobalSearchParams: () => mockParams,
}));
let mockUser: { id: string } | null = null;
jest.mock('../../src/auth/AuthProvider', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../src/identity/TenantProvider', () => ({ useTenant: () => ({ activeTenantId: 't-1' }) }));
jest.mock('../../src/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'de' }) }));
const mockSetContext = jest.fn();
const mockTrack = jest.fn();
const mockNote = jest.fn();
jest.mock('../../src/analytics/client', () => ({
  setAnalyticsContext: (...a: unknown[]) => mockSetContext(...a),
  track: (...a: unknown[]) => mockTrack(...a),
  noteRouteChange: (...a: unknown[]) => mockNote(...a),
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_alg: string, v: string) => `sha(${v})`),
  randomUUID: jest.fn(() => 'n'),
}));

import { AnalyticsTracker } from '../../src/analytics/AnalyticsTracker';

let last: string | null = null;
beforeEach(() => {
  jest.clearAllMocks();
  mockPath = '/home';
  mockParams = {};
  mockUser = null;
  last = null;
  mockNote.mockImplementation((r: string) => {
    const p = last;
    last = r;
    return p;
  });
});
const wrap = (n: ReactElement) => n;

it('signed out → anonymous with no user hash', async () => {
  render(wrap(<AnalyticsTracker />));
  await waitFor(() => expect(mockSetContext).toHaveBeenCalledWith({ userIdHash: null, consent: 'anonymous' }));
  expect(mockSetContext).toHaveBeenCalledWith({ tenantId: 't-1', language: 'de' });
  expect(mockSetContext).not.toHaveBeenCalledWith(expect.objectContaining({ consent: 'granted' }));
});

it('signed in → granted with the SHA-256 hex of the id, never the raw id', async () => {
  mockUser = { id: 'user-1' };
  render(wrap(<AnalyticsTracker />));
  await waitFor(() => expect(mockSetContext).toHaveBeenCalledWith({ userIdHash: 'sha(user-1)', consent: 'granted' }));
  expect(JSON.stringify(mockSetContext.mock.calls)).not.toContain('"user-1"');
});

it('hash failure → no hash, anonymous (the id never leaves)', async () => {
  const Crypto = jest.requireMock('expo-crypto');
  Crypto.digestStringAsync.mockRejectedValueOnce(new Error('x'));
  mockUser = { id: 'user-1' };
  render(wrap(<AnalyticsTracker />));
  await waitFor(() => expect(mockSetContext).toHaveBeenCalledWith({ userIdHash: null, consent: 'anonymous' }));
});

it('one screen_viewed per path change with previous_route and search_present', async () => {
  const view = render(wrap(<AnalyticsTracker />));
  expect(mockTrack).toHaveBeenCalledTimes(1);
  expect(mockTrack).toHaveBeenLastCalledWith('screen_viewed', { event_type: 'journey', properties: { previous_route: null, search_present: false } });
  mockParams = { tab: 'all' };
  view.rerender(wrap(<AnalyticsTracker />));
  expect(mockTrack).toHaveBeenCalledTimes(1);
  mockPath = '/comm/live-rooms';
  await act(async () => view.rerender(wrap(<AnalyticsTracker />)));
  expect(mockTrack).toHaveBeenCalledTimes(2);
  expect(mockTrack).toHaveBeenLastCalledWith('screen_viewed', { event_type: 'journey', properties: { previous_route: '/home', search_present: true } });
  await act(async () => view.rerender(wrap(<AnalyticsTracker />)));
  expect(mockTrack).toHaveBeenCalledTimes(2);
});
