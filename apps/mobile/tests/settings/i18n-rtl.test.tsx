/**
 * VTID-05431 (Native Wave 2, settings lane) — the settings screens in all 11
 * locales without an unresolved catalog key, the new `settingsNative`
 * namespace complete in every locale (DE is the source), Arabic rendered RTL,
 * and no physical left/right in the lane's styles (logical start/end only).
 */
import '../helpers/no-network';
import { mockParams } from './mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ReactElement } from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { createGateway, createSettingsSupabase, renderSettings } from './helpers';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale, useI18n } from '../../src/i18n/I18nProvider';
import { SettingsScreen } from '../../src/screens/settings/SettingsScreen';
import { LimitationsScreen } from '../../src/screens/settings/LimitationsScreen';
import { TenantRoleScreen } from '../../src/screens/settings/TenantRoleScreen';

const REPO = join(__dirname, '../../../..');
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

// The 11-locale loops render every screen once per locale; under default
// workers that outruns Jest's 5 s default.
jest.setTimeout(30000);

afterEach(() => {
  mockParams.current = {};
});

function strings(root: ReactTestInstance): string[] {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    for (const k of ['accessibilityLabel', 'placeholder', 'title']) if (typeof n.props?.[k] === 'string') out.push(n.props[k]);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}

const gateway = () =>
  createGateway({
    'GET /billing/me': {
      ok: true,
      plan: { plan_key: 'premium', status: 'trialing', current_period_end: null, cancel_at_period_end: false, trial_end: '2026-12-01T00:00:00Z', price_key: 'p', source: null },
      stripe: { has_customer: true, has_paid_subscription: true },
    },
    'GET /creators/status': { stripe_account_id: 'acct_1', charges_enabled: true, payouts_enabled: true, onboarded_at: null },
    'GET /companion/preferences': { ok: true, preferences: { enabled: true, topic_health: true, topic_community: true, topic_business: false } },
    'GET /user/limitations': { limitations: { allergies: ['peanuts'] } },
  });

const MODES = ['notifications', 'privacy.visibility', 'privacy.data', 'privacy.security', 'preferences.appearance', 'preferences.language', 'billing', 'billing.creator'];

describe.each([...LOCALES])('%s', (locale) => {
  const language = languageFromLocale(locale);
  it.each(MODES)('settings ?mode=%s has no raw key', async (mode) => {
    mockParams.current = { mode };
    renderSettings(<SettingsScreen />, { supabase: createSettingsSupabase(), gateway: gateway(), language });
    await screen.findByTestId(`settings-section-${mode}`);
    await waitFor(() => expect(screen.queryByTestId('billing-loading')).toBeNull());
    const raw = strings(screen.getByTestId('screen-settings')).filter((s) => RAW_KEY.test(s.trim()));
    expect(raw).toEqual([]);
  });

  it('limitations and tenant-role have no raw key', async () => {
    renderSettings(<LimitationsScreen />, { supabase: createSettingsSupabase(), gateway: gateway(), language });
    await screen.findByTestId('limitations-form');
    expect(strings(screen.getByTestId('screen-limitations')).filter((s) => RAW_KEY.test(s.trim()))).toEqual([]);
    screen.unmount();
    renderSettings(<TenantRoleScreen />, { supabase: createSettingsSupabase({ exafyAdmin: true }), language });
    await screen.findByTestId('tenant-role-permissions');
    expect(strings(screen.getByTestId('screen-tenant-role')).filter((s) => RAW_KEY.test(s.trim()))).toEqual([]);
  });
});

describe('settingsNative catalog', () => {
  const keys = (o: unknown, p = ''): string[] =>
    Object.entries(o as Record<string, unknown>).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  const load = (l: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'settingsNative.json'), 'utf8'));
  const de = keys(load('de')).sort();

  it.each([...LOCALES])('%s has exactly the German keys, none empty', (l) => {
    const shard = load(l);
    expect(keys(shard).sort()).toEqual(de);
    const flat = (o: unknown): string[] => Object.values(o as Record<string, unknown>).flatMap((v) => (v && typeof v === 'object' ? flat(v) : [String(v)]));
    expect(flat(shard).filter((v) => v.trim() === '')).toEqual([]);
  });
});

it('Arabic renders right-to-left with the Arabic catalog', async () => {
  let rtl: boolean | null = null;
  function Probe(): ReactElement {
    rtl = useI18n().rtl;
    return <TenantRoleScreen />;
  }
  renderSettings(<Probe />, { supabase: createSettingsSupabase(), language: 'ar-XA', direction: 'rtl' });
  expect(await screen.findByTestId('tenant-role-current-role')).toHaveTextContent(/عضو في المجتمع/);
  expect(rtl).toBe(true);
});

it('no physical left/right in the settings lane styles (logical start/end only)', () => {
  const roots = [join(__dirname, '../../src/screens/settings'), join(__dirname, '../../app/(app)/settings')];
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) {
        const text = readFileSync(full, 'utf8');
        const re = /\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:|textAlign:\s*'(left|right)'/g;
        for (const m of text.matchAll(re)) offenders.push(`${full}: ${m[0]}`);
      }
    }
  };
  roots.forEach(walk);
  expect(offenders).toEqual([]);
});
