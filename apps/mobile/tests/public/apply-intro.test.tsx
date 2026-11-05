/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — `/apply`
 * (render in German by default, the DE / EN toggle, the web validation order
 * and error keys as toasts, the payload, the success panel and the duplicate
 * error — the insert runs only against a fake client, never a live system)
 * and `/_intro/:tenantSlug` (render, Login / Register hand-over to the portal
 * keeping the query, the language pill). No network.
 */
import '../helpers/no-network';
import { resetMocks, router, publicWrapper, insertClient } from './helpers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { translate } from '../../src/i18n';
import { getToasts, __resetToasts } from '../../src/ui/toast/store';
import { ApplyScreen } from '../../src/screens/public/ApplyScreen';
import { EMPTY_APPLY_FORM, applicationPayload, validateApplication, type ApplyFormState } from '../../src/screens/public/apply-form';
import { IntroScreen, hasSeenIntro, introTarget } from '../../src/screens/public/IntroScreen';

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  resetMocks();
  __resetToasts();
});

const VALID: ApplyFormState = {
  ...EMPTY_APPLY_FORM,
  full_name: ' Ana Test ',
  email: ' Ana@Example.ORG ',
  phone: '+43 1',
  instagram_handle: '@ana.test',
  device: 'ios',
  location: 'Wien',
  consent_age: true,
  consent_terms: true,
};

describe('apply form validation (web handleSubmit order)', () => {
  it.each<[string, Partial<ApplyFormState>, string | null]>([
    ['empty form', EMPTY_APPLY_FORM, 'apply.errorRequired'],
    ['missing consent', { consent_terms: false }, 'apply.errorRequired'],
    ['missing device', { device: '' }, 'apply.errorRequired'],
    ['bad e-mail', { email: 'ana@' }, 'apply.errorInvalidEmail'],
    ['bad instagram', { instagram_handle: 'ana test!' }, 'apply.errorInvalidInstagram'],
    ['android without google e-mail', { device: 'android' }, 'apply.errorAndroidGoogleRequired'],
    ['android with google e-mail', { device: 'android', google_account_email: 'g@example.org' }, null],
    ['valid ios', {}, null],
  ])('%s', (_name, patch, expected) => {
    const form = patch === EMPTY_APPLY_FORM ? EMPTY_APPLY_FORM : { ...VALID, ...patch };
    expect(validateApplication(form)).toBe(expected);
  });

  it('payload: trimmed, lower-cased e-mail, @ stripped, google e-mail only on android, locale + utm', () => {
    expect(applicationPayload(VALID, 'en', { utm_source: 'ig', utm_medium: null, utm_campaign: 'c' })).toEqual({
      full_name: 'Ana Test',
      email: 'ana@example.org',
      phone: '+43 1',
      instagram_handle: 'ana.test',
      device: 'ios',
      google_account_email: null,
      location: 'Wien',
      available_for_events: false,
      consent_age: true,
      consent_terms: true,
      locale: 'en',
      utm_source: 'ig',
      utm_medium: null,
      utm_campaign: 'c',
    });
  });
});

function fill() {
  fireEvent.changeText(screen.getByTestId('apply-full_name'), 'Ana Test');
  fireEvent.changeText(screen.getByTestId('apply-email'), 'Ana@Example.org');
  fireEvent.changeText(screen.getByTestId('apply-phone'), '+43 1');
  fireEvent.changeText(screen.getByTestId('apply-instagram_handle'), '@ana');
  fireEvent.press(screen.getByTestId('apply-device-ios'));
  fireEvent.changeText(screen.getByTestId('apply-location'), 'Wien');
  fireEvent.press(screen.getByTestId('apply-consent_age'));
  fireEvent.press(screen.getByTestId('apply-consent_terms'));
}

