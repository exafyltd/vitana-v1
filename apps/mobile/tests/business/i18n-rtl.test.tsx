/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the commerce screens in
 * all 11 locales without an unresolved catalog key, the new `businessNative`
 * namespace complete in every locale (DE is the source), Arabic rendered RTL,
 * and no physical left/right in the lane's styles (logical start/end only).
 */
import '../helpers/no-network';
import { mockParams, mockPath } from './mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ReactElement } from 'react';
import { act, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { ORG_ADMIN, ORG_STAFF, createCommerceGateway, createCommerceSupabase, renderBusiness } from './helpers';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale, useI18n } from '../../src/i18n/I18nProvider';
import { CommercePortalScreen, __resetAutoRegisterForTests } from '../../src/screens/business/CommercePortalScreen';
import { CommerceHealthOrdersScreen } from '../../src/screens/business/CommerceHealthOrdersScreen';
import { CommerceTeamScreen } from '../../src/screens/business/CommerceTeamScreen';
import { CommerceJoinScreen } from '../../src/screens/business/CommerceJoinScreen';
import { CommerceConnectDocsScreen } from '../../src/screens/business/CommerceConnectDocsScreen';
import { CommercePortalLoginScreen } from '../../src/screens/business/CommercePortalLoginScreen';
import { activeOrgStore } from '../../src/identity/device-storage';

const REPO = join(__dirname, '../../../..');
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

// The 11-locale loops render several screens per locale.
jest.setTimeout(30000);

beforeEach(() => {
  mockParams.current = {};
  mockPath.current = '/commerce';
  __resetAutoRegisterForTests();
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
const raw = (id: string) => strings(screen.getByTestId(id)).filter((s) => RAW_KEY.test(s.trim()));

const portalGateway = () =>
  createCommerceGateway({
    'GET /vcaop/portal/my/connections': { data: [] },
    'GET /partner-orgs/mine': { organizations: [ORG_ADMIN, ORG_STAFF] },
    'GET /commerce/ai-setup/status': { enabled: false },
    'GET /partner-onboarding/org-1': { organization: { country: 'DE', website: null, lifecycle_state: 'needs_action' }, checklist: { steps: [{ key: 'verification', required: true, status: 'failed', missing: [], detail: { review_note: { reason: 'Logo fehlt' } } }, { key: 'terms', required: true, status: 'todo', missing: [] }], submit_ready: true } },
    'GET /partner-onboarding/org-1/catalogue': { products: [], merchant: { vertical_key: 'x' } },
    'GET /partner-onboarding/org-1/terms': { published: true, accepted: false, reacceptance_required: true, terms: { id: 't', version: '2', published_at: '2026-10-01', content_sha256: 'h', binding: { title: 'AGB', body_md: 'x' }, available_locales: ['de'] } },
    'GET /admin/partner-health/orders': { orders: [{ id: 'o-1', test_name: 'Lipid', status: 'ordered', status_updated_at: '2026-10-01T00:00:00Z', external_order_ref: null, assigned_professional_user_id: null, partner_registry: null }] },
    'GET /admin/partner-health/inbox': { inbox: [] },
  });

describe.each([...LOCALES])('%s', (locale) => {
  const language = languageFromLocale(locale);

  it('portal (member + guest), health orders, team have no raw key', async () => {
    renderBusiness(<CommercePortalScreen />, { supabase: createCommerceSupabase(), gateway: portalGateway(), language });
    await screen.findByTestId('setup-still-needed');
    await screen.findByTestId('my-org-org-1');
    expect(raw('screen-commerce')).toEqual([]);
    screen.unmount();
    renderBusiness(<CommercePortalScreen />, { supabase: createCommerceSupabase({ signedIn: false }), gateway: portalGateway(), language });
    await screen.findByTestId('commerce-guest-landing');
    expect(raw('screen-commerce')).toEqual([]);
    screen.unmount();
    renderBusiness(<CommerceHealthOrdersScreen />, { supabase: createCommerceSupabase(), gateway: portalGateway(), language });
    await screen.findByTestId('order-o-1');
    expect(raw('screen-commerce-health-orders')).toEqual([]);
    screen.unmount();
    activeOrgStore.set('org-2');
    renderBusiness(<CommerceTeamScreen />, { supabase: createCommerceSupabase(), gateway: portalGateway(), language });
    await screen.findByTestId('team-admin-only');
    expect(raw('screen-commerce-team')).toEqual([]);
    act(() => activeOrgStore.set(null));
  });

  it('join, connect docs and the portal login have no raw key', async () => {
    renderBusiness(<CommerceJoinScreen />, { supabase: createCommerceSupabase({ signedIn: false }), language });
    await screen.findByTestId('join-option-email');
    expect(raw('screen-commerce-join')).toEqual([]);
    screen.unmount();
    renderBusiness(<CommerceConnectDocsScreen />, { supabase: createCommerceSupabase({ signedIn: false }), language });
    expect(raw('commerce-connect-docs')).toEqual([]);
    screen.unmount();
    renderBusiness(<CommercePortalLoginScreen />, { supabase: createCommerceSupabase({ signedIn: false }), language });
    await screen.findByTestId('commerce-login-card');
    expect(raw('screen-commerce-login')).toEqual([]);
  });
});

describe('businessNative catalog', () => {
  const keys = (o: unknown, p = ''): string[] => Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  const load = (l: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'businessNative.json'), 'utf8'));
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
    return <CommerceJoinScreen />;
  }
  renderBusiness(<Probe />, { supabase: createCommerceSupabase({ signedIn: false }), language: 'ar-XA', direction: 'rtl' });
  expect(await screen.findByTestId('join-title')).toHaveTextContent(/[\u0600-\u06FF]/);
  expect(rtl).toBe(true);
});

it('no physical left/right in the business lane styles (logical start/end only)', () => {
  const app = join(__dirname, '../../app');
  const roots = [join(__dirname, '../../src/screens/business'), join(app, '(app)/commerce'), join(app, '(public)/commerce')];
  const files = [join(__dirname, '../../src/ports/business-ui.tsx'), join(app, '(public)/commerce-login.tsx')];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) files.push(full);
    }
  };
  roots.forEach(walk);
  const offenders: string[] = [];
  const re = /\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:|textAlign:\s*'(left|right)'/g;
  for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(re)) offenders.push(`${f}: ${m[0]}`);
  expect(files.length).toBeGreaterThan(20);
  expect(offenders).toEqual([]);
});
