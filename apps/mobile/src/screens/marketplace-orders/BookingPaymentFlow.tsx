/**
 * VTID-05511 — twin of `src/components/payment/BookingPaymentFlow.tsx`, the
 * "Complete Booking" dialog the provider directory's "Book Now" and the
 * provider profile's "Book Appointment" open. Purchase surface (a provider
 * session paid from the wallet or by card): the web does not gate it on
 * iOS (no `isIAPRestricted()` call in the dialog or its callers), so neither
 * does this port — the gating is exactly today's, recorded in
 * docs/validation/VTID-05511/verification.md (R5 flag, decision deferred).
 *
 *  - summary: "<title> Session", "Book a session with <name>", the provider
 *    avatar / name / rating; the date ("Pick a date" → the month calendar,
 *    past days disabled, the web's react-day-picker popover) and time (09:00 –
 *    17:00 every 30 min) pickers; location and duration;
 *  - Payment Method: Credits (balance, required Credits, ≈ $price), USD wallet,
 *    Debit/Credit card (Stripe), the selected one outlined; Credits default;
 *  - "Insufficient Balance" + top-up hint when a wallet method cannot pay;
 *  - Total (and "Converts to $N USD" for Credits); Cancel / Confirm Booking
 *    (disabled when it cannot pay or while processing);
 *  - confirm: date + time required (`missingInformation`); card → Edge
 *    Function `stripe-create-booking-checkout`, then the Stripe page in the
 *    system browser (the web opens a popup) and "Redirecting to payment";
 *    wallet → `update_user_balance` (USD) or `process_wallet_exchange`
 *    (Credits), 500 ms, the provider message, `onBookingComplete` (the
 *    appointment insert), "Booking confirmed"; any failure → "Booking failed".
 * Prices use `getExchangeRate` / `formatCurrency` from `@vitana/core`
 * (src/lib/exchangeRates.ts, pure).
 */
