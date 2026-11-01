/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — the wallet's money flows as
 * native bottom sheets (web `ResponsiveDialog` / `Dialog` popups):
 *   add-funds      src/components/wallet/popups/AddFundsPopup.tsx
 *   buy-credits    src/components/wallet/popups/BuyCreditsPopup.tsx
 *   withdraw       src/components/wallet/popups/WithdrawPopup.tsx
 *   spend-credits  src/components/wallet/popups/SpendCreditsPopup.tsx
 *   send           src/components/payment/MakePaymentPopup.tsx
 *   request        src/components/payment/PaymentRequestPopup.tsx
 *   exchange       src/components/wallet/steps/ExchangeStep.tsx
 *   exchange-and-send  src/components/payment/ExchangeAndSendPopup.tsx
 *
 * Each sheet keeps the web title, the current-balance line, the amount field
 * with its quick amounts, and the confirm button; the exchange quote comes
 * from core `calculateExchange`. Every web `if (isIAPRestricted()) return
 * null` is mirrored: add-funds, buy-credits, withdraw, spend-credits, exchange
 * and exchange-and-send render nothing on iOS; send and request are ungated
 * on the web and stay ungated. Confirm validates the amount like the web
 * (`toasts.wallet.invalidAmount2`) and hands the request to `WalletActions`
 * (./data/actions.ts) — this lane makes no payment / transfer call.
 * Deferred to a later wallet FEAT (documented in the PR): the recipient
 * search of send / request / exchange-and-send, the withdrawal-method select,
 * and the spend catalogue.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, TextInput, notifyError, useUITheme } from '../../../ports/ui';
import { radius } from '../../../ports/tokens';
import { calculateExchange, convertFromUsd, convertToUsd, getCurrencySymbol } from '../../../ports/wallet';
import { useI18n } from '../../../i18n/I18nProvider';
import { isIAPRestricted } from '../iap';
import { useWallet } from '../data/wallet';
import { useDisplayCurrency, useEurUsdRate } from '../data/currency';
import { useWalletActions, type WalletActionRequest } from '../data/actions';
import { fmtNumber } from '../format';

export type WalletFlowKind = 'add-funds' | 'buy-credits' | 'withdraw' | 'spend-credits' | 'send' | 'request' | 'exchange' | 'exchange-and-send';

/** The web popups that `return null` under `isIAPRestricted()`. */
export const IAP_GATED_FLOWS: readonly WalletFlowKind[] = ['add-funds', 'buy-credits', 'withdraw', 'spend-credits', 'exchange', 'exchange-and-send'];

type Unit = 'cash' | 'credits' | 'usd';

type FlowConfig = {
  titleKey: string;
  descriptionKey?: string;
  amountLabelKey: string;
  placeholderKey: string;
  quickLabelKey?: string;
  quick: number[];
  submitKey: string;
  unit: Unit;
  bulletsTitleKey?: string;
  bulletKeys?: string[];
};

