/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the 11 commerce
 * destinations on a cold start: each has its own route file (no resolver
 * fallback, no shadowing file), Expo Router really lands on it from a deep
 * link (the connect/authorize and invite/accept links included), the parity
 * rows are `native`, the business bottom tabs come with the business routes
 * (design §2a), and the role-switch landing helper from `@vitana/core`.
 */
import '../helpers/no-network';
import './helpers';

// Only the storage double: Expo Router itself stays real here (the cold-start ranking is the point).
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { resolveWebPath } from '../../src/navigation/resolve';
import { isGuestPath } from '../../src/shell/AuthGate';
import { BUSINESS_ROUTES, businessHomeFor, getRoleSwitchDestination, isBusinessRoute, isExternalRoleSwitchDestination, resolveBusinessBottomNav } from '../../src/ports/core';
import { resolveBottomNav, shouldHideBottomNav } from '../../src/shell/logic/bottom-nav';

const APP = join(__dirname, '../../app');
const ledger = JSON.parse(readFileSync(join(__dirname, '../../parity/ledger.json'), 'utf8')) as { rows: Array<{ web_path: string; lane: string; status: string; scope: string; source: string }> };

const ROUTE_FILES: Record<string, string> = {
  '/commerce': '(app)/commerce/index.tsx',
  '/commerce-login': '(public)/commerce-login.tsx',
  '/commerce/connect': '(public)/commerce/connect/index.tsx',
  '/commerce/connect/privacy': '(public)/commerce/connect/privacy.tsx',
  '/commerce/connect/authorize': '(app)/commerce/connect/authorize.tsx',
  '/commerce/connections/:id': '(app)/commerce/connections/[id].tsx',
  '/commerce/health-orders': '(app)/commerce/health-orders/index.tsx',
  '/commerce/health-orders/inbox': '(app)/commerce/health-orders/inbox.tsx',
  '/commerce/invites/:token/accept': '(app)/commerce/invites/[token]/accept.tsx',
  '/commerce/join': '(public)/commerce/join.tsx',
  '/commerce/team': '(app)/commerce/team.tsx',
};

describe('the 11 commerce rows', () => {
  const rows = ledger.rows.filter((r) => r.lane === 'role-modes' && (r.web_path === '/commerce' || r.web_path === '/commerce-login' || r.web_path.startsWith('/commerce/')));

  it('are exactly the lane\'s rows, all native, scope unchanged (the exclusion row included)', () => {
    expect(rows.map((r) => r.web_path).sort()).toEqual(Object.keys(ROUTE_FILES).sort());
    expect(rows.every((r) => r.status === 'native' && r.scope === 'in')).toBe(true);
    expect(rows.find((r) => r.web_path === '/commerce/connect/authorize')?.source).toBe('exclusion');
  });

  it.each(Object.entries(ROUTE_FILES))('%s has its own route file %s', (_path, file) => {
    expect(existsSync(join(APP, file))).toBe(true);
  });

  it.each(['/commerce', '/commerce-login', '/commerce/connect', '/commerce/connect/privacy', '/commerce/connect/authorize', '/commerce/health-orders', '/commerce/health-orders/inbox', '/commerce/join', '/commerce/team'])('%s resolves native (query kept)', (path) => {
    const r = resolveWebPath(`${path}?x=1`);
    expect(r.kind).toBe('native');
    expect(r.href).toBe(`${path}?x=1`);
  });

  it('/commerce stays a guest destination (App.tsx allowGuest)', () => {
    expect(isGuestPath('/commerce')).toBe(true);
  });
});

