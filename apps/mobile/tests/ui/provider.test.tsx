/**
 * VTID-05176 — VitanaUIProvider (plan change 7): one GestureHandlerRootView,
 * overlay root and toast host per app; a nested provider renders none of them
 * and only overrides the theme values it is given, inside its own subtree.
 */
import { Text as RNText } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { notify, useDirection, useReducedMotion, useTheme, VitanaUIProvider } from '../../src/ui';
import { tokens } from '../../src/ui/theme';
import { resetKit, withIsRTL } from './helpers';

beforeEach(resetKit);

function Probe({ id }: { id: string }) {
  const theme = useTheme();
  const dir = useDirection();
  const reduced = useReducedMotion();
  return <RNText testID={id}>{`${theme.scheme}|${dir}|${reduced}|${theme.colors.background}`}</RNText>;
}

const counts = () => ({
  gesture: screen.queryAllByTestId('vitana-ui-gesture-root').length,
  overlayRoot: screen.queryAllByTestId('vitana-ui-overlay-root').length,
  toastHost: screen.queryAllByTestId('vitana-ui-toast-host').length,
});

describe('VitanaUIProvider', () => {
  it('a provider alone (the catalogue without N3) renders each host exactly once', () => {
    render(
      <I18nProvider initialLocale="en">
        <VitanaUIProvider>
          <Probe id="p" />
        </VitanaUIProvider>
      </I18nProvider>,
    );
    expect(counts()).toEqual({ gesture: 1, overlayRoot: 1, toastHost: 1 });
  });

  it('defaults to light at the root (web defaultTheme="light")', () => {
    render(
      <VitanaUIProvider reducedMotion={false} direction="ltr">
        <Probe id="p" />
      </VitanaUIProvider>,
    );
    expect(screen.getByTestId('p').props.children).toBe(`light|ltr|false|${tokens.color.light.background}`);
  });

  it('a nested provider renders no second host and overrides only inside its subtree', () => {
    render(
      <I18nProvider initialLocale="en">
        <VitanaUIProvider colorScheme="light" direction="ltr" reducedMotion>
          <Probe id="outer" />
          <VitanaUIProvider colorScheme="dark" direction="rtl">
            <Probe id="inner" />
          </VitanaUIProvider>
          <VitanaUIProvider>
            <Probe id="inherits" />
          </VitanaUIProvider>
        </VitanaUIProvider>
      </I18nProvider>,
    );
    expect(counts()).toEqual({ gesture: 1, overlayRoot: 1, toastHost: 1 });
    expect(screen.getByTestId('outer').props.children).toBe(`light|ltr|true|${tokens.color.light.background}`);
    expect(screen.getByTestId('inner').props.children).toBe(`dark|rtl|true|${tokens.color.dark.background}`);
    expect(screen.getByTestId('inherits').props.children).toBe(`light|ltr|true|${tokens.color.light.background}`);
  });

  it('a toast fired inside the nested subtree appears once, in the root host', () => {
    render(
      <I18nProvider initialLocale="en">
        <VitanaUIProvider>
          <VitanaUIProvider colorScheme="dark">
            <Probe id="inner" />
          </VitanaUIProvider>
        </VitanaUIProvider>
      </I18nProvider>,
    );
    act(() => notify('common.done'));
    expect(screen.getAllByText('Done')).toHaveLength(1);
    expect(screen.getAllByTestId('vitana-ui-toast-host')).toHaveLength(1);
  });

  it('direction defaults to I18nManager.isRTL', () => {
    withIsRTL(true, () => {
      render(
        <VitanaUIProvider>
          <Probe id="p" />
        </VitanaUIProvider>,
      );
    });
    expect(String(screen.getByTestId('p').props.children)).toContain('|rtl|');
  });

  it('colorScheme="system" follows the OS scheme', () => {
    const rn = jest.requireActual('react-native');
    const spy = jest.spyOn(rn, 'useColorScheme').mockReturnValue('dark');
    try {
      render(
        <VitanaUIProvider colorScheme="system">
          <Probe id="p" />
        </VitanaUIProvider>,
      );
      expect(String(screen.getByTestId('p').props.children)).toMatch(/^dark\|/);
    } finally {
      spy.mockRestore();
    }
  });

  it('hooks work without a provider (light, I18nManager direction)', () => {
    render(<Probe id="p" />);
    expect(String(screen.getByTestId('p').props.children)).toMatch(/^light\|ltr\|false\|/);
  });
});