const FLOWS: Record<WalletFlowKind, FlowConfig> = {
  'add-funds': {
    titleKey: 'screens.wallet.addFundsBalance',
    amountLabelKey: 'screens.wallet.amountAddCurrency',
    placeholderKey: 'screens.wallet.enterAmount',
    quick: [25, 50, 100, 200, 500],
    submitKey: 'screens.wallet.continueToSecureCheckout',
    unit: 'cash',
    bulletsTitleKey: 'screens.wallet.secureTransaction',
    bulletKeys: ['screens.wallet.cardPaymentViaStripe', 'screens.wallet.text256bitSslEncryption', 'screens.wallet.pciDssCompliantProcessing'],
  },
  'buy-credits': {
    titleKey: 'screens.wallet.buyCredits',
    amountLabelKey: 'screens.wallet.customAmount',
    placeholderKey: 'screens.wallet.enterNumberCredits',
    quickLabelKey: 'screens.wallet.creditPackages',
    quick: [100, 500, 1000, 2500],
    submitKey: 'screens.wallet.buyCustomAmount',
    unit: 'credits',
    bulletsTitleKey: 'screens.wallet.creditUsage',
    bulletKeys: ['screens.wallet.accessPremiumFeaturesServices', 'screens.wallet.purchaseInappItemsUpgrades', 'screens.wallet.participateExclusiveEvents'],
  },
  withdraw: {
    titleKey: 'screens.wallet.withdrawFunds',
    descriptionKey: 'screens.wallet.transferMoneyFromYourVitanaWallet',
    amountLabelKey: 'screens.wallet.withdrawalAmount',
    placeholderKey: 'screens.wallet.enterAmount',
    quickLabelKey: 'screens.wallet.quickSelect',
    quick: [50, 100, 250, 500],
    submitKey: 'screens.wallet.withdrawValue0',
    unit: 'usd',
  },
  'spend-credits': {
    titleKey: 'screens.wallet.spendCredits',
    amountLabelKey: 'screens.wallet.amount',
    placeholderKey: 'screens.wallet.enterCreditsAmount',
    quickLabelKey: 'screens.wallet.quickSpend',
    quick: [25, 50, 100, 250],
    submitKey: 'screens.wallet.spendCredits',
    unit: 'credits',
  },
  send: {
    titleKey: 'screens.payment.makePayment',
    descriptionKey: 'screens.wallet.sendCommunityMembers',
    amountLabelKey: 'screens.wallet.amountSend',
    placeholderKey: 'screens.wallet.enterAmount',
    quick: [],
    submitKey: 'screens.wallet.send',
    unit: 'usd',
  },
  request: {
    titleKey: 'screens.payment.sendPaymentRequest',
    amountLabelKey: 'screens.payment.amount',
    placeholderKey: 'screens.wallet.enterAmount',
    quick: [],
    submitKey: 'spotlightTierB.wallet.request',
    unit: 'usd',
  },
  exchange: {
    titleKey: 'screens.wallet.exchangeCurrency',
    descriptionKey: 'screens.wallet.convertBetweenCreditsVtnaUsd',
    amountLabelKey: 'screens.wallet.youSend',
    placeholderKey: 'screens.wallet.enterAmount',
    quickLabelKey: 'screens.wallet.quickAmounts',
    quick: [10, 25, 50, 100],
    submitKey: 'screens.wallet.convert',
    unit: 'usd',
  },
  'exchange-and-send': {
    titleKey: 'screens.wallet.exchangeSend',
    descriptionKey: 'screens.wallet.convertCurrencySendOneStep',
    amountLabelKey: 'screens.wallet.exchangeSendAmount',
    placeholderKey: 'screens.wallet.enterAmount',
    quick: [],
    submitKey: 'screens.wallet.send',
    unit: 'usd',
  },
};

export function WalletFlowSheet({ kind, open, onClose }: { kind: WalletFlowKind; open: boolean; onClose: () => void }): ReactElement | null {
  if (IAP_GATED_FLOWS.includes(kind) && isIAPRestricted()) return null;
  return <FlowBody kind={kind} open={open} onClose={onClose} />;
}

