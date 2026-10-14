/**
 * VTID-05182 — the ORB FAB and overlay (N6d, plan Changes 15–16, Tests
 * "Locales"): every phase in every one of the 11 locales renders catalog
 * strings only (no raw key), Arabic lays out right-to-left (snapshot), the
 * buttons drive the controller, and the ORB UI uses logical start/end only.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { LOCALES, type Locale } from '../../src/i18n';
import { OrbFab } from '../../src/orb/ui/OrbFab';
import { OrbOverlay } from '../../src/orb/ui/OrbOverlay';
import { useOrbSession } from '../../src/orb/ui/OrbProvider';
import { CAPTION_KEYS, type OrbPhase } from '../../src/orb/ui/orb-ui-state';
import type { OrbController, OrbUiState } from '../../src/orb/ui/orb-controller';
import { registerOrbUi } from '../../src/orb/ui';
import { OrbSlot, registerOrbSlot } from '../../src/ports/orb-slot';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, usePathname: () => '/home' }));
jest.mock('../../src/identity/useRole', () => ({ useRole: () => ({ dbRole: 'community' }) }));

/** A controller double whose state the test sets. */
function fakeController(initial: Partial<OrbUiState> = {}) {
  let state: OrbUiState = { open: false, phase: null, muted: false, liveText: null, snapshot: null, ...initial };
  const listeners = new Set<() => void>();
  const c = {
    getState: () => state,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    open: jest.fn(async () => undefined),
    close: jest.fn(),
    continueRationale: jest.fn(async () => undefined),
    toggleMute: jest.fn(),
    restart: jest.fn(async () => undefined),
    openSettings: jest.fn(),
    setContext: jest.fn(),
    dispose: jest.fn(),
    set(patch: Partial<OrbUiState>) {
      state = { ...state, ...patch };
      for (const l of [...listeners]) l();
    },
  };
  return c as typeof c & OrbController;
}

// The provider is exercised with an injected controller (its default wires the native module).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OrbProvider } = require('../../src/orb/ui/OrbProvider') as typeof import('../../src/orb/ui/OrbProvider');

function Ui({ controller, locale, navVisible = true }: { controller: OrbController; locale: Locale; navVisible?: boolean }) {
  return (
    <I18nProvider initialLocale={locale}>
      <OrbProvider controller={controller}>
        <OrbFab bottomNavVisible={navVisible} hiddenBySheet={false} />
        <OrbOverlay />
      </OrbProvider>
    </I18nProvider>
  );
}

const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;

function allStrings(root: ReactTestInstance): string[] {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    if (typeof n.props?.accessibilityLabel === 'string') out.push(n.props.accessibilityLabel);
    n.children.forEach(walk);
  };
  walk(root);
  return [...new Set(out.filter((s) => s.trim() !== ''))];
}

const PHASES: OrbPhase[] = ['rationale', 'denied', 'unavailable', 'connecting', 'listening', 'thinking', 'speaking', 'muted', 'reconnecting', 'ended', 'error'];

describe.each([...LOCALES])('%s', (locale) => {
  it('FAB and every overlay phase render catalog strings only', () => {
    const c = fakeController();
    render(<Ui controller={c} locale={locale} />);
    expect(allStrings(screen.UNSAFE_root).filter((s) => RAW_KEY.test(s))).toEqual([]);
    for (const phase of PHASES) {
      act(() => c.set({ open: true, phase, muted: phase === 'muted' }));
      const strings = allStrings(screen.UNSAFE_root);
      expect({ phase, raw: strings.filter((s) => RAW_KEY.test(s)) }).toEqual({ phase, raw: [] });
      if (phase !== 'rationale') expect(strings).not.toContain(CAPTION_KEYS[phase]);
    }
  });
});

describe('Arabic is right-to-left', () => {
  it('the overlay root carries direction rtl (snapshot of what a screen reader gets)', () => {
    const c = fakeController({ open: true, phase: 'rationale' });
    render(<Ui controller={c} locale="ar" />);
    expect(StyleSheet.flatten(screen.getByTestId('orb-overlay').props.style).direction).toBe('rtl');
    const rationale = allStrings(screen.UNSAFE_root);
    act(() => c.set({ phase: 'listening' }));
    expect({ direction: 'rtl', rationale, listening: allStrings(screen.UNSAFE_root) }).toMatchSnapshot();
  });

  it('German stays left-to-right', () => {
    render(<Ui controller={fakeController({ open: true, phase: 'listening' })} locale="de" />);
    expect(StyleSheet.flatten(screen.getByTestId('orb-overlay').props.style).direction).toBe('ltr');
  });
});

