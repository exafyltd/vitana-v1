/**
 * VTID-05450 (native-wave2-public-auth-onboarding-r3/onboarding) —
 * `/onboarding/welcome` (src/pages/onboarding/OnboardingWelcome.tsx): the
 * welcome render and Vitana's speech (timed bubbles, skip), the name / handle
 * form (validation, availability, save, errors), the audiobook start step,
 * the already-onboarded redirect, the AuthGuard (signed out → portal) and the
 * sign-in → `/onboarding/welcome` seam. Fake Supabase double, no network.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { makeWrapper } from '../helpers/providers';
import { onboardingDouble } from './helpers';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { postSignInTarget } from '../../src/auth/sign-in';
import { resolveWebPath } from '../../src/navigation/resolve';
import { AuthGate } from '../../src/shell/AuthGate';
import { OnboardingWelcomeScreen } from '../../src/screens/onboarding/OnboardingWelcomeScreen';
import { BASE_INTERVAL, FINAL_DELAY, FIRST_DELAY, SKIP_DELAY, SPEECH_KEYS, getMessageDelay } from '../../src/screens/onboarding/OnboardingSpeech';
import {
  AUDIOBOOK_START_ROUTE,
  HANDLE_CHECK_DEBOUNCE_MS,
  ONBOARDING_KEY,
  canSubmitForm,
  cleanHandle,
  safeRedirect,
  slugify,
} from '../../src/screens/onboarding/onboarding-data';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: RNText } = require('react-native');
  return {
    router: { navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
    usePathname: () => '/onboarding/welcome',
    useLocalSearchParams: () => mockParams,
    useGlobalSearchParams: () => mockParams,
    Redirect: ({ href }: { href: string }) => <RNText testID="redirect">{href}</RNText>,
  };
});

afterAll(() => __setSupabaseForTests(null));
beforeEach(async () => {
  jest.clearAllMocks();
  jest.useRealTimers();
  mockParams = {};
  await AsyncStorage.clear();
});

const de = (k: string, p?: Record<string, string | number>) => translate('de', k, p);

function renderScreen(d: ReturnType<typeof onboardingDouble>, ui: ReactElement = <OnboardingWelcomeScreen />, language = 'de-DE') {
  return render(ui, { wrapper: makeWrapper({ client: d.client, language }) });
}

/** Through the speech to the form (Skip intro). */
async function toForm() {
  fireEvent.press(await screen.findByTestId('onboarding-skip'));
  await act(async () => {
    jest.advanceTimersByTime(SKIP_DELAY);
  });
  return screen.findByTestId('onboarding-name-form');
}

describe('welcome render + Vitana speech (OnboardingSpeech.tsx)', () => {
  it('a new member sees the Maxina welcome, the bubbles one by one, then the form', async () => {
    jest.useFakeTimers();
    const d = onboardingDouble();
    renderScreen(d);
    expect(await screen.findByText(de('screens.onboarding.welcomeMaxina'))).toBeTruthy();
    expect(screen.getByText(de('screens.onboarding.yourLongevityJourneyBeginsNow'))).toBeTruthy();
    expect(screen.getByTestId('onboarding-typing', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(de(SPEECH_KEYS[0]))).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(FIRST_DELAY);
    });
    expect(screen.getByText(de(SPEECH_KEYS[0]))).toBeTruthy();
    expect(screen.queryByText(de(SPEECH_KEYS[1]))).toBeNull();

    const messages = SPEECH_KEYS.map((k) => de(k));
    for (let i = 1; i < SPEECH_KEYS.length; i++) {
      await act(async () => {
        jest.advanceTimersByTime(getMessageDelay(messages, i));
      });
      expect(screen.getByText(messages[i])).toBeTruthy();
    }
    expect(screen.queryByTestId('onboarding-typing', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('onboarding-skip')).toBeNull();
    expect(screen.queryByTestId('onboarding-name-form')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(FINAL_DELAY);
    });
    expect(screen.getByTestId('onboarding-name-form')).toBeTruthy();
    expect(screen.getByText(de('onboarding.nameForm.title'))).toBeTruthy();
  });

  it('message delay: 3 s + 12 ms per character, at most 4 s extra', () => {
    expect(getMessageDelay(['abc'], 0)).toBe(BASE_INTERVAL + 36);
    expect(getMessageDelay(['x'.repeat(1000)], 0)).toBe(BASE_INTERVAL + 4000);
    expect(getMessageDelay([], 3)).toBe(BASE_INTERVAL);
  });

  it('"Skip intro" shows every bubble and opens the form 600 ms later', async () => {
    jest.useFakeTimers();
    renderScreen(onboardingDouble());
    const skip = await screen.findByTestId('onboarding-skip');
    expect(screen.getByText(de('onboarding.skipIntro'))).toBeTruthy();
    fireEvent.press(skip);
    for (const k of SPEECH_KEYS) expect(screen.getByText(de(k))).toBeTruthy();
    expect(screen.queryByTestId('onboarding-name-form')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(SKIP_DELAY);
    });
    expect(screen.getByTestId('onboarding-name-form')).toBeTruthy();
  });

  it('renders full screen over the member shell (the web page is outside AppLayout)', async () => {
    renderScreen(onboardingDouble());
    expect(await screen.findByTestId('onboarding-welcome')).toBeTruthy();
    expect(screen.getByTestId('onboarding-backdrop')).toBeTruthy();
  });
});

