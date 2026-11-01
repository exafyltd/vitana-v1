/**
 * VTID-05429 (Native Wave 2, profile lane) — i18n + RTL for the profile
 * screens: the `profileNative` shard has the same keys in all 11 locales,
 * every catalog key the screens use resolves in every locale, no hardcoded
 * user-visible text, no physical left/right, and the screens render in Arabic
 * (RTL) and German with no raw key on screen.
 */
import '../helpers/no-network';
import './mocks';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../src/auth/client';
import { LOCALES, translate } from '../../src/i18n';
import { MyProfileScreen } from '../../src/screens/profile/MyProfileScreen';
import { PrivacyScreen } from '../../src/screens/profile/PrivacyScreen';
import { createProfileDouble, profileRow, renderProfile } from './helpers';

afterAll(() => __setSupabaseForTests(null));

const SCREEN_DIR = join(__dirname, '../../src/screens/profile');
const I18N_DIR = join(__dirname, '../../../../src/i18n');
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : []));
const sources = files(SCREEN_DIR).map((f) => ({ f, text: readFileSync(f, 'utf8') }));

function keysOf(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

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

describe('profileNative catalog', () => {
  const de = keysOf(JSON.parse(readFileSync(join(I18N_DIR, 'de/profileNative.json'), 'utf8'))).sort();

  it('has the same keys in all 11 locales (DE is the source)', () => {
    expect(LOCALES).toHaveLength(11);
    for (const locale of LOCALES) {
      const keys = keysOf(JSON.parse(readFileSync(join(I18N_DIR, `${locale}/profileNative.json`), 'utf8'))).sort();
      expect({ locale, keys }).toEqual({ locale, keys: de });
    }
  });

  it('every literal key the profile screens use resolves in every locale', () => {
    const used = new Set<string>();
    for (const { text } of sources) for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z][\w.]+)'/g)) used.add(m[1]);
    expect(used.size).toBeGreaterThan(40);
    const missing: string[] = [];
    for (const locale of LOCALES) for (const key of used) if (translate(locale, key) === key) missing.push(`${locale}:${key}`);
    expect(missing).toEqual([]);
  });
});

describe('no hardcoded text, logical directions only', () => {
  it('no JSX text literal in the profile screens (strings come from t())', () => {
    const offenders: string[] = [];
    for (const { f, text } of sources) for (const m of text.matchAll(/>\s*([A-Za-z][A-Za-z ,.'!?-]{2,})\s*</g)) offenders.push(`${f}: ${m[1]}`);
    expect(offenders).toEqual([]);
  });

  it('no physical left/right in the profile screens', () => {
    const re = /\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:|textAlign:\s*'(left|right)'/g;
    const offenders: string[] = [];
    for (const { f, text } of sources) for (const m of text.matchAll(re)) offenders.push(`${f}: ${m[0]}`);
    expect(offenders).toEqual([]);
  });
});

describe('renders localized', () => {
  it('privacy renders in Arabic (RTL) with no raw key', async () => {
    const d = createProfileDouble({ tables: { profiles: [profileRow] } });
    renderProfile(<PrivacyScreen />, { client: d.client, language: 'ar-XA', direction: 'rtl' });
    await waitFor(() => expect(screen.getByTestId('screen-privacy')).toBeTruthy());
    expect(screen.getByText('تفضيلات الرقص')).toBeTruthy();
    expect(allStrings(screen.getByTestId('screen-privacy')).filter((s) => RAW_KEY.test(s))).toEqual([]);
  });

  it('my profile renders in German (du-form catalog) with no raw key', async () => {
    const d = createProfileDouble({ tables: { profiles: [profileRow] } });
    renderProfile(<MyProfileScreen />, { client: d.client, language: 'de-DE' });
    await waitFor(() => expect(screen.getByTestId('screen-my-profile')).toBeTruthy());
    expect(screen.getByText('Identität')).toBeTruthy();
    expect(allStrings(screen.getByTestId('screen-my-profile')).filter((s) => RAW_KEY.test(s))).toEqual([]);
  });
});