describe('buttons drive the controller', () => {
  it('FAB: labelled orbHint.tapToTalk, opens the ORB; hidden when the bottom bar is', () => {
    const c = fakeController();
    const { rerender } = render(<Ui controller={c} locale="de" />);
    const fab = screen.getByTestId('orb-fab');
    expect(fab.props.accessibilityLabel).toBe('Tippe hier, um mit Vitana zu sprechen');
    fireEvent.press(fab);
    expect(c.open).toHaveBeenCalledTimes(1);
    rerender(<Ui controller={c} locale="de" navVisible={false} />);
    expect(screen.queryByTestId('orb-fab')).toBeNull();
  });

  it('rationale: continue asks the OS, not now closes', () => {
    const c = fakeController({ open: true, phase: 'rationale' });
    render(<Ui controller={c} locale="de" />);
    expect(screen.getByText('Mit Vitana sprechen')).toBeTruthy();
    fireEvent.press(screen.getByTestId('orb-rationale-continue'));
    expect(c.continueRationale).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('orb-rationale-not-now'));
    expect(c.close).toHaveBeenCalled();
  });

  it('denied: open settings', () => {
    const c = fakeController({ open: true, phase: 'denied' });
    render(<Ui controller={c} locale="de" />);
    expect(screen.getByText('Mikrofonzugriff verweigert')).toBeTruthy();
    fireEvent.press(screen.getByTestId('orb-open-settings'));
    expect(c.openSettings).toHaveBeenCalled();
  });

  it('live: mic toggles mute (label follows), close closes; ended: restart', () => {
    const c = fakeController({ open: true, phase: 'listening' });
    render(<Ui controller={c} locale="de" />);
    expect(screen.getByTestId('orb-caption').props.children).toBe('Ich höre zu...');
    expect(screen.getByTestId('orb-mic').props.accessibilityLabel).toBe('Mikrofon stummschalten');
    fireEvent.press(screen.getByTestId('orb-mic'));
    expect(c.toggleMute).toHaveBeenCalled();
    act(() => c.set({ muted: true, phase: 'muted' }));
    expect(screen.getByTestId('orb-mic').props.accessibilityLabel).toBe('Mikrofon einschalten');
    fireEvent.press(screen.getByTestId('orb-close'));
    expect(c.close).toHaveBeenCalled();
    act(() => c.set({ muted: false, phase: 'ended' }));
    expect(screen.queryByTestId('orb-mic')).toBeNull();
    fireEvent.press(screen.getByTestId('orb-restart'));
    expect(c.restart).toHaveBeenCalled();
  });

  it('transcripts reach screen readers only, through a polite live region', () => {
    const c = fakeController({ open: true, phase: 'speaking', liveText: 'Guten Morgen' });
    render(<Ui controller={c} locale="de" />);
    const region = screen.getByTestId('orb-live-region');
    expect(region.props.accessibilityLiveRegion).toBe('polite');
    expect(region.props.children).toBe('Guten Morgen');
  });

  it('feeds route and role into the controller (Change 18)', () => {
    const c = fakeController();
    render(<Ui controller={c} locale="de" />);
    expect(c.setContext).toHaveBeenCalledWith({ route: '/home', role: 'community' });
  });

  it('outside a provider the overlay renders nothing', () => {
    function Probe() {
      return useOrbSession().controller === null ? <OrbOverlay /> : null;
    }
    render(
      <I18nProvider initialLocale="de">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.queryByTestId('orb-overlay')).toBeNull();
  });
});

describe('N3 ORB slot', () => {
  afterEach(() => registerOrbSlot(null));

  it('registerOrbUi puts the FAB in the bottom-bar slot', () => {
    registerOrbUi();
    render(
      <I18nProvider initialLocale="de">
        <OrbProvider controller={fakeController()}>
          <OrbSlot bottomNavVisible hiddenBySheet={false} />
        </OrbProvider>
      </I18nProvider>,
    );
    expect(screen.getByTestId('orb-fab')).toBeTruthy();
    expect(screen.queryByTestId('orb-slot-placeholder')).toBeNull();
  });
});

it('no physical left/right in the ORB UI or the bench (logical start/end only)', () => {
  const roots = [join(__dirname, '../../src/orb/ui'), join(__dirname, '../../app/dev')];
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) {
        const text = readFileSync(full, 'utf8');
        const re = /\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)\s*:|textAlign:\s*'(left|right)'/g;
        for (const m of text.matchAll(re)) offenders.push(`${full}: ${m[0]}`);
      }
    }
  };
  roots.forEach(walk);
  expect(offenders).toEqual([]);
});
