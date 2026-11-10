/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — the eight screens and
 * the access-denied state in all 11 locales without an unresolved catalog
 * key; the new `staffNative` namespace complete in every locale (DE is the
 * source) and in the right register (de du, fr tu, pt você, ru ты); Arabic
 * rendered right-to-left; no physical left/right in the lane's styles
 * (logical start/end only); no hard-coded user-visible text.
 */
import '../helpers/no-network';
import './mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ReactElement } from 'react';
import { screen } from '@testing-library/react-native';
import { createStaffSupabase, renderStaff, strings } from './helpers';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale, useI18n } from '../../src/i18n/I18nProvider';
import { StaffDashboardScreen } from '../../src/screens/staff/DashboardScreen';
import { StaffQueueScreen } from '../../src/screens/staff/QueueScreen';
import { StaffComingSoonScreen, STAFF_COMING_SOON, type StaffComingSoonRoute } from '../../src/screens/staff/ComingSoonScreen';

const REPO = join(__dirname, '../../../..');
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;
const ROUTES = Object.keys(STAFF_COMING_SOON) as StaffComingSoonRoute[];

// The 11-locale loops render nine screens per locale; under default workers
// that outruns Jest's 5 s default.
jest.setTimeout(30000);

const raw = (testID: string) => strings(screen.getByTestId(testID)).filter((s) => RAW_KEY.test(s.trim()));

describe.each([...LOCALES])('%s', (locale) => {
  const language = languageFromLocale(locale);

  it('dashboard has no raw key', async () => {
    renderStaff(<StaffDashboardScreen />, { language });
    await screen.findByTestId('screen-staff-dashboard');
    expect(raw('screen-staff-dashboard')).toEqual([]);
  });

  it('queue has no raw key', async () => {
    renderStaff(<StaffQueueScreen />, { language });
    await screen.findByTestId('screen-staff-queue');
    expect(raw('screen-staff-queue')).toEqual([]);
  });

  it.each(ROUTES)('/staff/%s has no raw key', async (route) => {
    renderStaff(<StaffComingSoonScreen route={route} />, { language });
    await screen.findByTestId(`screen-staff-${route}`);
    expect(raw(`screen-staff-${route}`)).toEqual([]);
  });

  it('access denied has no raw key', async () => {
    renderStaff(<StaffDashboardScreen />, { language, supabase: createStaffSupabase({ role: { role: 'professional' } }) });
    await screen.findByTestId('staff-not-authorized');
    expect(raw('staff-not-authorized')).toEqual([]);
  });
});

describe('staffNative catalog', () => {
  const keys = (o: unknown, p = ''): string[] =>
    Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  const flat = (o: unknown): string[] => Object.values(o as Record<string, unknown>).flatMap((v) => (v && typeof v === 'object' ? flat(v) : [String(v)]));
  const load = (l: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'staffNative.json'), 'utf8'));
  const de = keys(load('de')).sort();

  it('the German source has the coming-soon title and body', () => {
    expect(de).toEqual(['staffNative.comingSoon.body', 'staffNative.comingSoon.title']);
  });

  it.each([...LOCALES])('%s has exactly the German keys, none empty', (l) => {
    const shard = load(l);
    expect(keys(shard).sort()).toEqual(de);
    expect(flat(shard).filter((v) => v.trim() === '')).toEqual([]);
  });

  it.each([...LOCALES].filter((l) => l !== 'en'))('%s is translated (not the English text)', (l) => {
    const en = flat(load('en'));
    expect(flat(load(l)).filter((v) => en.includes(v))).toEqual([]);
  });

  it.each([
    ['de', /\b(Sie|Ihnen|Ihr|Ihre)\b/],
    ['fr', /\b(vous|votre|vos)\b/i],
    ['pt', /\b(teu|tua|teus|tuas|tu)\b/i],
    ['ru', /(^|[^а-яё])(вы|вас|вам|ваш|ваша|ваши)([^а-яё]|$)/i],
    ['es', /\b(usted|ustedes)\b/i],
  ])('%s keeps the informal register', (l, wrong) => {
    expect(flat(load(l)).filter((v) => wrong.test(v))).toEqual([]);
  });
});

it('Arabic renders right-to-left with the Arabic catalog', async () => {
  let rtl: boolean | null = null;
  function Probe(): ReactElement {
    rtl = useI18n().rtl;
    return <StaffDashboardScreen />;
  }
  renderStaff(<Probe />, { language: 'ar-XA', direction: 'rtl' });
  expect(await screen.findByText('لوحة قيادة الموظفين')).toBeTruthy();
  expect(rtl).toBe(true);
});

it('no physical left/right in the staff lane styles (logical start/end only)', () => {
  const roots = [join(__dirname, '../../src/screens/staff'), join(__dirname, '../../app/(app)/staff'), join(__dirname, '../../src/ports/staff-ui.tsx')];
  const offenders: string[] = [];
  const scan = (full: string) => {
    const text = readFileSync(full, 'utf8');
    const re = /\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor)\s*:|textAlign:\s*'(left|right)'/g;
    for (const m of text.matchAll(re)) offenders.push(`${full}: ${m[0]}`);
  };
  const walk = (p: string) => {
    if (statSync(p).isDirectory()) for (const name of readdirSync(p)) walk(join(p, name));
    else if (/\.(ts|tsx)$/.test(p)) scan(p);
  };
  roots.forEach(walk);
  expect(offenders).toEqual([]);
});

it('no hardcoded user-visible text in the lane’s screens (every <Text> child goes through t() or a formatter)', () => {
  const dir = join(__dirname, '../../src/screens/staff');
  const offenders: string[] = [];
  for (const name of readdirSync(dir)) {
    const text = readFileSync(join(dir, name), 'utf8');
    for (const m of text.matchAll(/>\s*([A-Za-z][^<>{}]*[A-Za-z])\s*</g)) offenders.push(`${name}: ${m[1]}`);
    for (const m of text.matchAll(/accessibilityLabel="([^"]+)"/g)) offenders.push(`${name}: ${m[1]}`);
  }
  expect(offenders).toEqual([]);
});
