/**
 * VTID-05176 — the dev catalogue route (plan change 31): renders for the
 * `development` / `test-g1` profiles only, every section testID present, no
 * raw text, and every key it uses comes from src/ui/catalogue-keys.ts and
 * resolves in each of the 11 locales WITHOUT the `de` fallback.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { LOCALES, translate } from '../../src/i18n';
import { CATALOGUE_KEYS } from '../../src/ui/catalogue-keys';
import { getToasts } from '../../src/ui/toast/store';
import { resetKit, resolveStrict, texts } from './helpers';

const mockConstants: { expoConfig: { extra: { profile?: string } } } = { expoConfig: { extra: {} } };
jest.mock('expo-constants', () => ({
  __esModule: true,
  get default() {
    return mockConstants;
  },
}));
const mockRedirect = jest.fn((_props: { href: string }) => null);
jest.mock('expo-router', () => ({ Redirect: (props: { href: string }) => mockRedirect(props) }));

import NativeUiCatalogue, { catalogueAllowed } from '../../app/native-ui-catalogue';

const SECTIONS = [
  'controls',
  'buttons',
  'badges',
  'card',
  'fields',
  'separator-skeleton',
  'dialogs',
  'sheets',
  'popover-tooltip',
  'tabs',
  'select',
  'toggles',
  'slider',
  'accordion',
  'avatar-progress',
  'scroll-area',
  'toasts',
];

const SOURCE = readFileSync(join(__dirname, '../../app/native-ui-catalogue.tsx'), 'utf8');
const KEYS = Object.values(CATALOGUE_KEYS);

beforeEach(() => {
  resetKit();
  mockRedirect.mockClear();
});

function renderCatalogue(profile: string | undefined, locale: 'en' | 'de' = 'en') {
  mockConstants.expoConfig.extra.profile = profile;
  return render(
    <I18nProvider initialLocale={locale}>
      <NativeUiCatalogue />
    </I18nProvider>,
  );
}

describe('profile gate', () => {
  it.each(['development', 'test-g1'])('renders under %s', (profile) => {
    renderCatalogue(profile);
    expect(screen.getByTestId('native-ui-catalogue')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it.each([undefined, 'production', 'staging', ''])('redirects to / under %p', (profile) => {
    renderCatalogue(profile);
    expect(screen.queryByTestId('native-ui-catalogue')).toBeNull();
    expect(mockRedirect).toHaveBeenCalledWith({ href: '/' });
    expect(catalogueAllowed(profile)).toBe(false);
  });
});

describe('content', () => {
  it('has every section testID', () => {
    renderCatalogue('development');
    for (const id of SECTIONS) expect(screen.getByTestId(`catalogue-${id}`)).toBeTruthy();
  });

  it.each(['en', 'de'] as const)('renders no raw text (%s): every string is a catalogue key translation', (locale) => {
    const view = renderCatalogue('development', locale);
    const allowed = new Set(KEYS.map((k) => translate(locale, k)));
    const unexpected = texts(view.toJSON()).filter((s) => !allowed.has(s));
    expect(unexpected).toEqual([]);
  });

  it('the light/dark switch flips the scheme', () => {
    renderCatalogue('development');
    const before = screen.getByTestId('native-ui-catalogue').props.style;
    fireEvent.press(screen.getByTestId('catalogue-scheme-switch'));
    expect(screen.getByTestId('native-ui-catalogue').props.style).not.toEqual(before);
  });

  it('shows the current direction', () => {
    renderCatalogue('development');
    expect(screen.getByTestId('catalogue-direction').props.accessibilityValue).toEqual({ text: 'ltr' });
  });

  it('the toast buttons fire every kind', () => {
    renderCatalogue('development');
    for (const id of ['toast-notify', 'toast-success', 'toast-error', 'toast-warning', 'toast-info', 'toast-shadcn', 'toast-sonner']) {
      fireEvent.press(screen.getByTestId(id));
    }
    const kinds = getToasts().map((t) => `${t.source}:${t.kind}`);
    expect(kinds).toContain('shadcn:default');
    expect(kinds).toContain('sonner:success');
  });

  it('overlay launchers open their overlays', () => {
    renderCatalogue('development');
    fireEvent.press(screen.getByTestId('open-dialog'));
    expect(screen.getByTestId('dialog-content')).toBeTruthy();
  });
});

describe('keys', () => {
  it.each(KEYS.flatMap((key) => LOCALES.map((locale) => [key, locale])))('%s resolves in %s without the de fallback', (key, locale) => {
    const text = resolveStrict(locale, key);
    expect(typeof text).toBe('string');
    expect(text).not.toBe('');
    expect(text).not.toBe(key);
  });

  it('every key the catalogue uses is in catalogue-keys.ts, and none is a string literal', () => {
    const names = [...SOURCE.matchAll(/\bK\.(\w+)/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(20);
    for (const n of names) expect(Object.keys(CATALOGUE_KEYS)).toContain(n);
    expect(SOURCE).not.toMatch(/\bt\(\s*['"`]/);
    expect(SOURCE).not.toMatch(/\bnotify\w*\(\s*['"`]/);
  });

  it('every listed toast key is used by the catalogue', () => {
    for (const name of ['updating', 'done', 'failedLoadData', 'offline', 'reconnecting']) {
      expect(SOURCE).toMatch(new RegExp(`notify\\w*\\(K\\.${name}\\)`));
    }
  });
});