describe('already onboarded (useOnboardingStatus.ts)', () => {
  it('a profile with name and handle goes straight to /home and stores the device flag', async () => {
    const d = onboardingDouble({ userId: 'u-old', profiles: [{ user_id: 'u-old', display_name: 'Ana', handle: 'ana' }] });
    renderScreen(d);
    expect(screen.getByTestId('onboarding-loading')).toBeTruthy();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
    expect(await AsyncStorage.getItem(ONBOARDING_KEY)).toBe('u-old');
    expect(screen.queryByText(de('screens.onboarding.welcomeMaxina'))).toBeNull();
  });

  it('the device flag skips the profile query; a deep link wins over /home', async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'u-new');
    mockParams = { redirectTo: '/inbox' };
    const d = onboardingDouble();
    renderScreen(d);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/inbox'));
    expect(d.calls.some((c) => c.fn === 'from.profiles.select')).toBe(false);
  });

  it('a profile without a handle shows onboarding; a failing query too (the web safer default)', async () => {
    renderScreen(onboardingDouble({ profiles: [{ user_id: 'u-new', display_name: 'Ana', handle: null }] }));
    expect(await screen.findByText(de('screens.onboarding.welcomeMaxina'))).toBeTruthy();
    screen.unmount();
    renderScreen(onboardingDouble({ profileQueryError: true }));
    expect(await screen.findByText(de('screens.onboarding.welcomeMaxina'))).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('name / handle form (OnboardingNameForm.tsx)', () => {
  it('suggests the handle from the name; the submit needs a 2+ char name and a 3+ char handle', async () => {
    jest.useFakeTimers();
    renderScreen(onboardingDouble());
    await toForm();
    const submit = screen.getByTestId('onb-submit');
    expect(submit.props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('onb-display-name'), 'A');
    expect(screen.getByTestId('onb-handle').props.value).toBe('a');
    expect(screen.getByText(de('onboarding.nameForm.handleMinLength'))).toBeTruthy();
    expect(screen.getByTestId('onb-submit').props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('onb-display-name'), 'Ana Marie');
    expect(screen.getByTestId('onb-handle').props.value).toBe('ana_marie');
    await act(async () => {
      jest.advanceTimersByTime(HANDLE_CHECK_DEBOUNCE_MS);
    });
    expect(await screen.findByText(de('onboarding.nameForm.handleAvailable'))).toBeTruthy();
    expect(screen.getByTestId('onb-submit').props.accessibilityState.disabled).toBe(false);
  });

  it('pre-fills the name from the sign-up full_name and stops suggesting once the member types a handle', async () => {
    jest.useFakeTimers();
    renderScreen(onboardingDouble({ meta: { full_name: 'Žana Ö' } }));
    await toForm();
    expect(screen.getByTestId('onb-display-name').props.value).toBe('Žana Ö');
    expect(screen.getByTestId('onb-handle').props.value).toBe('ana_');
    fireEvent.changeText(screen.getByTestId('onb-handle'), 'My Handle!');
    expect(screen.getByTestId('onb-handle').props.value).toBe('myhandle');
    fireEvent.changeText(screen.getByTestId('onb-display-name'), 'Someone Else');
    expect(screen.getByTestId('onb-handle').props.value).toBe('myhandle');
  });

  it("a handle someone else owns is taken (submit off); the member's own handle is available", async () => {
    jest.useFakeTimers();
    renderScreen(onboardingDouble({ profiles: [{ user_id: 'u-other', handle: 'taken_one' }, { user_id: 'u-new', handle: 'mine' }] }));
    await toForm();
    fireEvent.changeText(screen.getByTestId('onb-display-name'), 'Ana');
    fireEvent.changeText(screen.getByTestId('onb-handle'), 'taken_one');
    await act(async () => {
      jest.advanceTimersByTime(HANDLE_CHECK_DEBOUNCE_MS);
    });
    expect(await screen.findByText(de('onboarding.nameForm.handleTaken'))).toBeTruthy();
    expect(screen.getByTestId('onb-handle-status-taken')).toBeTruthy();
    expect(screen.getByTestId('onb-submit').props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('onb-handle'), 'mine');
    await act(async () => {
      jest.advanceTimersByTime(HANDLE_CHECK_DEBOUNCE_MS);
    });
    expect(await screen.findByText(de('onboarding.nameForm.handleAvailable'))).toBeTruthy();
  });

  it('pure rules: slugify, cleanHandle, canSubmit (the web constants)', () => {
    expect(slugify('Ana Marie-Lou')).toBe('ana_marielou');
    expect(slugify('x'.repeat(40))).toHaveLength(30);
    expect(cleanHandle('AB c$d_9')).toBe('abcd_9');
    expect(canSubmitForm('A', 'abc', 'available', false)).toBe(false);
    expect(canSubmitForm('Ab', 'ab', 'available', false)).toBe(false);
    expect(canSubmitForm('Ab', 'abc', 'checking', false)).toBe(false);
    expect(canSubmitForm('Ab', 'abc', 'taken', false)).toBe(false);
    expect(canSubmitForm('Ab', 'abc', 'idle', true)).toBe(false);
    expect(canSubmitForm('  Ab ', 'abc', 'idle', false)).toBe(true);
  });

  it('saves the profile, mirrors app_users, keeps the intro default, sets the flag, then shows the audiobook step', async () => {
    jest.useFakeTimers();
    const d = onboardingDouble();
    renderScreen(d);
    await toForm();
    fireEvent.changeText(screen.getByTestId('onb-display-name'), '  Ana  ');
    fireEvent.changeText(screen.getByTestId('onb-handle'), 'Ana_1');
    await act(async () => {
      jest.advanceTimersByTime(HANDLE_CHECK_DEBOUNCE_MS);
    });
    await screen.findByText(de('onboarding.nameForm.handleAvailable'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('onb-submit'));
    });
    expect(await screen.findByTestId('onboarding-audiobook-start')).toBeTruthy();
    expect(d.upserts).toEqual([{ table: 'profiles', values: expect.objectContaining({ user_id: 'u-new', display_name: 'Ana', handle: 'ana_1' }), options: { onConflict: 'user_id' } }]);
    expect(d.writes).toEqual([{ table: 'app_users', values: expect.objectContaining({ display_name: 'Ana' }), filters: [['user_id', 'u-new']] }]);
    expect(d.writes.some((w) => w.table === 'global_community_profiles')).toBe(false);
    expect(await AsyncStorage.getItem(ONBOARDING_KEY)).toBe('u-new');
    expect(d.calls.filter((c) => c.fn.startsWith('auth.') && !['auth.getSession'].includes(c.fn))).toEqual([]);
  });

  it('"Introduce me" off writes the explicit opt-out', async () => {
    jest.useFakeTimers();
    const d = onboardingDouble();
    renderScreen(d);
    await toForm();
    fireEvent.changeText(screen.getByTestId('onb-display-name'), 'Ana');
    const sw = screen.getByTestId('onb-community-intro-switch');
    expect(sw.props.accessibilityState.checked).toBe(true);
    expect(sw.props.accessibilityLabel).toBe(de('onboarding.nameForm.communityIntroLabel'));
    fireEvent.press(sw);
    await act(async () => {
      jest.advanceTimersByTime(HANDLE_CHECK_DEBOUNCE_MS);
    });
    await screen.findByText(de('onboarding.nameForm.handleAvailable'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('onb-submit'));
    });
    await screen.findByTestId('onboarding-audiobook-start');
    expect(d.writes).toContainEqual({ table: 'global_community_profiles', values: { community_intro_opt_in: false }, filters: [['user_id', 'u-new']] });
  });

  it('a unique-handle conflict marks the handle taken with the catalog error; another failure shows its message', async () => {
    jest.useFakeTimers();
    renderScreen(onboardingDouble({ upsertError: { code: '23505', message: 'duplicate key value violates unique constraint "profiles_handle_key"' } }));
    await toForm();
    fireEvent.changeText(screen.getByTestId('onb-display-name'), 'Ana');
    await act(async () => {
      jest.advanceTimersByTime(HANDLE_CHECK_DEBOUNCE_MS);
    });
    await screen.findByText(de('onboarding.nameForm.handleAvailable'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('onb-submit'));
    });
    expect(await screen.findByText(de('onboardingNative.errors.handleTaken'))).toBeTruthy();
    expect(screen.getByTestId('onb-handle-status-taken')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-audiobook-start')).toBeNull();
    expect(await AsyncStorage.getItem(ONBOARDING_KEY)).toBeNull();
    screen.unmount();

    renderScreen(onboardingDouble({ upsertError: { message: 'permission denied' } }));
    await toForm();
    fireEvent.changeText(screen.getByTestId('onb-display-name'), 'Ana');
    await act(async () => {
      jest.advanceTimersByTime(HANDLE_CHECK_DEBOUNCE_MS);
    });
    await screen.findByText(de('onboarding.nameForm.handleAvailable'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('onb-submit'));
    });
    expect(await screen.findByTestId('onb-error')).toHaveTextContent('permission denied');
  });
});

