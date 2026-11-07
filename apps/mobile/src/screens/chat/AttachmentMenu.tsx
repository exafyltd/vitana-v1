/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the DM
 * composer's paperclip menu, native twin of web
 * `src/components/messages/AttachmentMenu.tsx` (+ its CalendarDialog and the
 * WalletIntegratedSendFunds / WalletIntegratedPaymentRequest dialogs):
 *
 *  - Send Funds: amount + currency (USD / VTNA Credits) + optional note, the
 *    available balance, "Free" fee and total; the transfer runs
 *    (`process_wallet_transfer`) and a "✅ Payment completed" confirmation
 *    message follows (type `payment_confirmation`);
 *  - Request Payment: amount, currency, description, optional due date → a
 *    `payment_request` message;
 *  - Send Calendar Invite: title, date + time (the system picker, the web's
 *    datetime-local), optional place and description
 *    → a `calendar_invite` message with Accept / Decline / Maybe buttons
 *    (MessageInput.sendCalendarInvite, 60 min default length);
 *  - Attach file: the device's photo / video library.
 * The message bodies are the web's own (English) message text, unchanged.
 *
 * iOS: Send Funds and Request Payment are wallet / purchase surfaces and stay
 * hidden on iOS, the same gate the drawer applies to the wallet
 * (`src/shell/logic/drawer.ts` iapRestricted) — never loosened.
 */
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, BottomSheet, Button, Text, TextInput, useUITheme } from '../../ports/ui';
import { ChatIcon, Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ports/chat';
import { useI18n } from '../../i18n/I18nProvider';
import { getChatDevice } from '../../ports/chat-device';
import { CURRENCIES, useWallet, type Currency } from './data/wallet';

type Send = (content: string, messageType: string, contentData: Record<string, unknown> | null, actionButtons?: unknown[]) => Promise<void>;
export type Recipient = { id: string; name?: string | null; avatar?: string | null };

/** The drawer's wallet gate (drawer.ts iapRestricted): no wallet surface on iOS. */
export const iapRestricted = () => Platform.OS === 'ios';

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RX = /^\d{1,2}:\d{2}$/;

const pad = (n: number) => String(n).padStart(2, '0');
/** A picked local Date as the web inputs' values: `YYYY-MM-DD` and `HH:MM`. */
export const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** `YYYY-MM-DD` → local midnight Date (for the field's value). */
export const dayToDate = (day: string) => {
  if (!DATE_RX.test(day)) return null;
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** web composeIso (MessageInput.sendCalendarInvite): local date + time, 09:00 without a time. */
export function composeInviteIso(date: string, time?: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (time) {
    const [h, mi] = time.split(':').map(Number);
    return new Date(y, m - 1, d, h, mi, 0, 0).toISOString();
  }
  return new Date(y, m - 1, d, 9, 0, 0, 0).toISOString();
}

/** The `calendar_invite` message MessageInput.sendCalendarInvite builds. */
export function buildCalendarInvite(title: string, date: string, time: string, location: string, description: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, day] = date.split('-').map(Number);
  const endDate = new Date(year, month - 1, day, hours, minutes + 60, 0, 0);
  const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
  const start_time = composeInviteIso(date, time);
  const end_time = composeInviteIso(date, endTime);
  const eventData = { title, date, time, endTime, location, description, type: 'meeting', start_time, end_time };
  const actionButtons = [
    { label: 'Accept', variant: 'default', action: 'calendar_accept', data: eventData },
    { label: 'Decline', variant: 'outline', action: 'calendar_decline', data: eventData },
    { label: 'Maybe', variant: 'secondary', action: 'calendar_maybe', data: eventData },
  ];
  const content = `Calendar invite: ${title}${time ? ` at ${time}` : ''} on ${date}${location ? ` at ${location}` : ''}`;
  return { content, eventData, actionButtons };
}

function CurrencyPicker({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <View style={styles.row}>
      {CURRENCIES.map((c) => (
        <Button key={c.value} size="sm" variant={value === c.value ? 'default' : 'outline'} onPress={() => onChange(c.value)} testID={`currency-${c.value}`}>
          {c.fullLabel}
        </Button>
      ))}
    </View>
  );
}

function RecipientRow({ recipient, caption }: { recipient: Recipient; caption: string }) {
  const { colors } = useUITheme();
  const name = recipient.name?.trim() || 'User';
  return (
    <View style={[styles.recipient, { backgroundColor: colors.muted }]}>
      <Avatar uri={recipient.avatar} fallback={name[0].toUpperCase()} size={32} />
      <View>
        <Text style={styles.bold}>{name}</Text>
        <Text muted style={styles.small}>
          {caption}
        </Text>
      </View>
    </View>
  );
}

export function SendFundsDialog({ open, onClose, recipient, userId, onSend }: { open: boolean; onClose: () => void; recipient: Recipient; userId?: string; onSend: Send }) {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const wallet = useWallet(userId, open);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [description, setDescription] = useState('');
  const value = parseFloat(amount || '0');
  const balance = wallet.getBalance(currency) || 0;
  const canAfford = value <= balance;
  const fmt = (n: number) => new Intl.NumberFormat(language).format(n);
  const submit = async () => {
    if (!amount || value <= 0 || !canAfford) return;
    const desc = description;
    setAmount('');
    setDescription('');
    onClose();
    const result = await wallet.transferFunds(recipient.id, currency, value);
    if (result?.id) {
      onSend(`✅ Payment completed: ${fmt(value)} ${currency}${desc ? ` - ${desc}` : ''}`, 'payment_confirmation', {
        amount: value,
        currency,
        description: desc,
        status: 'completed',
        transactionId: result.id,
        completedAt: new Date().toISOString(),
      }).catch(() => undefined);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (next ? undefined : onClose())}>
      <DialogContent testID="send-funds-dialog">
        <DialogHeader>
          <DialogTitle>{t('screens.payment.sendFunds')}</DialogTitle>
        </DialogHeader>
        <View style={styles.form}>
          <RecipientRow recipient={recipient} caption={t('screens.payment.recipient')} />
          <Text style={styles.bold}>{t('screens.payment.amount')}</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" accessibilityLabel={t('screens.payment.amount')} testID="send-funds-amount" />
          <CurrencyPicker value={currency} onChange={setCurrency} />
          <View style={styles.between}>
            <Text muted style={styles.small}>
              {t('screens.payment.availableBalance')}
            </Text>
            <Text style={[styles.small, styles.bold, !canAfford && amount ? { color: colors.destructive } : null]} testID="send-funds-balance">
              {fmt(balance)} {currency}
            </Text>
          </View>
          <Text style={styles.bold}>{t('screens.payment.descriptionOptional')}</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder={t('screens.payment.whatSThisPaymentFor')} multiline testID="send-funds-description" />
          {value > 0 ? (
            <View style={[styles.preview, { backgroundColor: colors.muted }]}>
              <View style={styles.between}>
                <Text style={styles.small}>{t('screens.payment.sending')}</Text>
                <Text style={[styles.small, styles.bold]}>
                  {fmt(value)} {currency}
                </Text>
              </View>
              <View style={styles.between}>
                <Text style={styles.small}>{t('screens.payment.fee')}</Text>
                <Text muted style={styles.small}>
                  {t('screens.payment.free')}
                </Text>
              </View>
              <View style={styles.between}>
                <Text style={[styles.small, styles.bold]}>{t('screens.payment.total')}</Text>
                <Text style={[styles.small, styles.bold]}>
                  {fmt(value)} {currency}
                </Text>
              </View>
            </View>
          ) : null}
          <View style={styles.row}>
            <Button variant="outline" onPress={onClose} style={styles.flex}>
              {t('screens.payment.cancel')}
            </Button>
            <Button onPress={() => void submit()} disabled={!amount || value <= 0 || !canAfford} style={styles.flex} testID="send-funds-submit">
              {t('screens.payment.sendFunds')}
            </Button>
          </View>
        </View>
      </DialogContent>
    </Dialog>
  );
}

function DueDate({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  const { t, language } = useI18n();
  const Field = getChatDevice().DateTimeField;
  const date = dayToDate(value);
  return (
    <Field
      mode="date"
      value={date}
      onChange={(d) => onChange(localDay(d))}
      placeholder={t('screens.payment.dueDateOptional')}
      display={date ? new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date) : ''}
      testID="payment-request-due"
    />
  );
}

export function PaymentRequestDialog({ open, onClose, recipient, onSend }: { open: boolean; onClose: () => void; recipient: Recipient; onSend: Send }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('CREDITS');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const submit = () => {
    if (!amount || !description) return;
    const data = {
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      description,
      dueDate: DATE_RX.test(dueDate) ? dueDate : undefined,
      paymentType: 'transfer',
      requestedBy: 'current_user',
      recipientId: recipient.id,
      status: 'pending',
      transactionId: `REQ_${Date.now()}`,
    };
    const body = `💰 Payment Request: ${currency === 'USD' ? '$' : ''}${amount} ${currency === 'USD' ? '' : currency} - ${description}`;
    setAmount('');
    setDescription('');
    setDueDate('');
    onClose();
    onSend(body, 'payment_request', data).catch(() => undefined);
  };
  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (next ? undefined : onClose())}>
      <DialogContent testID="payment-request-dialog">
        <DialogHeader>
          <DialogTitle>{t('screens.payment.requestPayment')}</DialogTitle>
        </DialogHeader>
        <View style={styles.form}>
          <RecipientRow recipient={recipient} caption={t('screens.payment.willReceiveYourRequest')} />
          <Text style={styles.bold}>{t('screens.payment.amount')}</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" accessibilityLabel={t('screens.payment.amount')} testID="payment-request-amount" />
          <Text style={styles.bold}>{t('screens.payment.currency')}</Text>
          <CurrencyPicker value={currency} onChange={setCurrency} />
          <Text style={styles.bold}>{t('screens.payment.description')}</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder={t('screens.payment.whatThisPaymentFor')} testID="payment-request-description" />
          <Text style={styles.bold}>{t('screens.payment.dueDateOptional')}</Text>
          <DueDate value={dueDate} onChange={setDueDate} />
          <View style={styles.row}>
            <Button variant="outline" onPress={onClose} style={styles.flex}>
              {t('screens.payment.cancel')}
            </Button>
            <Button onPress={submit} disabled={!amount || !description} style={styles.flex} testID="payment-request-submit">
              {t('screens.payment.sendRequest')}
            </Button>
          </View>
        </View>
      </DialogContent>
    </Dialog>
  );
}

