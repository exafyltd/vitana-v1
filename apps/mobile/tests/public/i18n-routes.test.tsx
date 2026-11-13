/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — i18n
 * (no unresolved catalog key on any public screen in all 11 locales, Arabic
 * renders, every publicLegalNative key in all 11 shards, DE first), RTL-safe
 * styles in the lane's files, the six route files and the parity rows (6
 * native; PUBLIC.LANDING stays not_started because a cold `/` is N3's
 * app/index.tsx, so the storefront is the PublicLandingScreen component with
 * no route file yet; /download and /maxina/app kept `exception` with no route
 * file).
 */
import '../helpers/no-network';
import { resetMocks, publicWrapper, allStrings, RAW_KEY } from './helpers';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { PublicLandingScreen } from '../../src/screens/public/PublicLandingScreen';
import { PrivacyScreen, TermsScreen } from '../../src/screens/public/LegalScreens';
import { MaxinaSupportScreen } from '../../src/screens/public/MaxinaSupportScreen';
import { ApplyScreen } from '../../src/screens/public/ApplyScreen';
import { IntroScreen } from '../../src/screens/public/IntroScreen';

// Several screens or locales per test: more than the 5 s Jest default.
jest.setTimeout(30_000);

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => resetMocks({ tenantSlug: 'maxina' }));

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: the public screens render no unresolved key', async (locale) => {
    const { wrapper } = publicWrapper({ language: languageFromLocale(locale) });
    const els = [
      <PublicLandingScreen key="l" gatewayUrl={null} />,
      <PrivacyScreen key="p" />,
      <TermsScreen key="t" />,
      <MaxinaSupportScreen key="s" />,
      <ApplyScreen key="a" />,
      <IntroScreen key="i" />,
    ];
    for (const el of els) {
      const r = render(el, { wrapper });
      if (el.key === 'l') await screen.findByTestId('public-landing');
      const raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
      expect({ locale, screen: el.key, raw }).toEqual({ locale, screen: el.key, raw: [] });
      r.unmount();
    }
  }, 30_000);

  it('Arabic (RTL) renders the support page and the intro with the Arabic catalog', () => {
    const { wrapper } = publicWrapper({ language: 'ar-XA' });
    const support = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/support.json'), 'utf8')).support.maxina;
    const intro = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/intro.json'), 'utf8')).intro;
    const a = render(<MaxinaSupportScreen />, { wrapper });
    expect(screen.getByText(support.title)).toBeTruthy();
    a.unmount();
    render(<IntroScreen />, { wrapper });
    expect(screen.getByText(intro.taglineMain)).toBeTruthy();
  });

  it('every publicLegalNative key exists in all 11 shards with the same placeholders as German', () => {
    const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
      Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
    const read = (l: string) => flat(JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'publicLegalNative.json'), 'utf8')));
    const de = read('de');
    expect(de.length).toBeGreaterThan(0);
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(read(l));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
    }
  });
});

describe('RTL-safe styles', () => {
  const files = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
  const ROUTES = ['privacy', 'terms', 'maxina_support', 'apply', 'i/[code]', '_intro/[tenantSlug]'];
  const laneFiles = [...files(join(APP, 'src/screens/public')), ...ROUTES.map((r) => join(APP, 'app/(public)', `${r}.tsx`)), join(APP, 'src/ports/public.tsx')];

  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThan(15);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });
});

describe('route files', () => {
  it('PUBLIC.LANDING: the PublicLandingScreen component renders, with no shadowed (public)/index.tsx route file', async () => {
    const { wrapper } = publicWrapper({ language: 'en-US' });
    render(<PublicLandingScreen gatewayUrl={null} />, { wrapper });
    expect(await screen.findByTestId('public-landing')).toBeTruthy();
    expect(existsSync(join(APP, 'app/(public)/index.tsx'))).toBe(false);
  });

  it.each([
    ['privacy', 'LegalScreens'],
    ['terms', 'LegalScreens'],
    ['maxina_support', 'MaxinaSupportScreen'],
    ['apply', 'ApplyScreen'],
    ['i/[code]', 'InviteLandingScreen'],
    ['_intro/[tenantSlug]', 'IntroScreen'],
  ])('app/(public)/%s.tsx renders %s', (file, screenName) => {
    const src = readFileSync(join(APP, 'app/(public)', `${file}.tsx`), 'utf8');
    expect(src).toContain(`src/screens/public/${screenName}`);
    expect(src).toMatch(/export default function/);
  });

  it('/download and /maxina/app stay web pages: no native route file', () => {
    for (const f of ['app/(public)/download.tsx', 'app/(app)/download.tsx', 'app/(public)/maxina/app.tsx', 'app/(app)/maxina/app.tsx']) {
      expect({ f, exists: existsSync(join(APP, f)) }).toEqual({ f, exists: false });
    }
  });
});

describe('parity ledger', () => {
  const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; lane: string; status: string; exception: string | null }> };
  const byKey = new Map(ledger.rows.map((r) => [r.key, r]));

  it('PUBLIC.LANDING is native: a cold `/` mounts the storefront (app/index.tsx, VTID-05650)', () => {
    expect(byKey.get('PUBLIC.LANDING')).toMatchObject({ lane: 'public-auth', status: 'native' });
  });

  it.each(['PUBLIC.PRIVACY', 'PUBLIC.TERMS', '/maxina_support', '/i/:code', '/apply', '/_intro/:tenantSlug'])('%s is native', (key) => {
    expect(byKey.get(key)).toMatchObject({ lane: 'public-auth', status: 'native' });
  });

  it.each(['/download', '/maxina/app'])('%s stays exception with its reason', (key) => {
    const row = byKey.get(key);
    expect(row).toMatchObject({ lane: 'public-auth', status: 'exception' });
    expect(row?.exception).toBeTruthy();
  });
});
