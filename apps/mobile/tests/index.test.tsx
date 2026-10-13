/**
 * VTID-05157 — not-found renders catalog text only.
 * VTID-05186 — `/` is the landing redirect (signed in → /home, signed out → /maxina).
 */
import './helpers/no-network';
import './helpers/mocks';
import { render, screen } from '@testing-library/react-native';
import NotFound from '../app/+not-found';
import Landing from '../app/index';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { translate, type Locale } from '../src/i18n';
import { createSupabaseDouble, fakeSession } from './helpers/supabase-double';
import { makeWrapper } from './helpers/providers';
import { __setSupabaseForTests } from '../src/auth/client';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    Redirect: ({ href }: { href: string }) => <Text testID="redirect">{href}</Text>,
    router: { navigate: jest.fn(), replace: jest.fn() },
    usePathname: () => '/',
  };
});

function texts(node: unknown): string[] {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (typeof n === 'string') out.push(n);
    else if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object' && 'children' in n) walk((n as { children: unknown }).children);
  };
  walk(node);
  return out;
}

afterAll(() => __setSupabaseForTests(null));

describe.each<Locale>(['de', 'en'])('not-found in %s', (locale) => {
  it('renders errors.pageNotFound / pageNotFoundDesc', () => {
    const view = render(
      <I18nProvider initialLocale={locale}>
        <NotFound />
      </I18nProvider>,
    );
    expect(texts(view.toJSON())).toEqual([translate(locale, 'errors.pageNotFound'), translate(locale, 'errors.pageNotFoundDesc')]);
  });
});

describe('landing redirect', () => {
  it('signed in → /home', async () => {
    const d = createSupabaseDouble({ session: fakeSession('u-1') });
    render(<Landing />, { wrapper: makeWrapper({ client: d.client }) });
    expect((await screen.findByTestId('redirect')).props.children).toBe('/home');
  });

  it('signed out → /maxina', async () => {
    const d = createSupabaseDouble();
    render(<Landing />, { wrapper: makeWrapper({ client: d.client }) });
    expect((await screen.findByTestId('redirect')).props.children).toBe('/maxina');
  });
});

it('de and en differ, so the text really comes from the catalog', () => {
  expect(translate('de', 'common.loading')).not.toBe(translate('en', 'common.loading'));
});
