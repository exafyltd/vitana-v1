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
 * from core `calculateExchange`. Send, request and exchange & send add the
 * web's description field, send and request its currency select, send its
 * community-member recipient search, withdraw its method select. Every web
 * `if (isIAPRestricted()) return null` is mirrored: add-funds, buy-credits,
 * withdraw, spend-credits, exchange and exchange-and-send render nothing on
 * iOS; send and request are ungated on the web and stay ungated. Confirm runs
 * the web popup's handler (../data/flows.ts: the same validation, calls and
 * toasts) and closes the sheet where the web closes the popup.
 * Not carried over (documented in the PR): the spend catalogue (the quick
 * amounts name the purchase like the web's quick spend) and the request's
 * optional due date (sent as undefined, as the web does when it is empty).
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, PressableRow, RadioGroup, Text, TextInput, useUITheme } from '../../../ports/ui';
import { radius } from '../../../ports/tokens';
import { calculateExchange, convertFromUsd, getCurrencySymbol } from '../../../ports/wallet';
import { useAuth } from '../../../auth/AuthProvider';
import { useI18n } from '../../../i18n/I18nProvider';
import { isIAPRestricted } from '../iap';
import { useWallet, useWalletRefresh } from '../data/wallet';
import { useDisplayCurrency, useEurUsdRate } from '../data/currency';
import { useWalletActions, type CommunityMember } from '../data/actions';
import {
  WITHDRAWAL_METHODS,
  submitAddFunds,
  submitBuyCredits,
  submitExchange,
  submitExchangeAndSend,
  submitRequest,
  submitSend,
  submitSpendCredits,
  submitWithdraw,
  type FlowContext,
  type PaymentCurrency,
} from '../data/flows';
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

const DESCRIBED: readonly WalletFlowKind[] = ['send', 'request', 'exchange-and-send'];

function FlowBody({ kind, open, onClose }: { kind: WalletFlowKind; open: boolean; onClose: () => void }): ReactElement {
  const { colors } = useUITheme();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { balances, getBalance } = useWallet();
  const refresh = useWalletRefresh();
  const { displayCurrency } = useDisplayCurrency();
  const { eurPerUsd } = useEurUsdRate();
  const actions = useWalletActions();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payCurrency, setPayCurrency] = useState<PaymentCurrency>('CREDITS');
  const [methodId, setMethodId] = useState<string | null>(null);
  const [itemName, setItemName] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<CommunityMember | null>(null);
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<CommunityMember[] | null>(null);
  const [busy, setBusy] = useState(false);
  const cfg = FLOWS[kind];
  const selfId = user?.id ?? null;

  // Send: the web loads the default member list, then searches from 2 characters (or the empty term).
  useEffect(() => {
    if (kind !== 'send' || !open || !selfId) return;
    const term = search.trim();
    if (term.length === 1) return;
    let live = true;
    actions.searchMembers(term, selfId).then(
      (rows) => live && setMembers(rows),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [kind, open, search, selfId, actions]);

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

  const run = (): Promise<boolean> => {
    const ctx: FlowContext = {
      actions,
      user: user ? { id: user.id, tenantId: (user.app_metadata?.active_tenant_id as string | undefined) || 'default' } : null,
      balances,
      getBalance,
      refresh,
    };
    const amountText = amount.replace(',', '.');
    switch (kind) {
      case 'add-funds':
        return submitAddFunds(ctx, { amountText, displayCurrency, eurPerUsd });
      case 'buy-credits':
        return submitBuyCredits(ctx, { amountText });
      case 'withdraw':
        return submitWithdraw(ctx, { amountText, methodId });
      case 'spend-credits':
        return submitSpendCredits(ctx, { amountText, itemName });
      case 'send':
        return submitSend(ctx, { amountText, description, recipient, currency: payCurrency });
      case 'request':
        return submitRequest(ctx, { amountText, description, currency: payCurrency });
      case 'exchange':
        return submitExchange(ctx, { amountText, fromCurrency: 'USD', toCurrency: 'CREDITS' });
      case 'exchange-and-send':
        return submitExchangeAndSend(ctx, { amountText, description });
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      if (await run()) {
        setAmount('');
        setDescription('');
        setMethodId(null);
        setItemName(null);
        setRecipient(null);
        setSearch('');
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const pickQuick = (q: number) => {
    setAmount(String(q));
    // Web quick spend names the purchase.
    if (kind === 'spend-credits') setItemName(`${q} Credits Purchase`);
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
                <Button key={q} testID={`wallet-flow-quick-${q}`} size="sm" variant="outline" onPress={() => pickQuick(q)}>
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
        {kind === 'withdraw' ? (
          <View style={styles.quickBlock}>
            <Text variant="label">{t('screens.wallet.withdrawalMethod')}</Text>
            <RadioGroup
              testID="wallet-flow-method"
              accessibilityLabel={t('screens.wallet.selectWithdrawalMethod')}
              value={methodId}
              onChange={setMethodId}
              options={WITHDRAWAL_METHODS.map((m) => ({ value: m.id, label: t(m.labelKey), subtitle: `${t(m.timeKey)} · ${t('screens.wallet.feeFee', { fee: m.fee })}` }))}
            />
          </View>
        ) : null}
        {kind === 'send' || kind === 'request' ? (
          <View style={styles.quickBlock}>
            <Text variant="label">{t('screens.payment.currency')}</Text>
            <RadioGroup
              testID="wallet-flow-currency"
              accessibilityLabel={t('screens.payment.currency')}
              value={payCurrency}
              onChange={(v) => setPayCurrency(v as PaymentCurrency)}
              options={[
                { value: 'CREDITS', label: t('screens.payment.credits') },
                { value: 'USD', label: t('screens.payment.usd') },
              ]}
            />
          </View>
        ) : null}
        {kind === 'send' ? (
          <View style={styles.quickBlock} testID="wallet-flow-recipient">
            <Text variant="label">{t('screens.payment.paymentRecipient')}</Text>
            {recipient ? (
              <View style={styles.selected}>
                <Text weight="600" testID="wallet-flow-recipient-selected">
                  {recipient.display_name || recipient.user_id}
                </Text>
                <Button testID="wallet-flow-recipient-change" size="sm" variant="outline" onPress={() => setRecipient(null)}>
                  {t('screens.payment.change')}
                </Button>
              </View>
            ) : (
              <>
                <TextInput testID="wallet-flow-recipient-search" value={search} onChangeText={setSearch} placeholder={t('screens.payment.searchForCommunityMember')} accessibilityLabel={t('screens.payment.paymentRecipient')} />
                {members && members.length === 0 ? (
                  <Text variant="caption" muted>
                    {t('screens.payment.noMembersFound')}
                  </Text>
                ) : null}
                {(members ?? []).map((m) => (
                  <PressableRow key={m.user_id} testID={`wallet-flow-member-${m.user_id}`} accessibilityRole="button" onPress={() => setRecipient(m)} style={styles.member}>
                    <Text>{m.display_name || m.user_id}</Text>
                  </PressableRow>
                ))}
              </>
            )}
          </View>
        ) : null}
        {DESCRIBED.includes(kind) ? (
          <View style={styles.quickBlock}>
            <Text variant="label">{t('screens.payment.description')}</Text>
            <TextInput testID="wallet-flow-description" value={description} onChangeText={setDescription} placeholder={t('screens.payment.whatThisPaymentFor')} accessibilityLabel={t('screens.payment.description')} />
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
  selected: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  member: { paddingVertical: 8 },
  bullets: { gap: 4, padding: 12, borderRadius: radius.lg, borderWidth: 1 },
});