export function CalendarInviteDialog({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: Send }) {
  const { t, language } = useI18n();
  const Field = getChatDevice().DateTimeField;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const valid = !!title.trim() && DATE_RX.test(date) && TIME_RX.test(time);
  const submit = () => {
    if (!valid) return;
    const invite = buildCalendarInvite(title, date, time, location, description);
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setDescription('');
    onClose();
    void onSend(invite.content, 'calendar_invite', invite.eventData, invite.actionButtons).catch(() => undefined);
  };
  return (
    <Dialog open={open} onOpenChange={(next: boolean) => (next ? undefined : onClose())}>
      <DialogContent testID="calendar-invite-dialog">
        <DialogHeader>
          <DialogTitle>{t('screens.messages.sendCalendarInvite')}</DialogTitle>
        </DialogHeader>
        <View style={styles.form}>
          <Text style={styles.bold}>{t('screens.messages.eventTitle')}</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder={t('screens.messages.meetingTitle')} testID="calendar-invite-title" />
          <Text style={styles.bold}>{t('screens.messages.dateTime')}</Text>
          <Field
            mode="datetime"
            value={valid || (DATE_RX.test(date) && TIME_RX.test(time)) ? new Date(composeInviteIso(date, time)) : null}
            onChange={(d) => {
              setDate(localDay(d));
              setTime(localTime(d));
            }}
            placeholder={t('screens.messages.dateTime')}
            display={DATE_RX.test(date) && TIME_RX.test(time) ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(composeInviteIso(date, time))) : ''}
            testID="calendar-invite-datetime"
          />
          <Text style={styles.bold}>{t('screens.messages.locationOptional')}</Text>
          <TextInput value={location} onChangeText={setLocation} placeholder={t('screens.messages.meetingLocation')} testID="calendar-invite-location" />
          <Text style={styles.bold}>{t('screens.messages.descriptionOptional')}</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder={t('screens.messages.meetingDescription')} testID="calendar-invite-description" />
          <Button onPress={submit} disabled={!valid} testID="calendar-invite-submit">
            {t('screens.messages.sendCalendarInvite')}
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}

