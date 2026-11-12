/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — the eight patient
 * screens in all 11 locales without an unresolved catalog key, the new
 * `patientNative` namespace complete in every locale (DE is the source),
 * Arabic rendered right-to-left, no hardcoded JSX text and no physical
 * left/right in the lane's files (logical start/end only).
 */
import '../helpers/no-network';
import './mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ReactElement } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { LINK_REQUESTS, RESULTS, createGateway, renderPatient, settled } from './helpers';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale, useI18n } from '../../src/i18n/I18nProvider';
import { DashboardScreen } from '../../src/screens/patient/DashboardScreen';
import { HealthScreen } from '../../src/screens/patient/HealthScreen';
import { AppointmentsScreen } from '../../src/screens/patient/AppointmentsScreen';
import { ResultsScreen } from '../../src/screens/patient/ResultsScreen';
import { ComingSoonScreen } from '../../src/screens/patient/ComingSoonScreen';
import { NotAuthorizedPanel } from '../../src/screens/patient/PatientGate';

const REPO = join(__dirname, '../../../..');
const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

// The 11-locale loops render every screen once per locale; under default
// workers that outruns Jest's 5 s default.
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

const rawIn = (testID: string) => strings(screen.getByTestId(testID)).filter((s) => RAW_KEY.test(s.trim()));

const gateway = () =>
  createGateway({
    'GET /patient/health-results': { results: RESULTS },
    'GET /partner-health/member/link-requests': { ok: true, requests: LINK_REQUESTS },
  });

const STATIC: Array<[string, () => ReactElement, string]> = [
  ['health', () => <HealthScreen />, 'screen-patient-health'],
  ['appointments', () => <AppointmentsScreen />, 'screen-patient-appointments'],
  ['care-team', () => <ComingSoonScreen route="care-team" />, 'screen-patient-care-team'],
  ['goals', () => <ComingSoonScreen route="goals" />, 'screen-patient-goals'],
  ['insurance', () => <ComingSoonScreen route="insurance" />, 'screen-patient-insurance'],
  ['notifications', () => <ComingSoonScreen route="notifications" />, 'screen-patient-notifications'],
  ['access denied', () => <NotAuthorizedPanel />, 'patient-not-authorized'],
];

describe.each([...LOCALES])('%s', (locale) => {
  const language = languageFromLocale(locale);

  it.each(STATIC)('%s has no raw key', async (_name, ui, testID) => {
    renderPatient(ui(), { language });
    await settled();
    expect(rawIn(testID)).toEqual([]);
  });

  it('dashboard and results (with link requests and the detail dialog) have no raw key', async () => {
    renderPatient(<DashboardScreen />, { gateway: gateway(), language });
    await screen.findByTestId('patient-recent-result-r-1');
    expect(rawIn('screen-patient-dashboard')).toEqual([]);
    screen.unmount();
    renderPatient(<ResultsScreen />, { gateway: gateway(), language });
    await screen.findByTestId('partner-link-request-lr-1');
    await screen.findByTestId('patient-result-r-1');
    expect(rawIn('screen-patient-results')).toEqual([]);
    fireEvent.press(screen.getByTestId('patient-result-r-1'));
    await screen.findByTestId('patient-result-table');
    expect(rawIn('patient-result-dialog-content')).toEqual([]);
  });
});

describe('patientNative catalog', () => {
  const keys = (o: unknown, p = ''): string[] =>
    Object.entries(o as Record<string, unknown>).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  const load = (l: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'patientNative.json'), 'utf8'));
  const de = keys(load('de')).sort();

  it.each([...LOCALES])('%s has exactly the German keys, none empty, same placeholders', (l) => {
    const shard = load(l);
    expect(keys(shard).sort()).toEqual(de);
    const flat = (o: unknown): string[] => Object.entries(o as Record<string, unknown>).filter(([k]) => !k.startsWith('_')).flatMap(([, v]) => (v && typeof v === 'object' ? flat(v) : [String(v)]));
    expect(flat(shard).filter((v) => v.trim() === '')).toEqual([]);
    const ph = (s: unknown) => flat(s).map((v) => (v.match(/\{[a-z]+\}/gi) ?? []).sort().join(','));
    expect(ph(shard)).toEqual(ph(load('de')));
  });
});

it('Arabic renders right-to-left with the Arabic catalog', async () => {
  let rtl: boolean | null = null;
  function Probe(): ReactElement {
    rtl = useI18n().rtl;
    return <ComingSoonScreen route="goals" />;
  }
  renderPatient(<Probe />, { language: 'ar-XA', direction: 'rtl' });
  const ar = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/screens.json'), 'utf8')).screens;
  expect(await screen.findByTestId('screen-patient-goals')).toHaveTextContent(new RegExp(ar.common.healthGoals));
  expect(rtl).toBe(true);
});

const LANE_DIRS = [join(__dirname, '../../src/screens/patient'), join(__dirname, '../../app/(app)/patient'), join(__dirname, '../../src/ports/patient-ui.tsx')];

function laneFiles(): string[] {
  const out: string[] = [];
  const walk = (p: string) => {
    if (statSync(p).isDirectory()) readdirSync(p).forEach((n) => walk(join(p, n)));
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  };
  LANE_DIRS.forEach(walk);
  return out;
}

it('no physical left/right in the patient lane styles (logical start/end only)', () => {
  const re = /\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:|textAlign:\s*'(left|right)'/g;
  const offenders = laneFiles().flatMap((f) => [...readFileSync(f, 'utf8').matchAll(re)].map((m) => `${f}: ${m[0]}`));
  expect(offenders).toEqual([]);
});

it('no hardcoded user-visible text in the patient lane (JSX text and string literal props)', () => {
  const jsxText = />\s*([A-Za-z][^<>{}]*?)\s*</g;
  const literalProps = /\b(accessibilityLabel|accessibilityHint|title|placeholder|caption|subtitle|label|value)="[^"]+"/g;
  const offenders = laneFiles()
    .filter((f) => f.endsWith('.tsx'))
    .flatMap((f) => {
      const text = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      return [...text.matchAll(jsxText), ...text.matchAll(literalProps)].map((m) => `${f}: ${m[0].trim()}`);
    });
  expect(offenders).toEqual([]);
});
