/** VTID-05157 — the Wave 0 placeholder renders catalog text only. */
import { render, screen } from '@testing-library/react-native';
import Placeholder from '../app/index';
import NotFound from '../app/+not-found';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { translate, type Locale } from '../src/i18n';

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

describe.each<Locale>(['de', 'en'])('placeholder in %s', (locale) => {
  it('renders the catalog text for common.loading and nothing else', () => {
    const view = render(
      <I18nProvider initialLocale={locale}>
        <Placeholder />
      </I18nProvider>,
    );
    const expected = translate(locale, 'common.loading');
    expect(screen.getByText(expected)).toBeTruthy();
    expect(texts(view.toJSON())).toEqual([expected]);
    expect(screen.getByTestId('placeholder').props.accessibilityLabel).toBe(expected);
  });

  it('not-found renders errors.pageNotFound / pageNotFoundDesc', () => {
    const view = render(
      <I18nProvider initialLocale={locale}>
        <NotFound />
      </I18nProvider>,
    );
    expect(texts(view.toJSON())).toEqual([translate(locale, 'errors.pageNotFound'), translate(locale, 'errors.pageNotFoundDesc')]);
  });
});

it('de and en differ, so the text really comes from the catalog', () => {
  expect(translate('de', 'common.loading')).not.toBe(translate('en', 'common.loading'));
});