export function AttachmentMenu({ onFileAttach, onSend, recipient, userId, disabled }: { onFileAttach: () => void; onSend: Send; recipient: Recipient | null; userId?: string; disabled?: boolean }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<'funds' | 'request' | 'calendar' | null>(null);
  const item = (key: string, icon: string, label: string, onPress: () => void, color?: string) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="button" style={styles.item} testID={`attach-${key}`}>
      <ChatIcon name={icon} size={20} color={color} />
      <Text>{label}</Text>
    </Pressable>
  );
  const wallet = !!recipient && !iapRestricted();
  return (
    <>
      <Pressable onPress={() => setOpen(true)} disabled={disabled} accessibilityRole="button" accessibilityLabel={t('screens.messages.attach')} style={styles.trigger} testID="attachment-menu-button">
        <ChatIcon name="Paperclip" size={16} />
      </Pressable>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t('screens.messages.attach')} testID="attachment-menu">
        {wallet
          ? [
              item('send-funds', 'Send', t('screens.messages.sendFunds'), () => {
                setOpen(false);
                setDialog('funds');
              }, colors.statusSuccess),
              item('request-payment', 'DollarSign', t('screens.messages.requestPayment'), () => {
                setOpen(false);
                setDialog('request');
              }, colors.statusSuccess),
            ]
          : null}
        {item('calendar', 'Calendar', t('screens.messages.sendCalendarInvite'), () => {
          setOpen(false);
          setDialog('calendar');
        })}
        {item('file', 'FileText', t('screens.messages.attachFile'), () => {
          setOpen(false);
          onFileAttach();
        })}
      </BottomSheet>
      {recipient && wallet ? (
        <>
          <SendFundsDialog open={dialog === 'funds'} onClose={() => setDialog(null)} recipient={recipient} userId={userId} onSend={onSend} />
          <PaymentRequestDialog open={dialog === 'request'} onClose={() => setDialog(null)} recipient={recipient} onSend={onSend} />
        </>
      ) : null}
      <CalendarInviteDialog open={dialog === 'calendar'} onClose={() => setDialog(null)} onSend={onSend} />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 12 },
  form: { gap: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flex: { flex: 1 },
  recipient: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8 },
  preview: { padding: 12, borderRadius: 8, gap: 6 },
  bold: { fontWeight: '600' },
  small: { fontSize: 13 },
});
