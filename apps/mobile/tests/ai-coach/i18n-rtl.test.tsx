/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — the five `/ai` screens in
 * all 11 locales without an unresolved catalog key, the new `aiCoachNative`
 * namespace complete in every locale (DE is the source), Arabic rendered
 * RTL, and no physical left/right in the lane's styles (logical start/end).
 */
import '../helpers/no-network';
import './mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ReactElement } from 'react';
import { screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { createCoachGateway, createCoachSupabase, renderCoach } from './helpers';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale, useI18n } from '../../src/i18n/I18nProvider';
import { AIOverviewScreen } from '../../src/screens/ai-coach/AIOverviewScreen';
import { InsightsScreen } from '../../src/screens/ai-coach/InsightsScreen';
import { RecommendationsScreen } from '../../src/screens/ai-coach/RecommendationsScreen';
import { DailySummaryScreen } from '../../src/screens/ai-coach/DailySummaryScreen';
import { CompanionScreen } from '../../src/screens/ai-coach/CompanionScreen';

const REPO = join(__dirname, '../../../..');
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

// The 11-locale loops render every screen once per locale.
jest.setTimeout(30000);

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

const SCREENS: Array<[string, () => ReactElement, string]> = [
  ['overview', () => <AIOverviewScreen />, 'screen-ai-overview'],
  ['insights', () => <InsightsScreen />, 'screen-ai-insights'],
  ['recommendations', () => <RecommendationsScreen />, 'screen-ai-recommendations'],
  ['daily-summary', () => <DailySummaryScreen />, 'screen-ai-daily-summary'],
  ['companion', () => <CompanionScreen />, 'screen-ai-companion'],
];

describe.each([...LOCALES])('%s', (locale) => {
  const language = languageFromLocale(locale);
  it.each(SCREENS)('/ai %s has no raw key', async (_name, ui, testID) => {
    const gateway = createCoachGateway({ 'GET /memory/daily-learning': { ok: true, learnings: [{ id: 'l', date: '2026-10-31', content: 'x', created_at: '' }] } });
    renderCoach(ui(), { supabase: createCoachSupabase({ tables: { user_preferences: [{ user_id: 'u-1', autopilot_enabled: true }] } }), gateway, language });
    await screen.findByTestId(testID);
    const raw = strings(screen.getByTestId(testID)).filter((s) => RAW_KEY.test(s.trim()));
    expect(raw).toEqual([]);
  });
});

describe('aiCoachNative catalog', () => {
  const keys = (o: unknown, p = ''): string[] =>
    Object.entries(o as Record<string, unknown>).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  const load = (l: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'aiCoachNative.json'), 'utf8'));
  const de = keys(load('de')).sort();

  it.each([...LOCALES])('%s has exactly the German keys, none empty, the same placeholders', (l) => {
    const shard = load(l);
    expect(keys(shard).sort()).toEqual(de);
    const get = (o: Record<string, unknown>, k: string) => k.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown>)[p], o) as string;
    for (const k of de) {
      expect(get(shard, k).trim()).not.toBe('');
      const ph = (s: string) => (s.match(/\{[a-z]+\}/gi) ?? []).sort();
      expect([k, ph(get(shard, k))]).toEqual([k, ph(get(load('de'), k))]);
    }
  });
});

it('Arabic renders right-to-left with the Arabic catalog', async () => {
  let rtl: boolean | null = null;
  function Probe(): ReactElement {
    rtl = useI18n().rtl;
    return <InsightsScreen />;
  }
  renderCoach(<Probe />, { language: 'ar-XA', direction: 'rtl' });
  expect(await screen.findByTestId('coach-subnav-overview')).toHaveTextContent('نظرة عامة');
  expect(rtl).toBe(true);
});

it('no physical left/right in the AI coach lane styles (logical start/end only)', () => {
  const roots = [join(__dirname, '../../src/screens/ai-coach'), join(__dirname, '../../app/(app)/ai'), join(__dirname, '../../src/ports/ai-coach.tsx')];
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
