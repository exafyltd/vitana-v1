/** VTID-05186 (N3, plan changes 14 + 19) — every web destination resolves; Expo Router really lands there. */
import './helpers/no-network';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';
import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { NATIVE_ROUTES, resolveWebPath, matchPattern } from '../src/navigation/resolve';
import { GUEST_PATHS } from '../src/navigation/guest-paths';

const REPO = join(__dirname, '../../..');
const screens = JSON.parse(readFileSync(join(REPO, 'src/navigation/registry/screens.json'), 'utf8')).screens as Array<{ id: string; route: string; mobileRoute?: string }>;
const exclusions = JSON.parse(readFileSync(join(REPO, 'src/navigation/registry/exclusions.json'), 'utf8')) as { paths: Array<{ path: string }> };
const ledger = JSON.parse(readFileSync(join(__dirname, '../parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; web_path: string; source: string }> };

/** `/inbox/u/:recipient_id?x=1` → `/inbox/u/sample-recipient_id?x=1`. */
const fill = (route: string) => route.replace(/:([A-Za-z_]+)/g, 'sample-$1');

describe('resolveWebPath', () => {
  const cases = [
    ...screens.flatMap((s) => [s.route, ...(s.mobileRoute ? [s.mobileRoute] : [])]),
    ...exclusions.paths.map((p) => p.path),
    ...ledger.rows.filter((r) => r.source === 'role-route').map((r) => r.web_path),
  ].map((r) => fill(r.replace(/\/\*$/, '/sample')));

  it('has cases from every source', () => {
    expect(cases.length).toBeGreaterThan(400);
  });

  it.each([...new Set(cases)])('%s resolves to a native route, Unported or a web console — never not-found', (url) => {
    const r = resolveWebPath(url);
    expect(['native', 'unported', 'external-console']).toContain(r.kind);
  });

  it('keeps the query string', () => {
    expect(resolveWebPath('/settings?mode=billing.plan')).toMatchObject({ kind: 'unported', href: '/settings?mode=billing.plan' });
    expect(resolveWebPath('/inbox/u/abc?from=push')).toMatchObject({ kind: 'unported', href: '/inbox/u/abc?from=push' });
  });

  it('follows a registry route to its mobileRoute', () => {
    expect(resolveWebPath('/settings/billing').href).toBe('/settings?mode=billing');
    expect(resolveWebPath('/settings/billing?section=plan').href).toBe('/settings?mode=billing.plan');
  });

  it('admin destinations are web consoles; native routes are native', () => {
    expect(resolveWebPath('/admin/users').kind).toBe('external-console');
    expect(resolveWebPath('/maxina?redirectTo=%2Fhome')).toMatchObject({ kind: 'native', href: '/maxina?redirectTo=%2Fhome' });
  });

  it('an unknown path is not found', () => {
    expect(resolveWebPath('/definitely/not/a/vitana/page').kind).toBe('not-found');
    expect(resolveWebPath('https://example.org/home').kind).toBe('not-found');
  });

  it('matchPattern: params are one segment, /* is a prefix', () => {
    expect(matchPattern('/inbox/u/:id', '/inbox/u/1')).toBe(true);
    expect(matchPattern('/inbox/u/:id', '/inbox/u/1/x')).toBe(false);
    expect(matchPattern('/admin/*', '/admin')).toBe(true);
    expect(matchPattern('/admin/*', '/admin/a/b')).toBe(true);
  });

  it('guest paths are web destinations too', () => {
    for (const p of GUEST_PATHS) expect(resolveWebPath(fill(p)).kind).not.toBe('not-found');
  });
});

describe('native route list', () => {
  it('NATIVE_ROUTES equals the concrete route files in app/', () => {
    const app = join(__dirname, '../app');
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else {
          const rel = relative(app, full).split(sep).join('/').replace(/\.tsx?$/, '');
          const last = rel.split('/').pop() as string;
          if (last === '_layout' || last.startsWith('+') || /\[/.test(rel)) continue;
          const parts = rel.split('/').filter((s) => !/^\(.*\)$/.test(s) && s !== 'index');
          out.push(`/${parts.join('/')}`);
        }
      }
    };
    walk(app);
    expect([...out].sort()).toEqual([...NATIVE_ROUTES].sort());
  });
});

describe('Expo Router ranks concrete routes above the resolver', () => {
  const routes = {
    index: () => <Text>landing</Text>,
    '(public)/maxina': () => <Text>maxina-route</Text>,
    '(public)/oauth/complete': () => <Text>oauth-route</Text>,
    '(app)/[...path]': () => <Text>resolver-route</Text>,
  };
  it.each([
    ['/maxina', 'maxina-route'],
    ['/oauth/complete', 'oauth-route'],
    ['/inbox/u/abc', 'resolver-route'],
    ['/settings', 'resolver-route'],
    ['/comm/events-meetups', 'resolver-route'],
  ])('%s → %s', (url, label) => {
    renderRouter(routes, { initialUrl: url });
    expect(screen.getByText(label)).toBeTruthy();
  });
});