describe('/apply screen', () => {
  it('renders in German by default regardless of the member language, all sections present', () => {
    const { wrapper } = publicWrapper({ language: 'fr-FR' });
    render(<ApplyScreen />, { wrapper });
    for (const k of ['apply.overline', 'apply.headlineLine2', 'apply.chipTicket', 'apply.valueAccessTitle', 'apply.aboutTitle', 'apply.benefitSeat', 'apply.formTitle', 'apply.submit', 'apply.footerTerms']) {
      expect(screen.getAllByText(translate('de', k)).length).toBeGreaterThan(0);
    }
    expect(screen.getByTestId('apply-locale-de').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('the EN toggle switches the page to English (route-scoped, no global change)', () => {
    const { wrapper } = publicWrapper({ language: 'de-DE' });
    render(<ApplyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('apply-locale-en'));
    expect(screen.getByText(translate('en', 'apply.formTitle'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('apply-footer-privacy'));
    expect(router.navigate).toHaveBeenCalledWith('/privacy?lang=en');
  });

  it('an empty submit shows the required-fields error in the page language and sends nothing', async () => {
    const { wrapper, client } = publicWrapper();
    const inserts = insertClient(client);
    render(<ApplyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('apply-submit'));
    expect(getToasts().map((t) => [t.kind, t.title])).toEqual([['error', translate('de', 'apply.errorRequired')]]);
    expect(inserts).toEqual([]);
  });

  it('android asks for the Google account e-mail', () => {
    const { wrapper, client } = publicWrapper();
    const inserts = insertClient(client);
    render(<ApplyScreen />, { wrapper });
    expect(screen.queryByTestId('apply-google_account_email')).toBeNull();
    fill();
    fireEvent.press(screen.getByTestId('apply-device-android'));
    expect(screen.getByTestId('apply-google_account_email')).toBeTruthy();
    fireEvent.press(screen.getByTestId('apply-submit'));
    expect(getToasts().map((t) => t.title)).toEqual([translate('de', 'apply.errorAndroidGoogleRequired')]);
    expect(inserts).toEqual([]);
  });

  it('a valid application is inserted once (fake client) and the success panel shows the e-mail', async () => {
    resetMocks({ utm_source: 'ig', utm_campaign: 'spring' });
    const { wrapper, client } = publicWrapper();
    const inserts = insertClient(client);
    render(<ApplyScreen />, { wrapper });
    fill();
    fireEvent.press(screen.getByTestId('apply-submit'));
    await waitFor(() => expect(screen.getByTestId('apply-success')).toBeTruthy());
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe('test_user_applications');
    expect(inserts[0].rows).toMatchObject({ email: 'ana@example.org', instagram_handle: 'ana', device: 'ios', locale: 'de', utm_source: 'ig', utm_medium: null, utm_campaign: 'spring' });
    expect(screen.getByText(translate('de', 'apply.successBody', { email: 'ana@example.org' }))).toBeTruthy();
    expect(screen.queryByTestId('apply-form')).toBeNull();
  });

  it('a duplicate (23505) shows "already applied"; any other error the generic one', async () => {
    const { wrapper, client } = publicWrapper();
    insertClient(client, { code: '23505' });
    const a = render(<ApplyScreen />, { wrapper });
    fill();
    fireEvent.press(screen.getByTestId('apply-submit'));
    await waitFor(() => expect(getToasts().map((t) => t.title)).toEqual([translate('de', 'apply.errorAlreadyApplied')]));
    expect(screen.getByTestId('apply-form')).toBeTruthy();
    a.unmount();
    __resetToasts();
    insertClient(client, { code: '500' });
    render(<ApplyScreen />, { wrapper });
    fill();
    fireEvent.press(screen.getByTestId('apply-submit'));
    await waitFor(() => expect(getToasts().map((t) => t.title)).toEqual([translate('de', 'apply.errorGeneric')]));
  });
});

describe('/_intro/:tenantSlug', () => {
  it('renders the eyebrow, wordmark, taglines, Orb slot + caption, language pill and the two actions', () => {
    resetMocks({ tenantSlug: 'maxina' });
    const { wrapper } = publicWrapper({ language: 'en-US' });
    render(<IntroScreen />, { wrapper });
    for (const k of ['intro.welcomeTo', 'intro.experience', 'intro.taglineMain', 'intro.taglineSub', 'intro.tapOrbHint', 'intro.login', 'intro.register']) {
      expect(screen.getByText(translate('en', k))).toBeTruthy();
    }
    expect(screen.getByText('MAXINA')).toBeTruthy();
    expect(screen.getByTestId('intro-orb-slot', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
  });

  it('Login hands over to /<tenant> keeping the query; Register adds tab=signup; both mark the intro seen', () => {
    resetMocks({ tenantSlug: 'maxina', redirectTo: '/comm/media-hub?short=1' });
    const { wrapper } = publicWrapper({ language: 'en-US' });
    render(<IntroScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('intro-login'));
    expect(router.replace).toHaveBeenLastCalledWith('/maxina?redirectTo=%2Fcomm%2Fmedia-hub%3Fshort%3D1');
    fireEvent.press(screen.getByTestId('intro-register'));
    expect(router.replace).toHaveBeenLastCalledWith('/maxina?redirectTo=%2Fcomm%2Fmedia-hub%3Fshort%3D1&tab=signup');
    expect(hasSeenIntro('maxina')).toBe(true);
    expect(introTarget('alkalma', { tenantSlug: 'alkalma' })).toBe('/alkalma');
  });

  it('the language pill opens the language picker', () => {
    resetMocks({ tenantSlug: 'maxina' });
    const { wrapper } = publicWrapper({ language: 'de-DE' });
    render(<IntroScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('intro-language'));
    expect(screen.getByTestId('language-options')).toBeTruthy();
  });
});
