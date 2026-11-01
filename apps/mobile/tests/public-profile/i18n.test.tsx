/**
 * VTID-05430 (Native Wave 2, public-profile lane) — the `publicProfileNative`
 * catalog exists in all 11 locales with the German key set, and the screen
 * renders in Arabic (RTL) without a raw catalog key.
 */
import '../helpers/no-network';
import './mocks';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { mockParams } from './mocks';
import { makeWrapper } from '../helpers/providers';
import { __setSupabaseForTests } from '../../src/auth/client';
import { UIProvider } from '../../src/ports/ui';
import { LOCALES } from '../../src/i18n';
import { PublicProfileScreen } from '../../src/screens/public-profile/PublicProfileScreen';
import { createProfileClient } from './fake-client';
import { dbProfile } from './fixtures';

afterAll(() => __setSupabaseForTests(null));

const REPO = join(__dirname, '../../../..');
const keysOf = (o: unknown, prefix = ''): string[] =>
  o && typeof o === 'object' ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k)) : [prefix];
const shard = (locale: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', locale, 'publicProfileNative.json'), 'utf8'));

it.each(LOCALES.map((l) => [l]))('%s has the German publicProfileNative key set', (locale) => {
  expect(keysOf(shard(locale)).sort()).toEqual(keysOf(shard('de')).sort());
});

const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;
function allStrings(root: ReactTestInstance): string[] {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') return void out.push(n);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}

it('renders the not-found state in Arabic (RTL) without a raw key', async () => {
  mockParams.current = { identifier: 'nobody' };
  const fake = createProfileClient({ rpc: { get_user_profile_by_identifier: () => ({ data: [], error: null }) } });
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="dark" direction="rtl">
      {children}
    </UIProvider>
  );
  render(<Wrapped><PublicProfileScreen /></Wrapped>, { wrapper: makeWrapper({ client: fake.client, language: 'ar-XA' }) });
  await screen.findByTestId('public-profile-not-found');
  expect(allStrings(screen.root).filter((s) => RAW_KEY.test(s))).toEqual([]);
});

it('renders the landing in Arabic (RTL) without a raw key', async () => {
  mockParams.current = { identifier: 'lenatest' };
  const fake = createProfileClient({ rpc: { get_user_profile_by_identifier: () => ({ data: [dbProfile], error: null }) } });
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="dark" direction="rtl">
      {children}
    </UIProvider>
  );
  render(<Wrapped><PublicProfileScreen /></Wrapped>, { wrapper: makeWrapper({ client: fake.client, language: 'ar-XA' }) });
  await screen.findByTestId('public-profile-landing');
  expect(allStrings(screen.root).filter((s) => RAW_KEY.test(s))).toEqual([]);
});