function FlowBody({ kind, open, onClose }: { kind: WalletFlowKind; open: boolean; onClose: () => void }): ReactElement {
  const { colors } = useUITheme();
  const { t, locale } = useI18n();
  const { getBalance } = useWallet();
  const { displayCurrency } = useDisplayCurrency();
  const { eurPerUsd } = useEurUsdRate();
  const actions = useWalletActions();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const cfg = FLOWS[kind];

  const cashSymbol = cfg.unit === 'cash' ? getCurrencySymbol(displayCurrency) : cfg.unit === 'usd' ? getCurrencySymbol('USD') : '';
  const currencyParam = { currency: displayCurrency };
  const balanceLine = (() => {
    if (cfg.unit === 'credits') return t('screens.wallet.availableValue0Credits', { value0: fmtNumber(locale, getBalance('CREDITS') ?? 0) });
    if (cfg.unit === 'cash') {
      const value = convertFromUsd(getBalance('USD') ?? 0, displayCurrency, eurPerUsd);
      return `${t('screens.wallet.currentBalanceLabel', currencyParam)} ${cashSymbol}${fmtNumber(locale, value, { maximumFractionDigits: 2 })}`;
    }
    return `${t('screens.wallet.availableBalance')} ${cashSymbol}${fmtNumber(locale, getBalance('USD') ?? 0, { maximumFractionDigits: 2 })}`;
  })();

  const parsed = parseFloat(amount.replace(',', '.'));
  const quote = kind === 'exchange' && parsed > 0 ? calculateExchange(parsed, 'USD', 'CREDITS') : null;

  const submit = async () => {
    if (!amount || !(parsed > 0)) {
      notifyError('toasts.wallet.invalidAmount2', 'toasts.wallet.pleaseEnterValidAmountAdd');
      return;
    }
    const request: WalletActionRequest =
      kind === 'add-funds'
        ? { kind, amount: parsed, currency: displayCurrency, usdAmountMinor: Math.round(convertToUsd(parsed, displayCurrency, eurPerUsd) * 100) }
        : { kind, amount: parsed, currency: cfg.unit === 'credits' ? 'CREDITS' : 'USD' };
    setBusy(true);
    try {
      await actions.submit(request);
    } catch {
      notifyError('toasts.wallet.transactionFailed');
    } finally {
      setBusy(false);
    }
  };

  const submitLabel = kind === 'withdraw' ? t(cfg.submitKey, { value0: (parsed > 0 ? parsed : 0).toFixed(2) }) : t(cfg.submitKey);

  return (
    <BottomSheet testID={`wallet-flow-${kind}`} open={open} onClose={onClose} title={t(cfg.titleKey, currencyParam)}>
      <View style={styles.body}>
        {cfg.descriptionKey ? (
          <Text variant="caption" muted>
            {t(cfg.descriptionKey)}
          </Text>
        ) : null}
        <View style={[styles.balance, { backgroundColor: colors.muted }]}>
          <Text variant="caption">{balanceLine}</Text>
        </View>
        <Text variant="label">{t(cfg.amountLabelKey, currencyParam)}</Text>
        <TextInput testID="wallet-flow-amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder={t(cfg.placeholderKey)} accessibilityLabel={t(cfg.amountLabelKey, currencyParam)} />
        {cfg.quick.length ? (
          <View style={styles.quickBlock}>
            {cfg.quickLabelKey ? (
              <Text variant="caption" muted>
                {t(cfg.quickLabelKey)}
              </Text>
            ) : null}
            <View style={styles.quickRow}>
              {cfg.quick.map((q) => (
                <Button key={q} testID={`wallet-flow-quick-${q}`} size="sm" variant="outline" onPress={() => setAmount(String(q))}>
                  {cfg.unit === 'credits' ? t('screens.wallet.value0Credits', { value0: fmtNumber(locale, q) }) : `${cashSymbol}${q}`}
                </Button>
              ))}
            </View>
          </View>
        ) : null}
        {kind === 'exchange' ? (
          <View testID="wallet-flow-quote" style={styles.quote}>
            <Text variant="caption" muted>
              {t('screens.wallet.youReceive')}
            </Text>
            <Text weight="600">{t('screens.wallet.vtnaCreditsAmount', { value0: fmtNumber(locale, quote?.toAmount ?? 0) })}</Text>
            <Text variant="caption" muted>
              {t('screens.wallet.noFeesFreeExchange')}
            </Text>
          </View>
        ) : null}
        <Button testID="wallet-flow-submit" onPress={submit} disabled={busy}>
          {busy ? t('screens.wallet.processing') : submitLabel}
        </Button>
        {cfg.bulletKeys ? (
          <View style={[styles.bullets, { borderColor: colors.border }]}>
            {cfg.bulletsTitleKey ? <Text variant="label">{t(cfg.bulletsTitleKey)}</Text> : null}
            {cfg.bulletKeys.map((k) => (
              <Text key={k} variant="caption" muted>
                {t(k)}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 16 },
  balance: { padding: 16, borderRadius: radius.lg },
  quickBlock: { gap: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quote: { gap: 4 },
  bullets: { gap: 4, padding: 12, borderRadius: radius.lg, borderWidth: 1 },
});
