/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — the five
 * route files and their resolution (every `?tab=` row lands on a native route
 * on a cold start, no shadowing file), the 16 parity rows, and i18n: the
 * screens render with no unresolved catalog key in all 11 locales, Arabic
 * renders, every healthNative key exists in all 11 shards with German's
 * placeholders, and the lane's files use no physical left/right.
 */
import '../../helpers/no-network';
import { searchParams } from './helpers';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { LOCALES } from '../../../src/i18n';
import { languageFromLocale } from '../../../src/i18n/I18nProvider';
import { resolveWebPath } from '../../../src/navigation/resolve';
import { PillarsOfHealthScreen } from '../../../src/screens/health/PillarsOfHealthScreen';
import { ConditionsRisksScreen } from '../../../src/screens/health/ConditionsRisksScreen';
import { EducationResourcesScreen } from '../../../src/screens/health/EducationResourcesScreen';
import { PlansScreen } from '../../../src/screens/health/PlansScreen';
import { WellnessServicesScreen } from '../../../src/screens/health/WellnessServicesScreen';
import { healthWrapper } from './helpers';

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(() => {
  searchParams.current = {};
});

const APP = join(__dirname, '../../..');
const REPO = join(APP, '../..');

const ROWS: Array<[string, string]> = [
  ['HEALTH.PILLARS', '/health/pillars'],
  ['HEALTH.CONDITIONS', '/health/conditions'],
  ['HEALTH.EDUCATION', '/health/education'],
  ['HEALTH.EDUCATION_PODCASTS', '/health/education?tab=podcasts'],
  ['HEALTH.EDUCATION_VIDEOS', '/health/education?tab=videos'],
  ['HEALTH.PLANS', '/health/plans'],
  ['HEALTH.PLANS_EXERCISE', '/health/plans?tab=exercise'],
  ['HEALTH.PLANS_HYDRATION', '/health/plans?tab=hydration'],
  ['HEALTH.PLANS_MENTAL', '/health/plans?tab=mental'],
  ['HEALTH.PLANS_NUTRITION', '/health/plans?tab=nutrition'],
  ['HEALTH.PLANS_SLEEP', '/health/plans?tab=sleep'],
  ['HEALTH.SERVICES_HUB', '/health/services-hub'],
  ['HEALTH.SERVICES_INSURANCE', '/health/services-hub?tab=insuranceSupport'],
  ['HEALTH.SERVICES_MEDICAL', '/health/services-hub?tab=medicalServices'],
  ['HEALTH.SERVICES_MINE', '/health/services-hub?tab=myServices'],
  ['HEALTH.SERVICES_WELLNESS', '/health/services-hub?tab=wellnessPrograms'],
];

describe('routes', () => {
  it.each([
    ['pillars', 'PillarsOfHealthScreen'],
    ['conditions', 'ConditionsRisksScreen'],
    ['education', 'EducationResourcesScreen'],
    ['plans', 'PlansScreen'],
    ['services-hub', 'WellnessServicesScreen'],
  ])('app/(app)/health/%s.tsx renders %s', (file, screenName) => {
    const src = readFileSync(join(APP, 'app/(app)/health', `${file}.tsx`), 'utf8');
    expect(src).toContain(`src/screens/health/${screenName}`);
    expect(src).toMatch(/export default function/);
  });

  it('no other app/ file claims a /health/<lane> path on a cold start', () => {
    const shadow = ['app/(app)/health.tsx', 'app/(public)/health', 'app/health', 'app/(app)/health/[...rest].tsx', 'app/(app)/health/[id].tsx'];
    for (const p of shadow) expect({ p, exists: existsSync(join(APP, p)) }).toEqual({ p, exists: false });
  });

  it.each(ROWS)('%s (%s) resolves to a native route, query kept', (_key, path) => {
    const r = resolveWebPath(path);
    expect(r.kind).toBe('native');
    expect(r.href).toBe(path);
  });

  it('the 16 parity rows are native and owned', () => {
    const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; web_path: string; status: string; owner: string | null }> };
    for (const [key, path] of ROWS) {
      const row = ledger.rows.find((r) => r.key === key);
      expect({ key, path: row?.web_path, status: row?.status, owner: row?.owner }).toEqual({ key, path, status: 'native', owner: 'kiro' });
    }
  });
});

/** A dotted catalog key that t() returned unresolved. */
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

function allStrings(root: ReactTestInstance): string[] {
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

const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))(
    '%s: every screen and tab renders no unresolved key',
    async (locale) => {
      const { wrapper } = healthWrapper({ user_health_plans: [], vitana_index_scores: [{ date: '2026-11-01', score_total: 400 }] }, languageFromLocale(locale));
      const raws: string[] = [];
      const collect = (root: ReactTestInstance) => raws.push(...allStrings(root).filter((s) => RAW_KEY.test(s.trim())));

      for (const el of [<PillarsOfHealthScreen key="p" />, <ConditionsRisksScreen key="c" />]) {
        const r = render(el, { wrapper });
        await settle();
        collect(r.root);
        r.unmount();
      }

      const edu = render(<EducationResourcesScreen />, { wrapper });
      for (const tab of ['articles', 'videos', 'podcasts']) {
        fireEvent.press(screen.getByTestId(`health-education-tab-${tab}`));
        collect(edu.root);
      }
      fireEvent.press(screen.getByTestId('health-education-actions-open'));
      collect(edu.root);
      edu.unmount();

      const plans = render(<PlansScreen />, { wrapper });
      await settle();
      collect(plans.root);
      for (const tab of ['nutrition', 'exercise', 'hydration', 'sleep', 'mental']) {
        fireEvent.press(screen.getByTestId(`health-plans-tab-${tab}`));
        collect(plans.root);
      }
      plans.unmount();

      const svc = render(<WellnessServicesScreen />, { wrapper });
      for (const tab of ['preventiveCare', 'medicalServices', 'wellnessPrograms', 'insuranceSupport', 'myServices']) {
        fireEvent.press(screen.getByTestId(`health-services-tab-${tab}`));
        collect(svc.root);
      }
      fireEvent.press(screen.getByTestId('health-services-tab-preventiveCare'));
      fireEvent.press(screen.getByTestId('health-service-CT-301'));
      collect(svc.root);
      svc.unmount();

      expect({ locale, raw: [...new Set(raws)] }).toEqual({ locale, raw: [] });
    },
    60_000,
  );

  it('Arabic (RTL) renders the plans header from the Arabic catalog', async () => {
    const { wrapper } = healthWrapper({ user_health_plans: [] }, 'ar-XA');
    render(<PlansScreen />, { wrapper });
    await settle();
    const ar = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/healthNative.json'), 'utf8')).healthNative;
    expect(screen.getByText(ar.plans.description)).toBeTruthy();
  });

  it('every healthNative key exists in all 11 shards with the same placeholders as German', () => {
    const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
    const read = (l: string) => flat(JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'healthNative.json'), 'utf8')));
    const de = read('de');
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(read(l));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
    }
  });
});

describe('RTL-safe styles', () => {
  const lane = ['PillarsOfHealthScreen.tsx', 'ConditionsRisksScreen.tsx', 'EducationResourcesScreen.tsx', 'PlansScreen.tsx', 'WellnessServicesScreen.tsx'].map((f) => join(APP, 'src/screens/health', f));
  const files = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
  const laneFiles = [...lane, ...files(join(APP, 'src/screens/health/plans-services')), ...files(join(APP, 'app/(app)/health')), join(APP, 'src/ports/health-plans.tsx')];

  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThan(15);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });
});