describe('Expo Router lands on the commerce files from a deep link (cold start)', () => {
  const routes = {
    index: () => <Text>landing</Text>,
    '(app)/[...path]': () => <Text>resolver-route</Text>,
    '(app)/commerce/index': () => <Text>portal</Text>,
    '(app)/commerce/team': () => <Text>team</Text>,
    '(app)/commerce/health-orders/index': () => <Text>orders</Text>,
    '(app)/commerce/health-orders/inbox': () => <Text>inbox</Text>,
    '(app)/commerce/connections/[id]': () => <Text>connection-redirect</Text>,
    '(app)/commerce/invites/[token]/accept': () => <Text>accept-invite</Text>,
    '(app)/commerce/connect/authorize': () => <Text>authorize</Text>,
    '(public)/commerce/join': () => <Text>join</Text>,
    '(public)/commerce/connect/index': () => <Text>connect-docs</Text>,
    '(public)/commerce/connect/privacy': () => <Text>connect-privacy</Text>,
    '(public)/commerce-login': () => <Text>commerce-login</Text>,
  };
  it.each([
    ['/commerce', 'portal'],
    ['/commerce?connection=c-1', 'portal'],
    ['/commerce/team', 'team'],
    ['/commerce/health-orders', 'orders'],
    ['/commerce/health-orders/inbox', 'inbox'],
    ['/commerce/connections/c-1', 'connection-redirect'],
    ['/commerce/invites/tok-123/accept', 'accept-invite'],
    ['/commerce/connect/authorize?authorization_id=az-1', 'authorize'],
    ['/commerce/join?redirectTo=%2Fcommerce', 'join'],
    ['/commerce/connect', 'connect-docs'],
    ['/commerce/connect/privacy?lang=en', 'connect-privacy'],
    ['/commerce-login', 'commerce-login'],
  ])('%s → %s', (url, label) => {
    renderRouter(routes, { initialUrl: url });
    expect(screen.getByText(label)).toBeTruthy();
  });
});

describe('business mode chrome (design §2a): bottom tabs from @vitana/core business-mode', () => {
  it('every in-app business route is a business-mode route; join and invite are not', () => {
    for (const p of ['/commerce', '/commerce/team', '/commerce/health-orders', '/commerce/health-orders/inbox', '/commerce/connect/authorize', '/commerce/connections/c-1']) expect(isBusinessRoute(p)).toBe(true);
    expect(isBusinessRoute('/commerce/join')).toBe(false);
    expect(isBusinessRoute('/commerce/invites/t/accept')).toBe(false);
  });

  it.each([
    ['org_admin', ['business-overview', 'business-team', 'business-orders', 'settings']],
    ['staff', ['business-overview', 'business-orders', 'business-inbox', 'settings']],
    ['professional', ['business-overview', 'business-orders', 'inbox', 'settings']],
  ])('%s: the business bar replaces the community / role bar and stays visible on the business pages', (role, ids) => {
    const bar = resolveBottomNav('community', { role });
    expect(bar.items.map((i) => i.id)).toEqual(ids);
    expect(resolveBusinessBottomNav(role).map((i) => i.path)).toContain(BUSINESS_ROUTES.overview);
    for (const p of ['/commerce', '/commerce/team', '/commerce/health-orders', '/commerce/health-orders/inbox']) expect(shouldHideBottomNav(p, true)).toBe(false);
  });

  it('the business homes the switcher and the invite land on are native screens', () => {
    expect(businessHomeFor('org_admin')).toBe('/commerce/team');
    expect(businessHomeFor('staff')).toBe('/commerce/health-orders');
    for (const r of ['org_admin', 'staff', 'professional']) expect(resolveWebPath(businessHomeFor(r)).kind).toBe('native');
  });
});

describe('role-switch-destination (src/lib/role-switch-destination.ts via @vitana/core)', () => {
  it.each([
    ['community', '/home'],
    ['patient', '/patient/dashboard'],
    ['professional', '/professional/dashboard'],
    ['staff', '/admin'],
    ['admin', '/admin'],
    ['backoffice', '/backoffice/dashboard'],
    // developer / infra are MOBILE_EXCLUDED_ROLES; the Command Hub URL is not configured natively → /home.
    ['developer', '/home'],
    ['infra', '/home'],
  ] as const)('%s → %s', (role, want) => {
    expect(getRoleSwitchDestination(role)).toBe(want);
  });

  it('tells an absolute (cross-origin) destination from an in-app route', () => {
    expect(isExternalRoleSwitchDestination('https://gateway.example/command-hub/')).toBe(true);
    expect(isExternalRoleSwitchDestination('/home')).toBe(false);
  });
});
