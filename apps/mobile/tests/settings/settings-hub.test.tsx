/**
 * VTID-05431 (Native Wave 2, settings lane) — the `/settings` hub
 * (`src/pages/MobileSettings.tsx` twin): every `?mode=` section renders from
 * its param, the fallbacks match the web, and a toggle / action per section
 * BUILDS the right request against the mocked gateway / Supabase double and
 * fires nothing real (requirements R5.2). React 19: `ReactElement` only.
 */
import '../helpers/no-network';
import { mockParams, router } from './mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { createGateway, createSettingsSupabase, renderSettings } from './helpers';
import { SettingsScreen } from '../../src/screens/settings/SettingsScreen';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import SettingsRoute from '../../app/(app)/settings/index';
import { overlayBus } from '../../src/navigation/overlay-bus';

const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);

afterEach(() => {
  mockParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
});

const CATEGORIES = {
  data: {
    chat: [{ id: 'cat-chat', slug: 'dm', display_name: 'Direktnachrichten', description: 'Neue Nachrichten', icon: null, enabled: true }],
    calendar: [{ id: 'cat-cal', slug: 'reminders', display_name: 'Erinnerungen', description: null, icon: null, enabled: false }],
    community: [{ id: 'cat-sec', slug: 'security', display_name: 'Sicherheit', description: null, icon: null, enabled: true, locked: true }],
  },
  role: 'admin',
  role_notifications: [{ type: 'ops.alert', label: { en: 'Ops alert', de: 'Betriebsalarm' }, description: { en: 'x', de: 'x' } }],
};

const COMPANION = { ok: true, preferences: { enabled: true, topic_health: true, topic_community: false, topic_business: false } };

function baseGateway(extra: Record<string, unknown> = {}) {
  return createGateway({
    '/notifications/category-preferences': CATEGORIES,
    'PUT /notifications/category-preferences/cat-chat': { ok: true },
    'GET /companion/preferences': COMPANION,
    'PATCH /companion/preferences': { ok: true, preferences: { ...COMPANION.preferences, enabled: false } },
    'GET /me/phone': { ok: true, enabled: true, verified: true, phone_masked: '+49 ••• 12', discoverable: true, resend_after_seconds: 30 },
    'DELETE /me/phone': { ok: true },
    'POST /me/phone/verification': { ok: true, phone_masked: '+49 ••• 34', resend_after_seconds: 30 },
    'GET /billing/me': {
      ok: true,
      plan: { plan_key: 'premium', status: 'active', current_period_end: '2026-12-01T00:00:00Z', cancel_at_period_end: false, trial_end: null, price_key: 'p', source: null },
      stripe: { has_customer: true, has_paid_subscription: true },
    },
    'POST /billing/portal': { ok: true, url: 'https://billing.stripe.com/session/test' },
    'GET /creators/status': { stripe_account_id: null, charges_enabled: false, payouts_enabled: false, onboarded_at: null },
    'POST /creators/onboard': { onboarding_url: 'https://connect.stripe.com/setup/test' },
    ...extra,
  });
}

function supabase(extra: Parameters<typeof createSettingsSupabase>[0] = {}) {
  return createSettingsSupabase({
    tables: {
      user_notification_preferences: [{ user_id: 'u-1', push_enabled: true, dnd_enabled: false }],
      global_community_profiles: [{ user_id: 'u-1', community_intro_opt_in: true }],
      profiles: [{ user_id: 'u-1', discoverable_by_phone: true, phone: '+4917012345' }],
      user_preferences: [{ user_id: 'u-1', stt_language: 'de-DE', tts_voice: null, ai_data_consent_given: false }],
      ...(extra.tables ?? {}),
    },
    ...extra,
  });
}

function show(mode?: string, opts: { gateway?: ReturnType<typeof createGateway>; sb?: ReturnType<typeof supabase> } = {}) {
  mockParams.current = mode ? { mode } : {};
  const sb = opts.sb ?? supabase();
  const gateway = opts.gateway ?? baseGateway();
  return { sb, ...renderSettings(<SettingsScreen />, { supabase: sb, gateway }) };
}

