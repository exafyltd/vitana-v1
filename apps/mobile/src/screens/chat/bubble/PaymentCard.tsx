/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — payment
 * messages, native twin of web `src/components/payment/PaymentMessageHandler.tsx`:
 *
 *  - payment_request: amount + status badge + description; the payer sees
 *    their balance (with refresh) and Pay / Decline. Pay locks the card
 *    (stored lock per message, the web's localStorage key in AsyncStorage),
 *    posts "✅ Payment completed …" (`payment_confirmation`), transfers
 *    (`process_wallet_transfer`) and marks the request completed; Decline posts
 *    "❌ Payment declined …" (`payment_declined`). "Insufficient … balance".
 *  - exchange_and_send: rate badge, the two amounts, Accept / Decline
 *    (`process_wallet_exchange_and_send`).
 *  - payment_confirmation / exchange_and_send_confirmation: the green
 *    "Payment completed" card with the transaction id.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Badge, Button, notify, notifyError, Text, useUITheme } from '../../../ports/ui';
import { ChatIcon } from '../../../ports/chat';
import { useI18n } from '../../../i18n/I18nProvider';
import { useWallet, type Currency } from '../data/wallet';
import type { ChatViewMessage } from '../data/types';

type Reply = (content: string, messageType: string, contentData: Record<string, unknown>) => Promise<void>;
type Update = (messageId: string, updates: { content_data: Record<string, unknown> }) => Promise<void> | void;

const lockKey = (kind: 'lock' | 'declined', id: string) => `global:payments:${kind}:${id}`;

export function formatCurrency(amount: number, currency: string, language: string): string {
  const n = new Intl.NumberFormat(language).format(amount);
  switch ((currency || '').toUpperCase()) {
    case 'USD':
      return `$${n}`;
    case 'CREDITS':
      return `${n} Credits`;
    case 'VTNA':
      return `${n} VTNA`;
    default:
      return `${amount} ${currency}`;
  }
}

const CURRENCY_ICON: Record<string, string> = { USD: 'DollarSign', CREDITS: 'Coins', VTNA: 'CreditCard' };

