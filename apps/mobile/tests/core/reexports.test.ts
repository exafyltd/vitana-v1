/** VTID-05183 — re-exported web modules run under React Native (registry, ORB navigation, data routing, permissions). */
import { readFileSync } from 'fs';
import { join } from 'path';
import { SCREENS, getScreen, REGISTRY_LOCALES, screenTitle } from '@vitana/core/registry';
import { planOrbNavigation, eventForMarker } from '@vitana/core/orb-navigation';
import { createDataFetch } from '@vitana/core/data-routing';
import { getPermissions, canSwitchRole, canSwitchTenant } from '@vitana/core/permissions';

const SCREENS_JSON = join(__dirname, '../../../../src/navigation/registry/screens.json');
const desk = { isMobile: false };
const mob = { isMobile: true };

describe('registry', () => {
  it('SCREENS is the whole screens.json', () => {
    const file = JSON.parse(readFileSync(SCREENS_JSON, 'utf8')) as { screens: unknown[] };
    expect(SCREENS.length).toBe(file.screens.length);
    expect(SCREENS.length).toBeGreaterThan(0);
    expect(getScreen(SCREENS[0].id)).toBe(SCREENS[0]);
    expect(REGISTRY_LOCALES).toContain('de');
    expect(screenTitle(SCREENS[0], 'de')).toBeTruthy();
  });
});

describe('planOrbNavigation under React Native (URL / URLSearchParams)', () => {
  it.each([
    ['/memory/diary', { screen_id: 'MEMORY.DIARY' }, mob, { kind: 'route', url: '/daily-diary?tab=health' }],
    ['/memory/diary', { screen_id: 'MEMORY.DIARY' }, desk, { kind: 'route', url: '/memory/diary' }],
    ['/memory/diary?x=1', { screen_id: 'MEMORY.DIARY' }, mob, { kind: 'route', url: '/daily-diary?tab=health&x=1' }],
    ['/somewhere?x=1', {}, desk, { kind: 'route', url: '/somewhere?x=1' }],
    ['/home?open=nope', {}, desk, { kind: 'route', url: '/home?open=nope' }],
    ['/home?open=wallet', { screen_id: 'OVERLAY.WALLET_POPUP', entry_kind: 'overlay' }, desk, { kind: 'overlay', event: 'wallet:open', detail: { open: 'wallet' }, ensureRoute: undefined }],
    ['/inbox/archived', {}, mob, { kind: 'refuse', reason: 'desktop-only route on mobile' }],
    ['/command-hub/x', {}, desk, { kind: 'refuse', reason: 'command-hub is developer-only' }],
  ])('%s %j', (url, ctx, opts, expected) => {
    expect(planOrbNavigation(url, ctx, opts)).toEqual(expected);
  });

  it('settings markers open Settings first and keep the query', () => {
    expect(planOrbNavigation('/settings?open=settings_section&section=privacy.security', {}, mob)).toMatchObject({
      kind: 'overlay',
      event: 'vitana:settings-navigate',
      ensureRoute: '/settings',
      detail: { section: 'privacy.security' },
    });
    expect(eventForMarker('goals')).toBe('vitana:open-life-compass');
  });
});

describe('data routing and permissions', () => {
  it('createDataFetch rewrites only PostgREST', async () => {
    const seen: string[] = [];
    const f = createDataFetch('https://p.example.org', 'https://d.example.org', async (input) => {
      seen.push(String(input));
      return new Response('{}');
    });
    await f('https://p.example.org/rest/v1/x?select=*');
    await f('https://p.example.org/auth/v1/user');
    expect(seen).toEqual(['https://d.example.org/rest/v1/x?select=*', 'https://p.example.org/auth/v1/user']);
  });

  it('permissions follow app_metadata.exafy_admin', () => {
    const admin = getPermissions({ user: { app_metadata: { exafy_admin: true } } });
    const member = getPermissions({ user: { app_metadata: {} } });
    expect(canSwitchTenant(admin)).toBe(true);
    expect(canSwitchTenant(member)).toBe(false);
    expect(canSwitchRole(member)).toBe(true);
  });
});
