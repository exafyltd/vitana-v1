/**
 * VTID-05449 (native-wave2-public-auth-onboarding-r3/auth-portals) — i18n +
 * RTL for the auth screens: every `authPortalsNative` key in all 11 locales
 * (DE first, same key set everywhere), every catalog key the lane's screens
 * name resolves in every locale, no physical left / right in the lane files,
 * the routes are on disk, and the portal renders under `ar`.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react-native';
import { createSupabaseDouble } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { tenantRow } from './helpers';
import { translate } from '../../src/i18n';
import { isStaticDestination, NATIVE_ROUTES } from '../../src/navigation/resolve';
import { ResetPasswordScreen } from '../../src/screens/auth/ResetPasswordScreen';
import { __setSupabaseForTests } from '../../src/auth/client';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn() },
  usePathname: () => '/reset-password',
  useLocalSearchParams: () => ({}),
}));

afterAll(() => __setSupabaseForTests(null));

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');
const LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh'] as const;

const flatten = (o: Record<string, unknown>, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));

const shard = (locale: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', locale, 'authPortalsNative.json'), 'utf8')) as Record<string, unknown>;

const LANE_FILES = [
  ...readdirSync(join(APP, 'src/screens/auth')).filter((f) => /\.tsx?$/.test(f)).map((f) => join(APP, 'src/screens/auth', f)),
  join(APP, 'src/ports/auth.tsx'),
  join(APP, 'src/auth/post-confirm.ts'),
  join(APP, 'src/auth/oauth-consent.ts'),
];

describe('authPortalsNative shards', () => {
  const deKeys = flatten(shard('de')).sort();

  it('DE has the keys', () => {
    expect(deKeys.length).toBeGreaterThan(10);
  });

  it.each(LOCALES)('%s has exactly the DE key set, every value non-empty and resolvable', (locale) => {
    const s = shard(locale);
    expect(flatten(s).sort()).toEqual(deKeys);
    for (const k of deKeys) {
      const v = translate(locale, k);
      expect(v).not.toBe(k);
      expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  it('DE is du-form (no Sie / Ihr / Ihnen)', () => {
    const text = JSON.stringify(shard('de'));
    expect(text).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen|Ihrem|Ihren)\b/);
  });
});

describe('every catalog key the screens name resolves in all 11 locales', () => {
  const keys = new Set<string>();
  for (const f of LANE_FILES) {
    for (const m of readFileSync(f, 'utf8').matchAll(/['"`]((?:authPortalsNative|tenantPortal|screens\.(?:auth|portals|oauthconsent|logout)|portals\.maxina|discount|orbHint|toasts\.auth)\.[A-Za-z0-9_.]+)['"`]/g)) keys.add(m[1]);
  }
  it('finds the keys', () => {
    expect(keys.size).toBeGreaterThan(60);
  });
  it.each([...keys].sort())('%s', (key) => {
    for (const locale of LOCALES) expect(translate(locale, key)).not.toBe(key);
  });
});

describe('RTL', () => {
  it.each(LANE_FILES.map((f) => f.slice(APP.length + 1)))('%s uses start / end, never physical left / right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src).not.toMatch(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/);
    expect(src).not.toMatch(/textAlign:\s*['"](left|right)['"]/);
  });

  it('the reset screen renders under ar with Arabic copy', async () => {
    const d = createSupabaseDouble();
    render(<ResetPasswordScreen />, { wrapper: makeWrapper({ client: d.client, language: 'ar-XA' }) });
    expect(await screen.findByText(translate('ar', 'screens.auth.resetYourPassword'))).toBeTruthy();
    expect(translate('ar', 'screens.auth.resetYourPassword')).not.toBe(translate('en', 'screens.auth.resetYourPassword'));
  });
});

describe('routes', () => {
  it.each([
    '(public)/maxina.tsx',
    '(public)/alkalma.tsx',
    '(public)/[tenantSlug].tsx',
    '(public)/auth/confirmed.tsx',
    '(public)/maxina/confirmed.tsx',
    '(public)/alkalma/confirmed.tsx',
    '(public)/oauth/complete.tsx',
    '(app)/oauth/consent.tsx',
    '(public)/reset-password.tsx',
    '(public)/logout.tsx',
  ])('app/%s exists', (file) => {
    expect(existsSync(join(APP, 'app', file))).toBe(true);
  });

  it('NATIVE_ROUTES lists the new concrete routes', () => {
    for (const r of ['/auth/confirmed', '/maxina/confirmed', '/alkalma/confirmed', '/oauth/consent']) expect(NATIVE_ROUTES).toContain(r);
  });

  it('static destinations outrank /:tenantSlug; a community slug does not', () => {
    expect(isStaticDestination('/settings')).toBe(true);
    expect(isStaticDestination('/wallet?tab=x')).toBe(true);
    expect(isStaticDestination('/maxina')).toBe(true);
    expect(isStaticDestination(`/${tenantRow('acme').slug}`)).toBe(false);
  });
});