describe('?mode= selects the section (the web switch)', () => {
  it.each([
    ['notifications', 'notifications'],
    ['privacy', 'privacy.visibility'],
    ['privacy.visibility', 'privacy.visibility'],
    ['privacy.data', 'privacy.data'],
    ['privacy.security', 'privacy.security'],
    ['preferences', 'preferences.appearance'],
    ['preferences.appearance', 'preferences.appearance'],
    ['preferences.language', 'preferences.language'],
    ['billing', 'billing'],
    ['billing.plan', 'billing.plan'],
    ['billing.payment', 'billing.payment'],
    ['billing.invoices', 'billing.invoices'],
    ['billing.creator', 'billing.creator'],
  ])('mode=%s renders %s', async (mode, section) => {
    show(mode);
    expect(await screen.findByTestId(`settings-section-${section}`)).toBeTruthy();
    expect(router.setParams).toHaveBeenCalledWith({ mode: undefined });
  });

  it('SETTINGS.OVERVIEW (no mode) and an unknown mode fall back to notifications', async () => {
    show();
    expect(await screen.findByTestId('settings-section-notifications')).toBeTruthy();
    expect(router.setParams).not.toHaveBeenCalled();
  });

  it('an unknown mode (e.g. preferences.accessibility) falls back to notifications', async () => {
    show('preferences.accessibility');
    expect(await screen.findByTestId('settings-section-notifications')).toBeTruthy();
  });

  it('the route file renders the hub', async () => {
    mockParams.current = {};
    renderSettings(<SettingsRoute />, { supabase: supabase(), gateway: baseGateway() });
    expect(await screen.findByTestId('screen-settings')).toBeTruthy();
  });

  it('the mode pill switches sections', async () => {
    show();
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-privacy'));
    fireEvent.press(screen.getByTestId('mode-privacy.security'));
    expect(await screen.findByTestId('settings-section-privacy.security')).toBeTruthy();
  });

  it('Delete account opens /delete-account', async () => {
    show();
    fireEvent.press(await screen.findByTestId('settings-delete-account'));
    expect(router.navigate).toHaveBeenCalledWith('/delete-account');
  });
});

