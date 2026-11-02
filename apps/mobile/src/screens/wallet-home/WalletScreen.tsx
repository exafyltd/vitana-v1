/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — the native wallet hub
 * (`/wallet`, WALLET.OVERVIEW), a port of the mobile-web (`useIsMobile`)
 * branch of src/pages/Wallet.tsx on the N3 shell:
 *  - header (wallet title + description) and the action rail: the
 *    `MobileModePill` (Balances / Activity / Actions / Rewards) and the
 *    primary "Actions" button that opens the WalletPopup
 *    (OVERLAY.WALLET_POPUP, ./components/WalletMasterActionSheet.tsx);
 *  - Balances: the cash card (display currency € / $ via the currency toggle,
 *    USD × EUR/USD), the VTNA Credits card and the quick actions;
 *  - Activity (`?tab=activity`, WALLET.ACTIVITY): the `?filter=` badge and
 *    the recent-activity list (10 rows);
 *  - Actions (`?tab=actions`, WALLET.ACTIONS): the predictive-actions and
 *    reward-opportunity cards;
 *  - Rewards opens `/wallet/rewards` (and `?tab=rewards` lands there), as the
 *    web does (VTID-05024);
 *  - the add-funds / buy-credits / withdraw / spend / send / request /
 *    exchange flows as native bottom sheets (./components/WalletFlowSheet.tsx).
 *
 * iOS IAP gate, mirrored one-for-one from the web (owner decision 4 / program
 * decision 5 — keep today's behaviour): on iOS the screen redirects to /home
 * (web `useEffect(() => { if (isIAPRestricted()) navigate('/home', { replace:
 * true }) })`), and the balances block is not rendered
 * (`{!isIAPRestricted() && …}`); the sub-components carry their own gates.
 *
 * Not carried over (documented in the PR): the ExpandableSearchButton (the
 * web handler only logs), the UniversalCalendarButton and the
 * VitanaIndex / Autopilot chips (other lanes' surfaces, as on native Home).
 *
 * Stripe deposit return leg (`?depositId=&depositResult=`, web
 * `useDeposit(…, { pollUntilTerminal: true })`): ./data/depositReturn.ts reads
 * a pending deposit again on AppState 'active' and on focus, honours the
 * web's return params, refetches the wallet and shows the web's toasts.
 * React 19: typed with `ReactElement`.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, IconButton, Text, useUITheme } from '../../ports/ui';
import { convertFromUsd, getCurrencySymbol } from '../../ports/wallet';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { useI18n } from '../../i18n/I18nProvider';
import { isIAPRestricted } from './iap';
import { fmtNumber } from './format';
import { useWallet, type WalletTransaction } from './data/wallet';
import { useDisplayCurrency, useEurUsdRate } from './data/currency';
import { useDepositReturnLeg } from './data/depositReturn';
import { BalanceCard } from './components/BalanceCard';
import { CurrencyToggle } from './components/CurrencyToggle';
import { QuickActions } from './components/QuickActions';
import { TransactionList } from './components/TransactionList';
import { InsightCard } from './components/InsightCard';
import { WalletMasterActionSheet } from './components/WalletMasterActionSheet';
import { WalletFlowSheet, type WalletFlowKind } from './components/WalletFlowSheet';

export type WalletMode = 'balances' | 'activity' | 'actions';

const FLOW_KINDS: WalletFlowKind[] = ['add-funds', 'buy-credits', 'withdraw', 'spend-credits', 'send', 'request', 'exchange', 'exchange-and-send'];

const FILTER_KEYS: Record<string, string> = {
  reseller_commission: 'wallet.filters.commissions',
  transfer: 'wallet.filters.transfers',
  exchange: 'wallet.filters.exchanges',
  reward: 'wallet.filters.rewards',
  purchase: 'wallet.filters.purchases',
  withdrawal: 'wallet.filters.withdrawals',
  stake: 'wallet.filters.stakes',
  pending: 'wallet.filters.pending',
};

function modeFromParam(tab: string | undefined): WalletMode | null {
  return tab === 'activity' || tab === 'actions' || tab === 'balances' ? tab : null;
}

export function filterTransactions(transactions: WalletTransaction[], filter: string | undefined): WalletTransaction[] {
  if (!filter) return transactions;
  if (filter === 'pending') return transactions.filter((tx) => tx.status === 'pending' || tx.metadata?.status === 'pending_payout');
  return transactions.filter((tx) => tx.transaction_type === filter);
}

export function WalletScreen(): ReactElement {
  const { colors } = useUITheme();
  const { t, locale } = useI18n();
  const params = useLocalSearchParams<{ tab?: string; filter?: string; depositId?: string; depositResult?: string }>();
  const restricted = isIAPRestricted();

  // Wallet is hidden on iOS: redirect home (web Wallet.tsx, replace).
  useEffect(() => {
    if (restricted) router.replace('/home');
  }, [restricted]);

  const [mode, setMode] = useState<WalletMode>(() => modeFromParam(params.tab) ?? 'balances');
  // Honour ?tab= deep links; only an explicit valid value acts. ?tab=rewards lands on /wallet/rewards.
  useEffect(() => {
    const next = modeFromParam(params.tab);
    if (next) setMode(next);
    if (params.tab === 'rewards') router.replace('/wallet/rewards');
  }, [params.tab]);

  const { transactions, loading, getBalance, isLoaded } = useWallet();
  useDepositReturnLeg({ depositId: params.depositId, depositResult: params.depositResult });
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const { eurPerUsd } = useEurUsdRate();

  const [masterOpen, setMasterOpen] = useState(false);
  const [flow, setFlow] = useState<WalletFlowKind | null>(null);
  const openFlow = (kind: WalletFlowKind) => {
    setMasterOpen(false);
    setFlow(kind);
  };

  const modes: ModeOption[] = [
    { value: 'balances', label: t('wallet.tabs.balances'), icon: '💰' },
    { value: 'activity', label: t('wallet.tabs.activity'), icon: '📊' },
    { value: 'actions', label: t('wallet.tabs.actions'), icon: '⚡' },
    { value: 'rewards', label: t('wallet.tabs.rewards'), icon: '🎁' },
  ];
  const onModeChange = (value: string) => {
    if (value === 'rewards') {
      router.navigate('/wallet/rewards');
      return;
    }
    setMode(value as WalletMode);
  };

  const filter = params.filter || undefined;
  const filtered = useMemo(() => filterTransactions(transactions, filter), [transactions, filter]);

  const usd = getBalance('USD');
  const credits = getBalance('CREDITS');
  const cashBalance =
    usd === null ? t('common.loading') : `${getCurrencySymbol(displayCurrency)}${fmtNumber(locale, convertFromUsd(usd, displayCurrency, eurPerUsd), { maximumFractionDigits: 2 })}`;
  const availableLine = `${t('wallet.available')}: 100%`;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-wallet">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">
            {t('wallet.title')}
          </Text>
          <Text muted>{t('wallet.description')}</Text>
        </View>

        <View style={styles.rail}>
          <MobileModePill modes={modes} activeMode={mode} onModeChange={onModeChange} title={t('walletHomeNative.selectMode')} />
          <Button testID="wallet-actions-button" size="sm" onPress={() => setMasterOpen(true)} accessibilityLabel={t('common.actions')}>
            {t('common.actions')}
          </Button>
        </View>

        {mode === 'balances' ? (
          <View testID="wallet-balances" style={styles.section}>
            {!restricted ? (
              <>
                <BalanceCard
                  testID="wallet-balance-cash"
                  type="cash"
                  title={t('wallet.usdBalance')}
                  balance={cashBalance}
                  subBalance={availableLine}
                  change={`+${fmtNumber(locale, 2.3)}%`}
                  changeType="increase"
                  isLoading={!isLoaded}
                  onPress={() => openFlow('add-funds')}
                  icon={displayCurrency === 'EUR' ? 'Euro' : 'DollarSign'}
                  accessory={<CurrencyToggle value={displayCurrency} onChange={setDisplayCurrency} />}
                />
                <BalanceCard
                  testID="wallet-balance-credits"
                  type="credits"
                  title={t('wallet.creditsLabel')}
                  balance={credits !== null ? t('screens.wallet.vtnaCreditsAmount', { value0: fmtNumber(locale, credits) }) : t('common.loading')}
                  subBalance={availableLine}
                  change={`+${fmtNumber(locale, 12.1)}%`}
                  changeType="increase"
                  isLoading={!isLoaded}
                  onPress={() => openFlow('buy-credits')}
                />
                <QuickActions
                  onAddFunds={() => openFlow('add-funds')}
                  onSend={() => openFlow('send')}
                  onExchange={() => openFlow('exchange')}
                  onWithdraw={() => openFlow('withdraw')}
                  onBuyCredits={() => openFlow('buy-credits')}
                />
              </>
            ) : null}
          </View>
        ) : null}

        {mode === 'activity' ? (
          <View testID="wallet-activity" style={styles.section}>
            {filter ? (
              <View testID="wallet-filter-badge" style={styles.filterRow}>
                <Badge variant="secondary">{t('screens.wallet.showingValue0', { value0: FILTER_KEYS[filter] ? t(FILTER_KEYS[filter]) : filter })}</Badge>
                <IconButton testID="wallet-filter-clear" name="X" size={14} onPress={() => router.setParams({ filter: undefined })} accessibilityLabel={t('spotlightTierB.wallet.clearFilter')} />
              </View>
            ) : null}
            <TransactionList transactions={filtered} isLoading={loading} maxItems={10} />
          </View>
        ) : null}

        {mode === 'actions' ? (
          <View testID="wallet-actions-mode" style={styles.section}>
            <InsightCard testID="wallet-predictive-actions" icon="Sparkles" titleKey="screens.wallet.aiPredictions" bodyKey="screens.wallet.basedYourBehaviorPatternsMarketAnalysis" t={t} />
            <InsightCard testID="wallet-reward-opportunities" icon="Gift" titleKey="screens.wallet.liveOpportunities" t={t} />
          </View>
        ) : null}
      </ScrollView>

      <WalletMasterActionSheet open={masterOpen} onClose={() => setMasterOpen(false)} onStep={openFlow} />
      {FLOW_KINDS.map((kind) => (
        <WalletFlowSheet key={kind} kind={kind} open={flow === kind} onClose={() => setFlow(null)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 128, gap: 12 },
  header: { gap: 4 },
  rail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { gap: 12 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
