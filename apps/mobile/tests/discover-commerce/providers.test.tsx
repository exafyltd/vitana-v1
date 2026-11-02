/**
 * VTID-05511 — /discover/doctors-coaches (DISCOVER.DOCTORS_COACHES) and
 * /discover/provider/:id (DISCOVER.PROVIDER_PROFILE): the directory (sub-nav,
 * rail, the three tabs, filters, cards, bookmarks, My Providers with the
 * appointment reads), open a profile from the list and by deep link, back,
 * not found, share; and the booking dialog — every payment path asserted on
 * the request it builds against the fake client (USD wallet RPC, Credits
 * exchange RPC, the provider message, the appointment insert, the Stripe
 * checkout Function + system browser). Nothing is charged.
 */
import '../helpers/no-network';
import { browser, pathname, router, searchParams, share } from './mocks';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { DoctorsCoachesScreen } from '../../src/screens/marketplace-orders/DoctorsCoachesScreen';
import { ProviderProfileScreen } from '../../src/screens/marketplace-orders/ProviderProfileScreen';
import { requiredAmount, timeSlots } from '../../src/screens/marketplace-orders/BookingPaymentFlow';
import { USER, appointmentRow, commerceWrapper, setOS } from './helpers';

afterEach(() => {
  searchParams.current = {};
  pathname.current = '/discover/doctors-coaches';
  router.navigate.mockClear();
  router.back.mockClear();
  router.canGoBack.mockReturnValue(true);
  browser.openBrowserAsync.mockClear();
  share.mockClear();
  __clearToastsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const wallet = (usd: number, credits: number) => [
  { user_id: USER, currency_type: 'USD', balance: usd },
  { user_id: USER, currency_type: 'CREDITS', balance: credits },
];

describe('Doctors & Coaches directory', () => {
  it('sub-nav (Doctors/Coaches active), the rail (Search · Calendar · + Action · Life Compass · Gift Voucher · Refresh) and the six provider cards', async () => {
    const restore = setOS('android');
    try {
      const { wrapper } = commerceWrapper({}, { tables: { bookmarked_items: [], provider_appointments: [] } });
      render(<DoctorsCoachesScreen />, { wrapper });
      expect(screen.getByTestId('mo-subnav-doctors-coaches').props.accessibilityState).toMatchObject({ selected: true });
      fireEvent.press(screen.getByTestId('mo-subnav-orders'));
      expect(router.navigate).toHaveBeenCalledWith('/discover/orders');
      const rail = within(screen.getByTestId('mo-utility-rail'))
        .getAllByRole('button')
        .map((b) => b.props.testID);
      expect(rail).toEqual(['doctors-search-open', 'mo-calendar-button', 'doctors-action', 'mo-life-compass', 'mo-gift-voucher', 'mo-refresh']);
      expect(within(screen.getByTestId('doctors-list')).getAllByTestId(/^provider-card-/)).toHaveLength(6);
      const c1 = within(screen.getByTestId('provider-card-1'));
      expect(c1.getByText('Dr. Sarah Chen')).toBeTruthy();
      expect(c1.getByText('Longevity Medicine Specialist')).toBeTruthy();
      expect(c1.getByText('Top Rated')).toBeTruthy();
      expect(c1.getByText('15 years')).toBeTruthy();
      expect(c1.getByText('$150 - $400')).toBeTruthy();
      expect(c1.getByText('Available Today 2PM')).toBeTruthy();
      expect(screen.getByTestId('mo-verified-1')).toBeTruthy();
      expect(screen.queryByTestId('mo-verified-2')).toBeNull();
      expect(screen.getAllByTestId(/^doctors-filter-/)).toHaveLength(5);
    } finally {
      restore();
    }
  });

  it('View Profile opens /discover/provider/:id; + Action opens Quick Book Actions (each toasts and closes)', async () => {
    const { wrapper } = commerceWrapper({}, { tables: { bookmarked_items: [] } });
    render(<DoctorsCoachesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('provider-view-2'));
    expect(router.navigate).toHaveBeenCalledWith('/discover/provider/2');
    fireEvent.press(screen.getByTestId('doctors-action'));
    expect(screen.getByText('Quick booking actions')).toBeTruthy();
    expect(screen.getAllByTestId(/^mo-book-action-/)).toHaveLength(8);
    fireEvent.press(screen.getByTestId('mo-book-action-findNearMe'));
    expect(__toastsForTests().some((x) => x.titleKey === 'toasts.discover.actionSelected')).toBe(true);
  });

  it('bookmark toggles: insert with the provider metadata, then delete by user / type / id', async () => {
    const { wrapper, log } = commerceWrapper({}, { tables: { bookmarked_items: [] } });
    render(<DoctorsCoachesScreen />, { wrapper });
    await waitFor(() => expect(log.some((o) => o.op === 'select' && o.table === 'bookmarked_items')).toBe(true));
    await act(async () => fireEvent.press(screen.getByTestId('mo-bookmark-1')));
    expect(log.find((o) => o.op === 'insert' && o.table === 'bookmarked_items')?.args.values).toEqual({
      user_id: USER,
      item_type: 'provider',
      item_id: '1',
      item_name: 'Dr. Sarah Chen',
      item_image_url: '/lovable-uploads/sarah-miller-avatar.jpg',
      item_metadata: { specialty: 'Longevity Medicine', rating: 4.9, location: 'New York, NY', priceRange: '$150 - $400' },
    });
    expect(__toastsForTests().some((x) => x.titleKey === 'toasts.hooks.bookmarked')).toBe(true);
  });

  it('Best Matches: six cards with 94 % … 84 % and Book Now', async () => {
    const { wrapper } = commerceWrapper({}, { tables: { bookmarked_items: [] } });
    render(<DoctorsCoachesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('doctors-tab-matches'));
    expect(screen.getByText('AI-Matched Providers', { exact: false })).toBeTruthy();
    expect(within(screen.getByTestId('match-card-1')).getByText('94%')).toBeTruthy();
    expect(within(screen.getByTestId('match-card-6')).getByText('84%')).toBeTruthy();
  });

  it('My Providers: counters from the appointment reads + bookmarks, the upcoming card with its countdown, empty history', async () => {
    const { wrapper, log } = commerceWrapper({}, {
      tables: {
        bookmarked_items: [{ id: 'b1', user_id: USER, item_type: 'provider', item_id: '3', item_name: 'Luna Wellness Spa', created_at: '2026-10-01' }],
        provider_appointments: [appointmentRow()],
      },
    });
    render(<DoctorsCoachesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('doctors-tab-mine'));
    await waitFor(() => expect(within(screen.getByTestId('stat-bookmarked')).getByText('1')).toBeTruthy());
    const reads = log.filter((o) => o.op === 'select' && o.table === 'provider_appointments').map((o) => o.args.filters.map((f: unknown[]) => f.slice(0, 2)));
    expect(reads).toEqual(expect.arrayContaining([[['eq', 'status'], ['gte', 'start_time']], [['eq', 'status'], ['lt', 'start_time']]]));
    expect(screen.getByTestId('saved-provider-3')).toBeTruthy();
    fireEvent.press(screen.getByTestId('mine-tab-upcoming'));
    await waitFor(() => expect(screen.getByTestId('appointment-a-1')).toBeTruthy());
    expect(within(screen.getByTestId('appointment-badge-a-1')).getByText(/days away/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('mine-tab-history'));
    expect(screen.getByTestId('mine-empty-history')).toBeTruthy();
  });

  it('My Providers empty: no saved providers yet', async () => {
    const { wrapper } = commerceWrapper({}, { tables: { bookmarked_items: [], provider_appointments: [] } });
    render(<DoctorsCoachesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('doctors-tab-mine'));
    expect(screen.getByTestId('mine-empty-bookmarked')).toBeTruthy();
  });
});

describe('the booking dialog (requests built, nothing charged)', () => {
  const pickDateTime = async () => {
    fireEvent.press(screen.getByTestId('booking-date'));
    fireEvent.press(screen.getByTestId('booking-calendar-next'));
    fireEvent.press(screen.getByTestId('booking-day-15'));
    fireEvent.press(screen.getByTestId('booking-time'));
    fireEvent.press(screen.getByTestId('booking-time-10:30'));
  };

  it('USD wallet: update_user_balance (subtract $150), the provider message, then the appointment insert', async () => {
    const { wrapper, log } = commerceWrapper({}, { tables: { bookmarked_items: [], user_wallets: wallet(500, 0), provider_appointments: [] } });
    render(<DoctorsCoachesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('provider-book-1'));
    expect(screen.getByTestId('booking-title').props.children).toBe('Longevity Medicine Specialist Session');
    await waitFor(() => expect(log.some((o) => o.op === 'select' && o.table === 'user_wallets')).toBe(true));
    fireEvent.press(screen.getByTestId('booking-method-usd'));
    expect(screen.getByTestId('booking-total').props.children).toBe('$150.00');
    await pickDateTime();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    try {
      await act(async () => {
        fireEvent.press(screen.getByTestId('booking-confirm'));
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
    } finally {
      jest.useRealTimers();
    }
    await waitFor(() => expect(log.some((o) => o.op === 'insert' && o.table === 'provider_appointments')).toBe(true));
    expect(log.find((o) => o.op === 'rpc' && o.table === 'update_user_balance')?.args).toEqual({ user_id_param: USER, currency_param: 'USD', amount_param: 150, operation: 'subtract', p_transaction_type: null, p_description: null });
    const msg = log.find((o) => o.op === 'insert' && o.table === 'messages')?.args.values[0];
    expect(msg).toMatchObject({ sender_id: USER, recipient_id: 'provider_dr._sarah chen', message_type: 'service_booking', content_data: { bookingId: '1', amount: 150, amountUSD: 150, currency: 'USD', time: '10:30', paymentMethod: 'wallet' } });
    expect(msg.body).toMatch(/^New booking confirmed: Longevity Medicine Specialist Session on .+ at 10:30$/);
    const appt = log.find((o) => o.op === 'insert' && o.table === 'provider_appointments')?.args.values[0];
    expect(appt).toMatchObject({ provider_id: '1', provider_name: 'Dr. Sarah Chen', provider_specialty: 'Longevity Medicine', appointment_type: 'consultation', status: 'scheduled', duration_minutes: 30, location: 'New York, NY' });
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey === 'toasts.payment.bookingConfirmed')).toBe(true));
  });

  it('Credits: process_wallet_exchange CREDITS→USD for 15,000 Credits at 0.01', async () => {
    const { wrapper, log } = commerceWrapper({}, { tables: { bookmarked_items: [], user_wallets: wallet(0, 20000), provider_appointments: [] } });
    render(<DoctorsCoachesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('provider-book-1'));
    await waitFor(() => expect(screen.getByTestId('booking-confirm').props.accessibilityState).toMatchObject({ disabled: false }));
    expect(screen.getByTestId('booking-total').props.children).toBe('15000 VTNA Credits');
    await pickDateTime();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    try {
      await act(async () => {
        fireEvent.press(screen.getByTestId('booking-confirm'));
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
    } finally {
      jest.useRealTimers();
    }
    await waitFor(() => expect(log.some((o) => o.op === 'rpc' && o.table === 'process_wallet_exchange')).toBe(true));
    expect(log.find((o) => o.op === 'rpc' && o.table === 'process_wallet_exchange')?.args).toEqual({ p_user_id: USER, p_from_currency: 'CREDITS', p_to_currency: 'USD', p_amount: 15000, p_exchange_rate: 0.01 });
  });

  it('insufficient wallet balance: the warning and a disabled confirm; no date/time → "missing information"', async () => {
    const { wrapper } = commerceWrapper({}, { tables: { bookmarked_items: [], user_wallets: wallet(10, 0) } });
    render(<DoctorsCoachesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('provider-book-1'));
    await waitFor(() => expect(screen.getByTestId('booking-insufficient')).toBeTruthy());
    expect(screen.getByTestId('booking-confirm').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('booking-method-cash'));
    expect(screen.queryByTestId('booking-insufficient')).toBeNull();
    await act(async () => fireEvent.press(screen.getByTestId('booking-confirm')));
    expect(__toastsForTests().some((x) => x.titleKey === 'toasts.payment.missingInformation')).toBe(true);
  });

  it('card: stripe-create-booking-checkout with the web body, then the Stripe page in the system browser', async () => {
    const { wrapper, log } = commerceWrapper({}, { tables: { bookmarked_items: [], user_wallets: wallet(0, 0) }, functions: { 'stripe-create-booking-checkout': { url: 'https://checkout.example.org/b/1' } } });
    render(<DoctorsCoachesScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('provider-book-2'));
    fireEvent.press(screen.getByTestId('booking-method-cash'));
    await pickDateTime();
    await act(async () => fireEvent.press(screen.getByTestId('booking-confirm')));
    const body = log.find((o) => o.op === 'function' && o.table === 'stripe-create-booking-checkout')?.args;
    expect(body).toMatchObject({
      providerId: '2',
      providerName: 'Marcus Rodriguez',
      providerImage: '/lovable-uploads/mike-thompson-avatar.jpg',
      providerSpecialty: 'Book a session with Marcus Rodriguez',
      bookingTitle: 'Functional Fitness Coach Session',
      price: 75,
      duration: '30',
      location: 'Los Angeles, CA',
      appointmentType: 'service',
    });
    expect(new Date(body.dateTime).getDate()).toBe(15);
    expect(browser.openBrowserAsync).toHaveBeenCalledWith('https://checkout.example.org/b/1');
    expect(log.some((o) => o.op === 'rpc' && ['update_user_balance', 'process_wallet_exchange'].includes(String(o.table)))).toBe(false);
  });

  it('pure helpers: the 09:00–17:00 slots and the Credits price', () => {
    expect(timeSlots()).toHaveLength(17);
    expect(timeSlots()[0]).toBe('09:00');
    expect(timeSlots().at(-1)).toBe('17:00');
    expect(requiredAmount(150, 'CREDITS')).toBe(15000);
    expect(requiredAmount(150, 'USD')).toBe(150);
  });
});

describe('provider profile', () => {
  it('a deep link /discover/provider/1 renders the profile, its quick info and the four tabs', () => {
    searchParams.current = { id: '1' };
    const { wrapper } = commerceWrapper({}, { tables: { bookmarked_items: [] } });
    render(<ProviderProfileScreen />, { wrapper });
    expect(screen.getByTestId('provider-name').props.children).toBe('Dr. Sarah Chen');
    expect(screen.getByTestId('provider-verified')).toBeTruthy();
    expect(screen.getByText('(156 reviews)')).toBeTruthy();
    expect(screen.getByTestId('provider-bookings').props.children).toBe('1,234bookings');
    fireEvent.press(screen.getByTestId('provider-tab-services'));
    expect(within(screen.getByTestId('provider-services')).getAllByText('$150')).toHaveLength(2);
    fireEvent.press(screen.getByTestId('provider-tab-reviews'));
    expect(screen.getByText('Patient Reviews')).toBeTruthy();
  });

  it('back: history back when there is one, else (cold start) the directory', () => {
    searchParams.current = { id: '2' };
    const { wrapper } = commerceWrapper({}, { tables: { bookmarked_items: [] } });
    render(<ProviderProfileScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('provider-back'));
    expect(router.back).toHaveBeenCalled();
    router.canGoBack.mockReturnValue(false);
    fireEvent.press(screen.getByTestId('provider-back'));
    expect(router.navigate).toHaveBeenCalledWith('/discover/doctors-coaches');
  });

  it('share opens the system share sheet with the profile link; Book Appointment opens the booking dialog', async () => {
    searchParams.current = { id: '3' };
    const { wrapper } = commerceWrapper({}, { tables: { bookmarked_items: [] } });
    render(<ProviderProfileScreen />, { wrapper });
    await act(async () => fireEvent.press(screen.getByTestId('provider-share')));
    expect(share.mock.calls[0][0]).toMatchObject({ title: 'Luna Wellness Spa' });
    expect(String((share.mock.calls[0][0] as { url?: string }).url)).toMatch(/\/discover\/provider\/3$/);
    fireEvent.press(screen.getByTestId('provider-book'));
    expect(screen.getByTestId('booking-title').props.children).toBe('Holistic Wellness Center Session');
  });

  it('an unknown id (the web knows 1–3 here): "Provider not found" and back to providers', () => {
    searchParams.current = { id: '6' };
    const { wrapper } = commerceWrapper();
    render(<ProviderProfileScreen />, { wrapper });
    expect(screen.getByTestId('provider-not-found')).toBeTruthy();
    fireEvent.press(screen.getByTestId('provider-back-directory'));
    expect(router.navigate).toHaveBeenCalledWith('/discover/doctors-coaches');
  });
});