export function PaymentCard({ message, userId, onReply, onUpdate }: { message: ChatViewMessage; userId?: string; onReply?: Reply; onUpdate?: Update }) {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const data = (message.content_data ?? {}) as Record<string, unknown>;
  const isMine = message.sender_id === userId;
  const isRequest = message.message_type === 'payment_request' || message.message_type === 'exchange_and_send';
  const wallet = useWallet(userId, isRequest && !isMine);
  const [locked, setLocked] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([AsyncStorage.getItem(lockKey('lock', message.id)), AsyncStorage.getItem(lockKey('declined', message.id))]).then(([l, d]) => {
      setLocked(l === '1');
      setDeclined(d === '1');
    });
  }, [message.id]);

  const setFlag = (kind: 'lock' | 'declined', on: boolean) => void AsyncStorage.setItem(lockKey(kind, message.id), on ? '1' : '0');
  const status = String(data.status ?? 'pending');
  const effective = declined ? 'declined' : completed ? 'completed' : status;
  const fmt = (amount: unknown, currency: unknown) => formatCurrency(Number(amount) || 0, String(currency ?? ''), language);
  const canAfford = (amount: number, currency: string) => {
    const b = wallet.getBalance(currency);
    return typeof b === 'number' ? b >= amount : true;
  };

  const decline = async () => {
    if (!onReply || !onUpdate) return;
    if (status !== 'pending' || declined || locked) {
      notify('toasts.payment.alreadyProcessed', 'toasts.payment.thisPaymentRequestHasAlreadyProcessed');
      return;
    }
    setFlag('declined', true);
    setFlag('lock', true);
    setDeclined(true);
    setLocked(true);
    setBusy(true);
    try {
      await onReply(`❌ Payment declined: ${fmt(data.amount, data.currency)} - ${String(data.description ?? '')}`, 'payment_declined', {
        ...data,
        status: 'declined',
        declinedBy: userId,
        declinedAt: new Date().toISOString(),
      });
      await onUpdate(message.id, { content_data: { ...data, status: 'declined' } });
      notify('toasts.payment.paymentDeclined', 'toasts.payment.paymentRequestHasDeclined');
    } catch {
      setDeclined(false);
      setLocked(false);
      setFlag('declined', false);
      setFlag('lock', false);
      notifyError('toasts.payment.error');
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (!onReply || !onUpdate) return;
    if (status !== 'pending') {
      notify('toasts.payment.alreadyProcessed');
      return;
    }
    if (locked) {
      notify('toasts.payment.alreadyAccepted', 'toasts.payment.thisPaymentRequestAlreadyAccepted');
      return;
    }
    setFlag('lock', true);
    setLocked(true);
    setBusy(true);
    setCompleted(true);
    const amount = Number(data.amount) || 0;
    const currency = String(data.currency ?? '').toUpperCase() as Currency;
    notify('toasts.payment.paymentCompleted');
    await onReply(`✅ Payment completed: ${fmt(amount, currency)} - ${String(data.description ?? '')}`, 'payment_confirmation', {
      ...data,
      status: 'completed',
      completedBy: userId,
      completedAt: new Date().toISOString(),
    }).catch(() => undefined);
    try {
      if (!canAfford(amount, currency)) throw new Error('insufficient');
      const result = await wallet.transferFunds(message.sender_id, currency, amount);
      if (result) await onUpdate(message.id, { content_data: { ...data, status: 'completed', transactionId: result.id } });
    } catch {
      setCompleted(false);
      setLocked(false);
      setFlag('lock', false);
      notifyError('toasts.payment.paymentFailed');
    } finally {
      setBusy(false);
    }
  };

  const acceptExchange = async () => {
    if (!onReply || !onUpdate) return;
    if (status !== 'pending') {
      notify('toasts.payment.alreadyProcessed');
      return;
    }
    if (locked) {
      notify('toasts.payment.alreadyAccepted', 'toasts.payment.thisRequestAlreadyAccepted');
      return;
    }
    setFlag('lock', true);
    setLocked(true);
    setBusy(true);
    setCompleted(true);
    const fromAmount = Number(data.originalAmount ?? data.fromAmount) || 0;
    const fromCurrency = String(data.originalCurrency ?? data.fromCurrency ?? '').toUpperCase() as Currency;
    const toCurrency = String(data.exchangedCurrency ?? data.toCurrency ?? '').toUpperCase() as Currency;
    const rate = Number(data.exchangeRate) || 0;
    notify('toasts.payment.exchangeSendSuccessful');
    try {
      if (!canAfford(fromAmount, fromCurrency)) {
        notifyError('toasts.payment.insufficientBalance');
        return;
      }
      const result = await wallet.exchangeAndSend(message.sender_id, fromCurrency, toCurrency, fromAmount, rate);
      if (result) {
        await onUpdate(message.id, { content_data: { ...data, status: 'completed', exchangeTransactionId: result.exchangeTransactionId, transferTransactionId: result.transferTransactionId } });
        await onReply(`🔄✅ Exchange & Send completed: ${fmt(fromAmount, fromCurrency)} → ${fmt(result.netAmount, toCurrency)}`, 'exchange_and_send_confirmation', {
          ...data,
          status: 'completed',
          completedBy: userId,
          completedAt: new Date().toISOString(),
          exchangeTransactionId: result.exchangeTransactionId,
          transferTransactionId: result.transferTransactionId,
          netAmount: result.netAmount,
        });
        notify('toasts.payment.exchangeSendCompleted');
      }
    } catch {
      setCompleted(false);
      notifyError('toasts.payment.transactionFailed');
    } finally {
      setBusy(false);
    }
  };

  const badge = (
    <Badge variant={effective === 'completed' ? 'default' : effective === 'declined' ? 'destructive' : 'secondary'} testID="payment-status">
      {t(`chatNative.payment.status.${effective === 'completed' || effective === 'declined' ? effective : 'pending'}`)}
    </Badge>
  );

  if (message.message_type === 'payment_confirmation' || message.message_type === 'exchange_and_send_confirmation') {
    return (
      <View style={[styles.card, { borderColor: colors.statusSuccess }]} testID="payment-confirmation-card">
        <View style={styles.row}>
          <ChatIcon name="CheckCircle" size={18} color={colors.statusSuccess} />
          <Text style={[styles.bold, { color: colors.statusSuccess }]}>{t('screens.payment.paymentCompleted')}</Text>
        </View>
        <Text style={[styles.amount, { color: colors.statusSuccess }]}>{fmt(data.netAmount ?? data.amount, data.exchangedCurrency ?? data.currency)}</Text>
        {data.description ? <Text style={{ color: colors.statusSuccess }}>{String(data.description)}</Text> : null}
        {data.transactionId ? (
          <Text style={[styles.small, { color: colors.statusSuccess }]}>{t('screens.payment.idTransactionid', { transactionId: String(data.transactionId) })}</Text>
        ) : null}
      </View>
    );
  }

  if (message.message_type === 'exchange_and_send') {
    const fromAmount = data.originalAmount ?? data.fromAmount;
    const fromCurrency = data.originalCurrency ?? data.fromCurrency;
    const toCurrency = data.exchangedCurrency ?? data.toCurrency;
    const rate = Number(data.exchangeRate) || 0;
    return (
      <View style={[styles.card, { borderColor: colors.border }]} testID="exchange-send-card">
        <View style={styles.between}>
          <Text style={styles.bold}>{t('screens.payment.exchangeSend')}</Text>
          <Badge variant="secondary">{t('screens.payment.rateValue0', { value0: rate.toFixed(3) })}</Badge>
        </View>
        <Text style={styles.amount}>
          {fmt(fromAmount, fromCurrency)} → {fmt((Number(fromAmount) || 0) * rate, toCurrency)}
        </Text>
        {data.description ? <Text muted>{String(data.description)}</Text> : null}
        {badge}
        {!isMine && effective === 'pending' ? (
          <View style={styles.row}>
            <Button size="sm" onPress={() => void acceptExchange()} disabled={busy || locked || !canAfford(Number(fromAmount) || 0, String(fromCurrency ?? ''))} testID="exchange-accept">
              {t('chatNative.payment.accept')}
            </Button>
            <Button size="sm" variant="outline" onPress={() => void decline()} disabled={busy || locked} testID="payment-decline">
              {t('chatNative.payment.decline')}
            </Button>
          </View>
        ) : null}
      </View>
    );
  }

  const amount = Number(data.amount) || 0;
  const currency = String(data.currency ?? '');
  const balance = wallet.getBalance(currency);
  const payable = canAfford(amount, currency);
  return (
    <View style={[styles.card, { borderColor: effective === 'completed' ? colors.statusSuccess : effective === 'declined' ? colors.destructive : colors.statusWarning }]} testID="payment-request-card">
      <View style={styles.between}>
        <View style={styles.row}>
          <ChatIcon name={CURRENCY_ICON[currency.toUpperCase()] ?? 'Coins'} size={16} />
          <Text style={styles.amount}>{fmt(amount, currency)}</Text>
        </View>
        {badge}
      </View>
      {data.description ? <Text muted>{String(data.description)}</Text> : null}
      {!isMine && effective === 'pending' ? (
        <>
          <View style={styles.between}>
            <Text muted style={styles.small}>
              {t('screens.payment.yourBalance3')}
            </Text>
            <View style={styles.row}>
              <Text style={styles.small} testID="payment-balance">
                {balance === null ? '—' : new Intl.NumberFormat(language).format(balance)}
              </Text>
              <Button size="sm" variant="ghost" onPress={() => void wallet.refresh()} accessibilityLabel={t('chatNative.payment.refreshBalance')} testID="payment-refresh">
                <ChatIcon name="RotateCw" size={12} />
              </Button>
            </View>
          </View>
          <View style={styles.row}>
            <Button size="sm" onPress={() => void pay()} disabled={busy || locked || completed || (typeof balance === 'number' && !payable)} testID="payment-pay">
              {t('chatNative.payment.pay')}
            </Button>
            <Button size="sm" variant="outline" onPress={() => void decline()} disabled={busy || locked || completed} testID="payment-decline">
              {t('chatNative.payment.decline')}
            </Button>
          </View>
          {typeof balance === 'number' && !payable ? (
            <Text style={[styles.small, { color: colors.destructive }]} testID="payment-insufficient">
              {t('screens.payment.insufficientCurrencyBalance', { currency })}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, minWidth: 220, maxWidth: 300 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  amount: { fontSize: 18, fontWeight: '600' },
  bold: { fontWeight: '600' },
  small: { fontSize: 12 },
});