import { useMemo, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Avatar, Button, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import {
  alpha,
  CommerceIcon,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  formatCurrency,
  getExchangeRate,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  useCommercePalette,
} from '../../ports/marketplace-orders';
import { useI18n } from '../../i18n/I18nProvider';
import { formatDate } from './format';
import { useBookingCalls } from './data/booking';

const K = 'discoverCommerceNative.marketplaceOrders.booking';
const P = 'screens.payment';

export interface Booking {
  id: string;
  title: string;
  description: string;
  price: number;
  provider: { name: string; avatar?: string; rating?: number };
  duration: string;
  location: string;
  type: 'service' | 'event';
}

type Method = 'credits' | 'usd' | 'cash';

/** `generateTimeSlots`: 09:00 … 17:00 every 30 minutes. */
export function timeSlots(): string[] {
  const out: string[] = [];
  for (let h = 9; h <= 17; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 17) out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
}

/** `getRequiredAmount` — Credits at the CREDITS→USD rate (100:1 fallback). */
export function requiredAmount(price: number, currency: 'CREDITS' | 'USD'): number {
  if (currency === 'USD') return price;
  const rate = getExchangeRate(currency, 'USD');
  if (!rate) return price * 100;
  return price / rate.rate;
}

export function BookingPaymentFlow({
  isOpen,
  onClose,
  booking,
  userBalance,
  onBookingComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  userBalance?: { credits: number; usd: number };
  onBookingComplete?: (details: Record<string, unknown>) => Promise<void>;
}): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const calls = useBookingCalls();
  const [method, setMethod] = useState<Method>('credits');
  const [processing, setProcessing] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);

  const canAfford = () => {
    if (!userBalance) return false;
    if (method === 'cash') return true;
    const required = requiredAmount(booking.price, method === 'credits' ? 'CREDITS' : 'USD');
    return method === 'credits' ? userBalance.credits >= required : userBalance.usd >= required;
  };

  const confirm = async () => {
    if (!date || !time) {
      notifyError('toasts.payment.missingInformation', 'toasts.payment.pleaseSelectDateTimeForYour');
      return;
    }
    if (!canAfford()) {
      notifyError('toasts.payment.insufficientBalance');
      return;
    }
    setProcessing(true);
    try {
      const at = new Date(date);
      const [hh, mm] = time.split(':');
      at.setHours(parseInt(hh, 10), parseInt(mm, 10));
      const formattedDate = formatDate(date, 'PPP', 'en');
      if (method === 'cash') {
        const data = await calls.createBookingCheckout({
          providerId: booking.id,
          providerName: booking.provider.name,
          providerImage: booking.provider.avatar,
          providerSpecialty: booking.description || 'Healthcare Professional',
          bookingTitle: booking.title,
          price: booking.price,
          dateTime: at.toISOString(),
          duration: booking.duration.replace(/\D/g, ''),
          location: booking.location,
          appointmentType: booking.type || 'consultation',
        });
        if (!data.url) throw new Error('no checkout url');
        await WebBrowser.openBrowserAsync(data.url);
        notify('toasts.payment.redirectingPayment', 'toasts.payment.completeYourPaymentPopupWindow');
        setProcessing(false);
        onClose();
        return;
      }
      const currency = method === 'credits' ? 'CREDITS' : 'USD';
      if (method === 'usd') {
        await calls.updateBalance('USD', booking.price, 'subtract');
      } else {
        const rate = getExchangeRate(currency, 'USD');
        if (!rate) throw new Error('Exchange rate not available');
        await calls.exchangeCurrency(currency, 'USD', requiredAmount(booking.price, currency), rate.rate);
      }
      await new Promise((r) => setTimeout(r, 500));
      const amountPaid = requiredAmount(booking.price, currency);
      const confirmation = {
        bookingId: booking.id,
        title: booking.title,
        date: formattedDate,
        time,
        amount: amountPaid,
        amountUSD: booking.price,
        currency,
        customerName: 'Current User',
        paymentStatus: 'completed',
        paymentMethod: 'wallet',
      };
      await calls.sendMessage(
        `New booking confirmed: ${booking.title} on ${formattedDate} at ${time}`,
        `provider_${booking.provider.name.toLowerCase().replace(' ', '_')}`,
        'service_booking',
        confirmation,
      );
      if (onBookingComplete) await onBookingComplete({ type: 'consultation', dateTime: new Date().toISOString(), ...confirmation });
      notify('toasts.payment.bookingConfirmed');
      setProcessing(false);
      onClose();
    } catch {
      notifyError('toasts.payment.bookingFailed');
      setProcessing(false);
    }
  };

  const option = (m: Method, icon: string, tint: string, titleKey: string, sub: string, trailing: ReactElement) => (
    <Pressable
      key={m}
      testID={`booking-method-${m}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: method === m }}
      onPress={() => setMethod(m)}
      style={[styles.method, { borderColor: method === m ? colors.primary : colors.border, backgroundColor: method === m ? alpha(colors.primary, 0.05) : 'transparent' }]}
    >
      <View style={styles.rowFlex}>
        <CommerceIcon name={icon} size={20} color={tint} />
        <View style={styles.flex}>
          <Text weight="500">{t(titleKey)}</Text>
          <Text size="sm" muted>
            {sub}
          </Text>
        </View>
      </View>
      {trailing}
    </Pressable>
  );

  const total =
    method === 'cash' ? `$${booking.price.toFixed(2)}` : formatCurrency(requiredAmount(booking.price, method === 'credits' ? 'CREDITS' : 'USD'), method === 'credits' ? 'CREDITS' : 'USD');

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent testID="booking-dialog">
        <DialogHeader>
          <View style={styles.row}>
            <CommerceIcon name="CheckCircle" size={20} color={palette.success} />
            <DialogTitle>{t(`${P}.completeBooking`)}</DialogTitle>
          </View>
        </DialogHeader>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text size="lg" weight="600" testID="booking-title">
              {booking.title}
            </Text>
            <Text size="sm" muted>
              {booking.description}
            </Text>
            <View style={[styles.row, styles.mt12]}>
              <Avatar uri={booking.provider.avatar && /^https?:/.test(booking.provider.avatar) ? booking.provider.avatar : null} fallback={booking.provider.name[0] ?? ''} size={32} />
              <View style={styles.flex}>
                <Text size="sm" weight="500">
                  {booking.provider.name}
                </Text>
                {booking.provider.rating ? (
                  <View style={styles.row}>
                    <CommerceIcon name="Star" size={12} color={palette.warning} fill={palette.warning} />
                    <Text size="xs">{String(booking.provider.rating)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Separator style={styles.sep} />
            <Text size="xs" muted>
              {t(`${P}.selectDate`)}
            </Text>
            <Button variant="outline" onPress={() => setPickerOpen((v) => !v)} testID="booking-date" style={styles.startAlign}>
              <CommerceIcon name="Calendar" size={16} />
              {date ? formatDate(date, 'PPP', locale) : t(`${K}.pickDate`)}
            </Button>
            {pickerOpen ? (
              <MonthCalendar
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setPickerOpen(false);
                }}
              />
            ) : null}
            <Text size="xs" muted style={styles.mt8}>
              {t(`${P}.selectTime`)}
            </Text>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger testID="booking-time">
                <View style={styles.row}>
                  <CommerceIcon name="Clock" size={16} />
                  <SelectValue placeholder={t(`${P}.pickTime`)} />
                </View>
              </SelectTrigger>
              <SelectContent testID="booking-time-list">
                {timeSlots().map((s) => (
                  <SelectItem key={s} value={s} testID={`booking-time-${s}`}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <View style={[styles.row, styles.mt8]}>
              <View style={[styles.row, styles.flex]}>
                <CommerceIcon name="MapPin" size={16} color={colors.mutedForeground} />
                <Text size="sm" numberOfLines={1} style={styles.flex}>
                  {booking.location}
                </Text>
              </View>
              <View style={[styles.row, styles.flex]}>
                <CommerceIcon name="Shield" size={16} color={colors.mutedForeground} />
                <Text size="sm">{booking.duration}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text size="lg" weight="600">
              {t(`${P}.paymentMethod`)}
            </Text>
            {option(
              'credits',
              'Coins',
              palette.warning,
              `${P}.credits`,
              t(`${P}.balanceValue0`, { value0: formatCurrency(userBalance?.credits || 0, 'CREDITS') }),
              <View style={styles.endAlign}>
                <Text weight="500">{formatCurrency(requiredAmount(booking.price, 'CREDITS'), 'CREDITS')}</Text>
                <Text size="xs" muted>{`≈ $${booking.price.toFixed(2)}`}</Text>
              </View>,
            )}
            {option('usd', 'DollarSign', palette.success, `${P}.usdWallet`, t(`${P}.balanceValue0`, { value0: formatCurrency(userBalance?.usd || 0, 'USD') }), <Text weight="500">{`$${booking.price.toFixed(2)}`}</Text>)}
            {option('cash', 'CreditCard', palette.category2, `${P}.debitcreditCard`, t(`${P}.payWithStripe`), <Text weight="500">{`$${booking.price.toFixed(2)}`}</Text>)}
          </View>

          {!canAfford() && method !== 'cash' ? (
            <View style={[styles.card, { borderColor: alpha(palette.error, 0.25), backgroundColor: palette.errorSubtle }]} testID="booking-insufficient">
              <View style={styles.row}>
                <CommerceIcon name="Shield" size={16} color={palette.error} />
                <Text size="sm" weight="500" color={palette.error}>
                  {t(`${P}.insufficientBalance`)}
                </Text>
              </View>
              <Text size="sm" color={palette.error}>
                {t(`${P}.topUpYourWalletCompleteThis`)}
              </Text>
            </View>
          ) : null}

          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.between}>
              <Text size="lg" weight="600">
                {t(`${P}.total`)}
              </Text>
              <Text size="lg" weight="600" testID="booking-total">
                {total}
              </Text>
            </View>
            {method === 'credits' ? (
              <Text size="sm" muted style={styles.endText}>
                {t(`${P}.convertsValue0Usd`, { value0: booking.price.toFixed(2) })}
              </Text>
            ) : null}
          </View>

          <View style={styles.row}>
            <Button variant="outline" style={styles.flex} onPress={onClose} testID="booking-cancel">
              {t(`${P}.cancel`)}
            </Button>
            <Button style={styles.flex} onPress={() => void confirm()} disabled={!canAfford() || processing} testID="booking-confirm">
              <CommerceIcon name={processing ? 'Clock' : 'CheckCircle'} size={16} color={colors.primaryForeground} />
              {processing ? t(`${P}.processing`) : t(`${P}.confirmBooking`)}
            </Button>
          </View>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}

/** The web `Calendar` (react-day-picker, single mode): month title, prev / next, weekday row, days; days before today disabled. */
export function MonthCalendar({ selected, onSelect, today = new Date() }: { selected?: Date; onSelect: (d: Date) => void; today?: Date }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [month, setMonth] = useState(() => new Date((selected ?? start).getFullYear(), (selected ?? start).getMonth(), 1));
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = first.getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month]);
  const weekdays = useMemo(() => {
    const sunday = new Date(2023, 0, 1);
    return Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(sunday.getFullYear(), 0, 1 + i)));
  }, [locale]);
  const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month);
  return (
    <View style={[styles.calendar, { borderColor: colors.border }]} testID="booking-calendar">
      <View style={styles.between}>
        <Pressable testID="booking-calendar-prev" accessibilityRole="button" accessibilityLabel={t(`${K}.previousMonth`)} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.nav}>
          <Text>‹</Text>
        </Pressable>
        <Text size="sm" weight="500" testID="booking-calendar-title">
          {title}
        </Text>
        <Pressable testID="booking-calendar-next" accessibilityRole="button" accessibilityLabel={t(`${K}.nextMonth`)} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.nav}>
          <Text>›</Text>
        </Pressable>
      </View>
      <View style={styles.week}>
        {weekdays.map((w, i) => (
          <Text key={i} size="xs" muted style={styles.cellText}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.week}>
        {days.map((d, i) => {
          if (!d) return <View key={`x${i}`} style={styles.cell} />;
          const disabled = d < start;
          const on = !!selected && d.toDateString() === selected.toDateString();
          return (
            <Pressable
              key={d.toISOString()}
              testID={`booking-day-${d.getDate()}`}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: on }}
              onPress={() => onSelect(d)}
              style={[styles.cell, on ? { backgroundColor: colors.primary, borderRadius: 6 } : null]}
            >
              <Text size="sm" color={on ? colors.primaryForeground : disabled ? alpha(colors.mutedForeground, 0.5) : colors.foreground} style={styles.cellText}>
                {String(d.getDate())}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 600 },
  body: { gap: 16, paddingBottom: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowFlex: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  flex: { flex: 1 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12, gap: 12 },
  sep: { marginVertical: 8 },
  startAlign: { justifyContent: 'flex-start' },
  method: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderRadius: 8, gap: 8 },
  endAlign: { alignItems: 'flex-end' },
  endText: { alignSelf: 'flex-end' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendar: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 },
  nav: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 36, alignItems: 'center', justifyContent: 'center' },
  cellText: { width: `${100 / 7}%`, textAlign: 'center' },
});