describe('after the form (OnboardingWelcome.tsx handleFormComplete / start step)', () => {
  async function submitForm() {
    await toForm();
    fireEvent.changeText(screen.getByTestId('onb-display-name'), 'Ana');
    await act(async () => {
      jest.advanceTimersByTime(HANDLE_CHECK_DEBOUNCE_MS);
    });
    await screen.findByText(de('onboarding.nameForm.handleAvailable'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('onb-submit'));
    });
  }

  it('a deep link (redirectTo) wins: straight there, no audiobook step', async () => {
    jest.useFakeTimers();
    mockParams = { redirectTo: '/inbox' };
    renderScreen(onboardingDouble());
    await submitForm();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/inbox'));
    expect(screen.queryByTestId('onboarding-audiobook-start')).toBeNull();
  });

  it('"Play Episode 1" opens My Journey with the audiobook route; "Later" goes to /home', async () => {
    jest.useFakeTimers();
    renderScreen(onboardingDouble());
    await submitForm();
    expect(await screen.findByText(de('screens.onboarding.audiobookReadyTitle'))).toBeTruthy();
    expect(screen.getByText(de('screens.onboarding.audiobookReadyBody'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('onboarding-play-episode-one'));
    expect(router.replace).toHaveBeenCalledWith(AUDIOBOOK_START_ROUTE);
    fireEvent.press(screen.getByTestId('onboarding-audiobook-later'));
    expect(router.replace).toHaveBeenLastCalledWith('/home');
    // The start step stays up although the member no longer needs onboarding.
    expect(screen.getByTestId('onboarding-audiobook-start')).toBeTruthy();
  });

  it('safeRedirect keeps in-app paths only and never points back at this page', () => {
    expect(safeRedirect('/inbox?x=1')).toBe('/inbox?x=1');
    expect(safeRedirect(['/a', '/b'])).toBe('/a');
    expect(safeRedirect('https://evil.example.org')).toBeNull();
    expect(safeRedirect('//evil.example.org')).toBeNull();
    expect(safeRedirect('/onboarding/welcome')).toBeNull();
    expect(safeRedirect('/onboarding/welcome/?redirectTo=%2Fx')).toBeNull();
    expect(safeRedirect(undefined)).toBeNull();
  });
});

describe('AuthGuard and the sign-in seam', () => {
  it('signed out → the (app) AuthGate sends /onboarding/welcome to the portal with redirectTo', async () => {
    const d = onboardingDouble({ signedOut: true });
    renderScreen(d, <AuthGate member={<OnboardingWelcomeScreen />} guest={<Text testID="guest" />} />);
    expect(await screen.findByTestId('redirect')).toHaveTextContent('/maxina?redirectTo=%2Fonboarding%2Fwelcome');
    expect(screen.queryByTestId('onboarding-welcome')).toBeNull();
    expect(d.calls.some((c) => c.fn.startsWith('from.profiles'))).toBe(false);
  });

  it('signed in → the AuthGate renders the welcome screen', async () => {
    renderScreen(onboardingDouble(), <AuthGate member={<OnboardingWelcomeScreen />} guest={<Text testID="guest" />} />);
    expect(await screen.findByTestId('onboarding-welcome')).toBeTruthy();
    expect(screen.queryByTestId('redirect')).toBeNull();
  });

  it('postSignInTarget (auth-portals) resolves to this native route, query kept', () => {
    expect(resolveWebPath(postSignInTarget(null))).toEqual(expect.objectContaining({ kind: 'native', path: '/onboarding/welcome' }));
    const deep = resolveWebPath(postSignInTarget('/inbox'));
    expect(deep).toEqual(expect.objectContaining({ kind: 'native', path: '/onboarding/welcome', query: 'redirectTo=%2Finbox' }));
  });
});
