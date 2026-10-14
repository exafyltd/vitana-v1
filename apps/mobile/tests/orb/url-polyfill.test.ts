/**
 * VTID-05182 — `react-native-url-polyfill` (N6d, plan Change 17, sparring Q4).
 *
 * Hermes has no `URL`, and React Native's own `Libraries/Blob/URL.js` is not
 * WHATWG: `searchParams` is a copy whose changes never reach `.search`.
 * `planOrbNavigation` sets query parameters through `searchParams` and reads
 * `pathname + search`, so without the polyfill the gateway's `?tab=` would be
 * lost. These are the web's own orb-navigation.test.ts cases, run with the
 * polyfill installed as the global `URL` exactly as app/_layout.tsx does.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { setupURLPolyfill } from 'react-native-url-polyfill';
import { eventForMarker, planOrbNavigation } from '@vitana/core/orb-navigation';

const NodeURL = globalThis.URL;
const NodeURLSearchParams = globalThis.URLSearchParams;
const registry = JSON.parse(readFileSync(join(__dirname, '../../../../src/navigation/registry/screens.json'), 'utf8')).screens as Array<{
  id: string;
  route: string;
  viewport?: string;
  params?: string[];
  overlay?: { marker?: string; event: string };
}>;

beforeAll(() => setupURLPolyfill());
afterAll(() => {
  globalThis.URL = NodeURL;
  globalThis.URLSearchParams = NodeURLSearchParams;
});

const desk = { isMobile: false };
const mob = { isMobile: true };

describe('the polyfill is the URL the planner runs on', () => {
  it('is installed globally', () => {
    expect(globalThis.URL).not.toBe(NodeURL);
    expect((globalThis as { REACT_NATIVE_URL_POLYFILL?: string }).REACT_NATIVE_URL_POLYFILL).toBe('react-native-url-polyfill@4.0.0');
  });

  it('reflects searchParams changes in .search (what React Native 0.86 built-in URL does not)', () => {
    const u = new URL('/daily-diary?tab=health', 'http://x');
    u.searchParams.set('entry', '42');
    expect(u.pathname + u.search).toBe('/daily-diary?tab=health&entry=42');
  });

  it('pins the ?tab= / ?open= merge: gateway params the registry route lacks are kept', () => {
    expect(planOrbNavigation('/memory/diary?entry=42', { screen_id: 'MEMORY.DIARY' }, mob)).toEqual({ kind: 'route', url: '/daily-diary?tab=health&entry=42' });
    expect(planOrbNavigation('/memory/diary?tab=sleep', { screen_id: 'MEMORY.DIARY' }, mob)).toEqual({ kind: 'route', url: '/daily-diary?tab=health' });
  });
});

describe('web orb-navigation.test.ts cases under the polyfill', () => {
  it('uses the registry mobile route for a known screen on mobile', () => {
    expect(planOrbNavigation('/memory/diary', { screen_id: 'MEMORY.DIARY' }, mob)).toEqual({ kind: 'route', url: '/daily-diary?tab=health' });
    expect(planOrbNavigation('/memory/diary', { screen_id: 'MEMORY.DIARY' }, desk)).toEqual({ kind: 'route', url: '/memory/diary' });
  });

  it('refuses a screen that has no layout on this device', () => {
    const desktopOnly = registry.find((s) => s.viewport === 'desktop' && !s.params?.length && !s.overlay);
    if (desktopOnly) expect(planOrbNavigation(desktopOnly.route, { screen_id: desktopOnly.id }, mob).kind).toBe('refuse');
    expect(planOrbNavigation('/inbox/archived', {}, mob).kind).toBe('refuse');
    expect(planOrbNavigation('/command-hub/x', {}, desk).kind).toBe('refuse');
  });

  it('turns every registry overlay marker into its event', () => {
    for (const s of registry.filter((x) => x.overlay?.marker)) {
      expect(eventForMarker(s.overlay!.marker!)).toBe(s.overlay!.event);
    }
    expect(planOrbNavigation('/home?open=wallet', { screen_id: 'OVERLAY.WALLET_POPUP', entry_kind: 'overlay' }, desk)).toEqual({
      kind: 'overlay',
      event: 'wallet:open',
      detail: { open: 'wallet' },
      ensureRoute: undefined,
    });
  });

  it('opens Settings first for a settings section request', () => {
    const p = planOrbNavigation('/settings?open=settings_section&section=privacy.security', {}, mob);
    expect(p).toMatchObject({ kind: 'overlay', event: 'vitana:settings-navigate', ensureRoute: '/settings', detail: { section: 'privacy.security' } });
  });

  it('navigates to the URL for unknown screens and markers', () => {
    expect(planOrbNavigation('/somewhere?x=1', {}, desk)).toEqual({ kind: 'route', url: '/somewhere?x=1' });
    expect(planOrbNavigation('/home?open=nope', {}, desk)).toEqual({ kind: 'route', url: '/home?open=nope' });
  });
});
