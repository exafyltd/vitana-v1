/**
 * VTID-05450 (native-wave2-public-auth-onboarding-r3/onboarding) — i18n + RTL
 * for `/onboarding/welcome`: the `onboardingNative` keys in all 11 locales (DE
 * first, same key set everywhere, du-form), every catalog key the screen
 * names resolves in every locale, no physical left / right in the lane files,
 * the route file is on disk and listed, and the screen renders under `ar`.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react-native';
import { makeWrapper } from '../helpers/providers';
import { onboardingDouble } from './helpers';
import { translate } from '../../src/i18n';
import { NATIVE_ROUTES } from '../../src/navigation/resolve';
import { OnboardingWelcomeScreen } from '../../src/screens/onboarding/OnboardingWelcomeScreen';
import { __setSupabaseForTests } from '../../src/auth/client';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn() },
  usePathname: () => '/onboarding/welcome',
  useLocalSearchParams: () => ({}),
}));

afterAll(() => __setSupabaseForTests(null));

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');
const LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh'] as const;

const flatten = (o: Record<string, unknown>, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));

const shard = (locale: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', locale, 'onboardingNative.json'), 'utf8')) as Record<string, unknown>;

const LANE_FILES = [
  ...readdirSync(join(APP, 'src/screens/onboarding')).filter((f) => /\.tsx?$/.test(f)).map((f) => join(APP, 'src/screens/onboarding', f)),
  join(APP, 'src/ports/onboarding.tsx'),
  join(APP, 'app/(app)/onboarding/welcome.tsx'),
];

describe('onboardingNative shards', () => {
  const deKeys = flatten(shard('de')).sort();

  it('DE has the keys', () => {
    expect(deKeys).toEqual(['onboardingNative.avatarInitial', 'onboardingNative.errors.generic', 'onboardingNative.errors.handleTaken']);
  });

  it.each(LOCALES)('%s has exactly the DE key set, every value non-empty and resolvable', (locale) => {
    expect(flatten(shard(locale)).sort()).toEqual(deKeys);
    for (const k of deKeys) {
      const v = translate(locale, k);
      expect(v).not.toBe(k);
      expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  it('DE is du-form (no Sie / Ihr / Ihnen)', () => {
    expect(JSON.stringify(shard('de'))).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen|Ihrem|Ihren)\b/);
  });

  it('fr is tu-form, ru is ты-form, pt is você-form', () => {
    expect(JSON.stringify(shard('fr'))).not.toMatch(/\b(vous|votre|vos)\b/i);
    expect(JSON.stringify(shard('ru'))).not.toMatch(/(^|[^а-яё])(вы|вас|ваш|выберите|попробуйте)([^а-яё]|$)/i);
    expect(JSON.stringify(shard('pt'))).not.toMatch(/\b(teu|tua|teus|tuas)\b/i);
  });
});

describe('every catalog key the screen names resolves in all 11 locales', () => {
  const keys = new Set<string>();
  for (const f of LANE_FILES) {
    for (const m of readFileSync(f, 'utf8').matchAll(/['"`]((?:onboardingNative|onboarding|screens\.onboarding|common)\.[A-Za-z0-9_.]+)['"`]/g)) keys.add(m[1]);
  }
  it('finds the keys', () => {
    expect(keys.size).toBeGreaterThan(25);
  });
  it.each([...keys].sort())('%s', (key) => {
    for (const locale of LOCALES) expect(translate(locale, key)).not.toBe(key);
  });
});

describe('RTL', () => {
  it.each(LANE_FILES.map((f) => f.slice(APP.length + 1)))('%s uses start / end, never physical left / right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src).not.toMatch(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderTopLeftRadius|borderTopRightRadius)\s*:/);
    expect(src).not.toMatch(/textAlign:\s*['"](left|right)['"]/);
  });

  it('the welcome renders under ar with Arabic copy', async () => {
    const d = onboardingDouble();
    render(<OnboardingWelcomeScreen />, { wrapper: makeWrapper({ client: d.client, language: 'ar-XA' }) });
    expect(await screen.findByText(translate('ar', 'screens.onboarding.welcomeMaxina'))).toBeTruthy();
    expect(translate('ar', 'screens.onboarding.welcomeMaxina')).not.toBe(translate('en', 'screens.onboarding.welcomeMaxina'));
    expect(screen.getByText(translate('ar', 'onboarding.skipIntro'))).toBeTruthy();
  });
});

describe('route', () => {
  it('app/(app)/onboarding/welcome.tsx exists and is the only file for the path (not shadowed)', () => {
    expect(existsSync(join(APP, 'app/(app)/onboarding/welcome.tsx'))).toBe(true);
    expect(existsSync(join(APP, 'app/(public)/onboarding'))).toBe(false);
    expect(existsSync(join(APP, 'app/onboarding'))).toBe(false);
  });

  it('NATIVE_ROUTES lists /onboarding/welcome', () => {
    expect(NATIVE_ROUTES).toContain('/onboarding/welcome');
  });
});