describe('notifications', () => {
  it('renders push, the category groups (locked always on), role notifications, quiet hours and Vitana messages', async () => {
    show('notifications');
    expect(await screen.findByText('Direktnachrichten')).toBeTruthy();
    expect(screen.getByTestId('settings-category-group-chat')).toBeTruthy();
    expect(screen.getByTestId('settings-category-cat-sec').props.accessibilityState).toMatchObject({ checked: true, disabled: true });
    expect(screen.getByText('Betriebsalarm')).toBeTruthy();
    expect(await screen.findByTestId('vitana-messages-settings')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('vitana-messages-enabled').props.accessibilityState).toMatchObject({ checked: true }));
  });

  it('the push switch upserts user_notification_preferences (onConflict user_id)', async () => {
    const { sb } = show('notifications');
    await waitFor(() => expect(screen.getByTestId('settings-push-switch').props.accessibilityState).toMatchObject({ disabled: false }));
    fireEvent.press(screen.getByTestId('settings-push-switch'));
    await waitFor(() => expect(sb.writes.length).toBeGreaterThan(0));
    const w = sb.writes[0];
    expect(w).toMatchObject({ kind: 'upsert', table: 'user_notification_preferences', options: { onConflict: 'user_id' } });
    expect(w.values).toMatchObject({ user_id: 'u-1', push_enabled: false, dnd_enabled: false });
    expect(typeof w.values.updated_at).toBe('string');
  });

  it('quiet hours upserts dnd_enabled and saves the device time zone on profiles', async () => {
    const { sb } = show('notifications');
    await waitFor(() => expect(screen.getByTestId('settings-quiet-hours-switch').props.accessibilityState).toMatchObject({ disabled: false }));
    fireEvent.press(screen.getByTestId('settings-quiet-hours-switch'));
    await waitFor(() => expect(sb.writes.some((w) => w.table === 'profiles')).toBe(true));
    expect(sb.writes[0].values).toMatchObject({ dnd_enabled: true });
    expect(sb.writes.find((w) => w.table === 'profiles')).toMatchObject({ kind: 'update', filters: [['user_id', 'u-1']] });
  });

  it('a category switch PUTs /notifications/category-preferences/:id { enabled }', async () => {
    const { gateway } = show('notifications');
    fireEvent.press(await screen.findByTestId('settings-category-cat-chat'));
    await waitFor(() => expect(gateway.writes()).toEqual([{ method: 'PUT', path: '/notifications/category-preferences/cat-chat', body: { enabled: false } }]));
    expect(gateway.calls.some((c) => c.path === '/notifications/category-preferences?locale=de')).toBe(true);
  });

  it('the Vitana messages switch PATCHes /companion/preferences and toasts', async () => {
    const { gateway } = show('notifications');
    await waitFor(() => expect(screen.getByTestId('vitana-messages-enabled').props.accessibilityState).toMatchObject({ disabled: false }));
    fireEvent.press(screen.getByTestId('vitana-messages-enabled'));
    await waitFor(() => expect(gateway.writes()).toEqual([{ method: 'PATCH', path: '/companion/preferences', body: { enabled: false } }]));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.settings.settingsUpdated2'));
  });

  it('Vitana messages shows its load error and keeps the switches disabled', async () => {
    show('notifications', { gateway: baseGateway({ 'GET /companion/preferences': { __status: 500, __body: { ok: false } } }) });
    expect(await screen.findByTestId('vitana-messages-error')).toBeTruthy();
    expect(screen.getByTestId('vitana-messages-enabled').props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('privacy', () => {
  it('visibility: seven local switches, community intro, phone card and discoverability', async () => {
    show('privacy.visibility');
    expect(await screen.findByTestId('settings-visibility-publicProfile')).toBeTruthy();
    expect(screen.getByTestId('settings-visibility-locationData').props.accessibilityState).toMatchObject({ checked: false });
    expect(await screen.findByTestId('community-intro')).toBeTruthy();
    expect(await screen.findByTestId('phone-number-verified')).toBeTruthy();
    expect(await screen.findByTestId('phone-discoverability')).toBeTruthy();
  });

  it('community intro updates global_community_profiles.community_intro_opt_in', async () => {
    const { sb } = show('privacy.visibility');
    fireEvent.press(await screen.findByTestId('community-intro-switch'));
    await waitFor(() => expect(sb.writes).toEqual([{ kind: 'update', table: 'global_community_profiles', values: { community_intro_opt_in: false }, filters: [['user_id', 'u-1']], options: undefined }]));
  });

  it('phone discoverability updates profiles.discoverable_by_phone', async () => {
    const { sb } = show('privacy.visibility');
    fireEvent.press(await screen.findByTestId('phone-discoverability-switch'));
    await waitFor(() => expect(sb.writes.find((w) => w.table === 'profiles')).toMatchObject({ kind: 'update', values: { discoverable_by_phone: false }, filters: [['user_id', 'u-1']] }));
  });

  it('removing the phone number asks first, then DELETEs /me/phone', async () => {
    const { gateway } = show('privacy.visibility');
    fireEvent.press(await screen.findByTestId('phone-number-remove'));
    expect(gateway.writes()).toEqual([]);
    fireEvent.press(await screen.findByTestId('phone-remove-confirm-button'));
    await waitFor(() => expect(gateway.writes()).toEqual([{ method: 'DELETE', path: '/me/phone', body: undefined }]));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('mailhub.findFriends.verifyPhone.removed'));
  });

  it('changing the number POSTs /me/phone/verification { phone, region }', async () => {
    const { gateway } = show('privacy.visibility');
    fireEvent.press(await screen.findByTestId('phone-number-change'));
    await waitFor(() => expect(screen.getByTestId('verify-phone-number').props.value).toBe('+4917012345'));
    fireEvent.press(screen.getByTestId('verify-phone-send'));
    await waitFor(() => expect(gateway.writes()).toEqual([{ method: 'POST', path: '/me/phone/verification', body: { phone: '+4917012345', region: 'DE' } }]));
    expect(await screen.findByTestId('verify-phone-code')).toBeTruthy();
  });

  it('the phone card hides itself when the gateway switch is off', async () => {
    show('privacy.visibility', { gateway: baseGateway({ 'GET /me/phone': { ok: true, enabled: false } }) });
    expect(await screen.findByTestId('community-intro')).toBeTruthy();
    expect(screen.queryByTestId('phone-number-card')).toBeNull();
  });

  it('data: the health data-sharing switches are off and disabled; granting AI consent updates user_preferences', async () => {
    const { sb } = show('privacy.data');
    expect((await screen.findByTestId('settings-data-healthDataAnalytics')).props.accessibilityState).toMatchObject({ checked: false, disabled: true });
    expect(screen.getByTestId('settings-request-export').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('settings-ai-consent-switch'));
    expect(sb.writes).toEqual([]);
    fireEvent.press(await screen.findByTestId('ai-consent-agree'));
    await waitFor(() => expect(sb.writes.find((w) => w.table === 'user_preferences')).toMatchObject({ kind: 'update', values: { ai_data_consent_given: true }, filters: [['user_id', 'u-1']] }));
    expect(screen.getByTestId('settings-ai-consent-switch').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('security: the static security card', async () => {
    show('privacy.security');
    expect(await screen.findByTestId('settings-privacy-security')).toBeTruthy();
    expect(screen.getByTestId('settings-login-alerts').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText('iPhone 15 Pro')).toBeTruthy();
  });
});

describe('preferences', () => {
  it('appearance: the theme select switches the native theme mode (device-local, no write)', async () => {
    const { sb, gateway } = show('preferences.appearance');
    fireEvent.press(await screen.findByTestId('settings-theme-trigger'));
    fireEvent.press(screen.getByTestId('settings-theme-dark'));
    await waitFor(() => expect(screen.getByTestId('settings-theme-trigger')).toBeTruthy());
    expect(screen.getAllByText('Dunkel').length).toBeGreaterThan(0);
    expect(gateway.writes()).toEqual([]);
    expect(sb.writes).toEqual([]);
  });

  it('language: choosing a language updates user_preferences.stt_language', async () => {
    const { sb } = show('preferences.language');
    fireEvent.press(await screen.findByTestId('settings-language-trigger'));
    fireEvent.press(screen.getByTestId('settings-language-en-US'));
    await waitFor(() => expect(sb.writes.find((w) => w.table === 'user_preferences')).toMatchObject({ kind: 'update', values: { stt_language: 'en-US' }, filters: [['user_id', 'u-1']] }));
    expect(screen.getByTestId('settings-regional')).toBeTruthy();
  });
});

describe('billing', () => {
  it('overview: the subscription card and the four child rows; a row opens its section', async () => {
    show('billing');
    expect(await screen.findByTestId('subscription-active')).toBeTruthy();
    fireEvent.press(screen.getByTestId('billing-nav-invoices'));
    expect(await screen.findByTestId('settings-section-billing.invoices')).toBeTruthy();
  });

  it('plan: Manage POSTs /billing/portal and opens the returned URL in the browser', async () => {
    const { gateway } = show('billing.plan');
    fireEvent.press(await screen.findByTestId('billing-plan-portal'));
    await waitFor(() => expect(gateway.writes()).toEqual([{ method: 'POST', path: '/billing/portal', body: undefined }]));
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://billing.stripe.com/session/test'));
  });

  it('plan: Change plan opens the phone storefront /profile/subscriptions', async () => {
    show('billing.plan');
    fireEvent.press(await screen.findByTestId('billing-change-plan'));
    expect(router.navigate).toHaveBeenCalledWith('/profile/subscriptions');
  });

  it('payment without a Stripe customer shows View plans, no portal', async () => {
    show('billing.payment', {
      gateway: baseGateway({
        'GET /billing/me': { ok: true, plan: { plan_key: 'free', status: 'free', current_period_end: null, cancel_at_period_end: false, trial_end: null, price_key: null, source: null }, stripe: { has_customer: false, has_paid_subscription: false } },
      }),
    });
    expect(await screen.findByTestId('billing-payment-plans')).toBeTruthy();
    expect(screen.queryByTestId('billing-payment-portal')).toBeNull();
  });

  it('a billing load error shows the error card', async () => {
    show('billing', { gateway: baseGateway({ 'GET /billing/me': { __status: 500, __body: { error: 'x' } } }) });
    expect(await screen.findByTestId('billing-error', {}, { timeout: 4000 })).toBeTruthy();
  });

  it('creator: Enable payments POSTs /creators/onboard and opens the Stripe Connect link only', async () => {
    const { gateway } = show('billing.creator');
    fireEvent.press(await screen.findByTestId('creator-onboard'));
    await waitFor(() => expect(gateway.writes().map((c) => [c.method, c.path])).toEqual([['POST', '/creators/onboard']]));
    const body = gateway.writes()[0].body as { return_url: string; refresh_url: string };
    expect(body.return_url).toMatch(/creator\/onboarded$/);
    expect(body.refresh_url).toMatch(/creator\/onboard$/);
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://connect.stripe.com/setup/test'));
  });

  it('creator: a non-Stripe onboarding URL is never opened', async () => {
    show('billing.creator', { gateway: baseGateway({ 'POST /creators/onboard': { onboarding_url: 'https://evil.example/phish' } }) });
    fireEvent.press(await screen.findByTestId('creator-onboard'));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.hooks.onboardingFailed'));
    expect(openURL).not.toHaveBeenCalled();
  });
});

it('a later ?mode= change is honoured', async () => {
  const { rerender } = show('notifications');
  expect(await screen.findByTestId('settings-section-notifications')).toBeTruthy();
  mockParams.current = { mode: 'billing.invoices' };
  await act(async () => {
    rerender(<SettingsScreen />);
  });
  expect(await screen.findByTestId('settings-section-billing.invoices')).toBeTruthy();
});

it('the ORB vitana:settings-navigate overlay event jumps to a valid section and toasts; an invalid one is ignored', async () => {
  show('notifications');
  expect(await screen.findByTestId('settings-section-notifications')).toBeTruthy();
  expect(overlayBus.listenerCount('vitana:settings-navigate')).toBe(1);
  await act(async () => {
    overlayBus.emit('vitana:settings-navigate', { open: 'settings_section', section: 'nope' });
  });
  expect(screen.getByTestId('settings-section-notifications')).toBeTruthy();
  await act(async () => {
    overlayBus.emit('vitana:settings-navigate', { open: 'settings_section', section: 'privacy.security' });
  });
  expect(await screen.findByTestId('settings-section-privacy.security')).toBeTruthy();
  expect(__toastsForTests().find((t) => t.titleKey === 'settings.vitanaOpenedSection')?.params).toEqual({ section: 'Datenschutz' });
  expect(overlayBus.listenerCount('vitana:settings-toggle')).toBe(0);
});
