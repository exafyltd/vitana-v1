/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — static
 * render of /privacy, /terms and /maxina_support: the web sections and catalog
 * keys in order, the `?lang=de|en` scoped copy and the DE/EN toggle, back,
 * the in-app and mailto links, the FAQ accordion. Fixtures only, no network.
 */
import '../helpers/no-network';
import { resetMocks, router, publicWrapper } from './helpers';
import { Linking } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { translate } from '../../src/i18n';
import { PrivacyScreen, TermsScreen } from '../../src/screens/public/LegalScreens';
import { MaxinaSupportScreen, FAQ_ITEMS, HELP_CATEGORIES, USEFUL_LINKS } from '../../src/screens/public/MaxinaSupportScreen';
import { PRIVACY, TERMS, blockKeys } from '../../src/screens/public/legal-content';

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => resetMocks());

describe('/privacy', () => {
  it('renders the header, title, effective date, all 13 sections and the footer in the member language', () => {
    const { wrapper } = publicWrapper({ language: 'de-DE' });
    render(<PrivacyScreen />, { wrapper });
    expect(screen.getByTestId('privacy-screen')).toBeTruthy();
    expect(screen.getByText(translate('de', 'screens.legal.privacyPolicy'))).toBeTruthy();
    expect(screen.getByText(translate('de', 'screens.legal.privacyPolicyForMaxinaMobileApplication'))).toBeTruthy();
    for (const k of ['text1Introduction', 'text5HowWeShareYourData', 'text9YourRightsUnderGdprIf', 'text13ContactUs']) {
      expect(screen.getByText(translate('de', `screens.legal.${k}`))).toBeTruthy();
    }
    expect(PRIVACY.filter((b) => b.kind === 'h2')).toHaveLength(13);
    expect(screen.getByTestId('legal-footer')).toBeTruthy();
  });

  it('?lang=en pins the copy to English while the member language is German', () => {
    resetMocks({ lang: 'en' });
    const { wrapper } = publicWrapper({ language: 'de-DE' });
    render(<PrivacyScreen />, { wrapper });
    expect(screen.getByText(translate('en', 'screens.legal.privacyPolicyForMaxinaMobileApplication'))).toBeTruthy();
    expect(screen.queryByText(translate('de', 'screens.legal.privacyPolicyForMaxinaMobileApplication'))).toBeNull();
    expect(screen.getByTestId('locale-toggle-en').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('the DE / EN toggle writes ?lang= like the web LegalLocaleToggle', () => {
    const { wrapper } = publicWrapper({ language: 'de-DE' });
    render(<PrivacyScreen />, { wrapper });
    expect(screen.getByTestId('locale-toggle-de').props.accessibilityState).toMatchObject({ selected: true });
    fireEvent.press(screen.getByTestId('locale-toggle-en'));
    expect(router.setParams).toHaveBeenCalledWith({ lang: 'en' });
  });

  it('back goes back, or to the landing without history', () => {
    const { wrapper } = publicWrapper();
    render(<PrivacyScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('public-back'));
    expect(router.back).toHaveBeenCalled();
    router.canGoBack.mockImplementation(() => false);
    fireEvent.press(screen.getByTestId('public-back'));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('the support e-mail opens mailto:', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { wrapper } = publicWrapper({ language: 'en-US' });
    render(<PrivacyScreen />, { wrapper });
    fireEvent.press(screen.getByText(translate('en', 'screens.legal.supportExafyIo')));
    expect(open).toHaveBeenCalledWith('mailto:support@exafy.io');
    open.mockRestore();
  });
});

describe('/terms', () => {
  it('renders the title, the sections (no §3 subscriptions) and the in-text Privacy link', () => {
    const { wrapper } = publicWrapper({ language: 'en-US' });
    render(<TermsScreen />, { wrapper });
    expect(screen.getByText(translate('en', 'screens.legal.termsUse'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'screens.legal.maxinaAppAmpWebsiteTermsUse'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'screens.legal.text14Contact'))).toBeTruthy();
    expect(TERMS.filter((b) => b.kind === 'h2')).toHaveLength(13);
    const links = screen.getAllByText(translate('en', 'screens.legal.privacyPolicy')).filter((n) => n.props.accessibilityRole === 'link');
    expect(links).toHaveLength(2);
    fireEvent.press(links[0]);
    expect(router.navigate).toHaveBeenCalledWith('/privacy');
  });

  it('every legal key resolves in German and English (the two scoped languages)', () => {
    for (const k of [...blockKeys(PRIVACY), ...blockKeys(TERMS)]) {
      expect(translate('de', k)).not.toBe(k);
      expect(translate('en', k)).not.toBe(k);
    }
  });
});

describe('/maxina_support', () => {
  it('renders hero, five help categories, the FAQ, contact, useful links and the footer year', () => {
    const { wrapper } = publicWrapper({ language: 'en-US' });
    render(<MaxinaSupportScreen year={2026} />, { wrapper });
    expect(screen.getByText(translate('en', 'support.maxina.title'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'support.maxina.subtitle'))).toBeTruthy();
    expect(HELP_CATEGORIES.map((c) => c.id)).toEqual(['gettingStarted', 'account', 'events', 'payments', 'technical']);
    for (const c of HELP_CATEGORIES) expect(screen.getByTestId(`support-category-${c.id}`)).toBeTruthy();
    for (const f of FAQ_ITEMS) expect(screen.getByText(translate('en', `support.maxina.faq.${f}.question`))).toBeTruthy();
    expect(screen.getByText(translate('en', 'support.maxina.contact.responseTime'))).toBeTruthy();
    expect(screen.getByText(translate('en', 'screens.legal.value0MaxinaByExafyValue1', { value0: 2026, value1: translate('en', 'support.maxina.footer') }))).toBeTruthy();
  });

  it('the FAQ is a single collapsible accordion', () => {
    const { wrapper } = publicWrapper({ language: 'en-US' });
    render(<MaxinaSupportScreen />, { wrapper });
    expect(screen.queryByTestId('support-faq-createAccount-answer')).toBeNull();
    fireEvent.press(screen.getByTestId('support-faq-createAccount'));
    expect(screen.getByText(translate('en', 'support.maxina.faq.createAccount.answer'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('support-faq-dataSecure'));
    expect(screen.queryByTestId('support-faq-createAccount-answer')).toBeNull();
    expect(screen.getByTestId('support-faq-dataSecure-answer')).toBeTruthy();
    fireEvent.press(screen.getByTestId('support-faq-dataSecure'));
    expect(screen.queryByTestId('support-faq-dataSecure-answer')).toBeNull();
  });

  it('useful links go to /privacy, /delete-account, /maxina; the e-mail opens mailto:', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { wrapper } = publicWrapper({ language: 'en-US' });
    render(<MaxinaSupportScreen />, { wrapper });
    for (const l of USEFUL_LINKS) fireEvent.press(screen.getByTestId(`support-link-${l.id}`));
    expect(router.navigate.mock.calls.map((c) => c[0])).toEqual(['/privacy', '/delete-account', '/maxina']);
    fireEvent.press(screen.getByTestId('support-email'));
    expect(open).toHaveBeenCalledWith('mailto:support@exafy.io');
    open.mockRestore();
  });
});
