/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — the native balance detail
 * (`/wallet/balance`, WALLET.BALANCE), a port of the phone layout of
 * src/pages/wallet/Balance.tsx (the page has no `useIsMobile` branch; phones
 * get the non-Spotlight layout). The `tab` search param selects the account
 * pane exactly like the web `useUrlTab("tab", "credits")`:
 *   credits (default)  credits balance + status, credit-earning forecast, the
 *                      last 5 CREDITS / VTNA transactions
 *   tokens             VTNA balance, token intelligence (WALLET.BALANCE_TOKENS)
 *   membership         USD balance + membership tier, membership ROI, the last
 *                      5 USD transactions (WALLET.BALANCE_MEMBERSHIP)
 *   optimization       the earning-optimisation card (WALLET.BALANCE_OPTIMIZATION)
 * A tab press writes the param back (`router.setParams`).
 *
 * iOS IAP gate, mirrored one-for-one: `getContextualAction()` returns null
 * under `isIAPRestricted()`, so on iOS there is no top-up / buy-stake /
 * upgrade affordance on any tab; the membership tab (a real-world service)
 * stays visible. The three dialogs are bottom sheets; their confirm buttons go
 * to `WalletActions` (no payment call from this lane), and the package tiles
 * stay non-interactive as on the web. The motivational banner and the
 * intelligence cards' sample rows are hardcoded English on the web and are
 * not carried over (./components/InsightCard.tsx). React 19: `ReactElement`.
 */
import { useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BottomSheet, Button, PressableRow, Text, useUITheme } from '../../ports/ui';
import { radius } from '../../ports/tokens';
import { useI18n } from '../../i18n/I18nProvider';
import { isIAPRestricted } from './iap';
import { fmtNumber } from './format';
import { useWallet, type WalletTransaction } from './data/wallet';
import { useWalletActions, type WalletActionKind } from './data/actions';
import { BalanceCard } from './components/BalanceCard';
import { TransactionList } from './components/TransactionList';
import { InsightCard } from './components/InsightCard';

export type BalanceTab = 'credits' | 'tokens' | 'membership' | 'optimization';

const TABS: { value: BalanceTab; labelKey: string }[] = [
  { value: 'credits', labelKey: 'screens.wallet.creditsAccount' },
  { value: 'tokens', labelKey: 'screens.wallet.tokensAccount' },
  { value: 'membership', labelKey: 'screens.wallet.membershipBenefits' },
  { value: 'optimization', labelKey: 'screens.wallet.earningOptimization' },
];

type Dialog = 'topup' | 'tokens' | 'upgrade';

/** Web `getContextualAction()`. */
export function contextualAction(tab: BalanceTab): { labelKey: string; dialog: Dialog } | null {
  if (isIAPRestricted()) return null;
  switch (tab) {
    case 'tokens':
      return { labelKey: 'screens.wallet.buystakeVtnaTokens', dialog: 'tokens' };
    case 'membership':
      return { labelKey: 'screens.wallet.upgradeMembership', dialog: 'upgrade' };
    default:
      return { labelKey: 'screens.wallet.topUpCredits', dialog: 'topup' };
  }
}

const isCredits = (tx: WalletTransaction) => ['CREDITS', 'VTNA'].includes(tx.from_currency ?? '') || ['CREDITS', 'VTNA'].includes(tx.to_currency ?? '');
const isUsd = (tx: WalletTransaction) => tx.from_currency === 'USD' || tx.to_currency === 'USD';

const TOP_UP_PACKAGES: { credits: number; usd: number }[] = [
  { credits: 500, usd: 25 },
  { credits: 1200, usd: 50 },
  { credits: 2500, usd: 100 },
  { credits: 5500, usd: 200 },
];

export function BalanceScreen(): ReactElement {
  const { colors } = useUITheme();
  const { t, locale } = useI18n();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: BalanceTab = TABS.some((x) => x.value === params.tab) ? (params.tab as BalanceTab) : 'credits';
  const { transactions, loading, getBalance, isLoaded } = useWallet();
  const actions = useWalletActions();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const action = contextualAction(tab);

  const amountOr = (value: number | null, key: string) => (value !== null ? t(key, { amount: fmtNumber(locale, value) }) : t('common.loading'));
  const submitAction = (kind: WalletActionKind) => () => void actions.submit({ kind });
  const status = (key: string) => t(`walletHomeNative.balance.${key}`);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-wallet-balance">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">
            {t('screens.wallet.balanceBenefits')}
          </Text>
          <Text muted>{t('spotlightTierB.wallet.balanceDescription')}</Text>
        </View>

        {action ? (
          <Button testID="balance-contextual-action" size="sm" onPress={() => setDialog(action.dialog)} style={styles.action}>
            {t(action.labelKey)}
          </Button>
        ) : null}

        <View accessibilityRole="tablist" accessibilityLabel={status('tabsLabel')} style={[styles.tabs, { backgroundColor: colors.muted }]}>
          {TABS.map((x) => {
            const active = x.value === tab;
            return (
              <PressableRow
                key={x.value}
                testID={`balance-tab-${x.value}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => router.setParams({ tab: x.value })}
                style={[styles.tab, active ? { backgroundColor: colors.background } : null]}
              >
                <Text variant="label" numberOfLines={2} style={styles.tabLabel} color={active ? colors.foreground : colors.mutedForeground}>
                  {t(x.labelKey)}
                </Text>
              </PressableRow>
            );
          })}
        </View>

        {tab === 'credits' ? (
          <View testID="balance-pane-credits" style={styles.section}>
            <BalanceCard
              testID="balance-card-credits"
              type="credits"
              title={t('screens.wallet.creditsBalance')}
              balance={amountOr(getBalance('CREDITS'), 'spotlightTierB.wallet.creditsAmount')}
              subBalance={`${t('wallet.available')}: 100%`}
              change={`+${fmtNumber(locale, 12.1)}%`}
              changeType="increase"
              status={status('statusActive')}
              description={status('creditsDescription')}
              isLoading={!isLoaded}
            />
            <BalanceCard type="credits" title={t('screens.wallet.creditsStatus')} balance={status('statusActive')} description={status('creditsStatusDescription')} status={status('statusHealthy')} />
            <InsightCard testID="balance-credit-forecast" icon="TrendingUp" titleKey="screens.wallet.creditEarningForecast" t={t} />
            <TransactionList transactions={transactions.filter(isCredits)} isLoading={loading} maxItems={5} testIDPrefix="balance-tx" emptyKey="screens.wallet.noCreditTransactionsYet" />
          </View>
        ) : null}

        {tab === 'tokens' ? (
          <View testID="balance-pane-tokens" style={styles.section}>
            <BalanceCard
              testID="balance-card-vtna"
              type="tokens"
              title={t('screens.wallet.vtnaBalance')}
              balance={amountOr(getBalance('VTNA'), 'spotlightTierB.wallet.vtnaAmount')}
              subBalance={`${t('wallet.staked')}: 25%`}
              change={`+${fmtNumber(locale, 5.7)}%`}
              changeType="increase"
              status={status('statusGrowing')}
              description={status('tokensDescription')}
              isLoading={!isLoaded}
            />
            <InsightCard testID="balance-token-intelligence" icon="Coins" titleKey="screens.wallet.tokenIntelligence" t={t} />
          </View>
        ) : null}

        {tab === 'membership' ? (
          <View testID="balance-pane-membership" style={styles.section}>
            <BalanceCard
              testID="balance-card-usd"
              type="cash"
              title={t('screens.wallet.usdBalance')}
              balance={amountOr(getBalance('USD'), 'spotlightTierB.wallet.usdAmount')}
              subBalance={`${t('wallet.available')}: 100%`}
              change={`+${fmtNumber(locale, 2.3)}%`}
              changeType="increase"
              status={status('statusActive')}
              description={status('usdDescription')}
              isLoading={!isLoaded}
            />
            <BalanceCard type="cash" title={t('screens.wallet.membershipTier')} balance={status('tierPremium')} description={status('membershipDescription')} status={status('statusActive')} />
            <InsightCard testID="balance-membership-roi" icon="BarChart3" titleKey="screens.wallet.membershipRoiAnalytics" t={t} />
            <TransactionList transactions={transactions.filter(isUsd)} isLoading={loading} maxItems={5} testIDPrefix="balance-tx" emptyKey="screens.wallet.noUsdTransactionsYet" />
          </View>
        ) : null}

        {tab === 'optimization' ? (
          <View testID="balance-pane-optimization" style={styles.section}>
            <InsightCard testID="balance-earning-optimization" icon="Target" titleKey="screens.wallet.earningOptimizationDashboard" t={t} />
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet testID="balance-topup" open={dialog === 'topup'} onClose={() => setDialog(null)} title={t('screens.wallet.topUpCredits')}>
        <View style={styles.sheet}>
          <Text variant="caption" muted>
            {t('screens.wallet.purchaseCreditsUnlockPremiumHealthServices')}
          </Text>
          <View style={styles.grid}>
            {TOP_UP_PACKAGES.map((p) => (
              <View key={p.credits} style={[styles.tile, { borderColor: colors.border }]}>
                <Text weight="700" size="lg">
                  {fmtNumber(locale, p.credits)}
                </Text>
                <Text variant="caption">{`$${p.usd}`}</Text>
              </View>
            ))}
          </View>
          <Button testID="balance-topup-confirm" onPress={submitAction('top-up-credits')}>
            {t('screens.wallet.purchaseCredits')}
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet testID="balance-tokens" open={dialog === 'tokens'} onClose={() => setDialog(null)} title={t('screens.wallet.buystakeVtnaTokens')}>
        <View style={styles.sheet}>
          <Text variant="caption" muted>
            {t('screens.wallet.purchaseStakeVtnaTokensForGovernance')}
          </Text>
          <View style={styles.grid}>
            {['screens.wallet.buyTokens', 'screens.wallet.stakeTokens'].map((k) => (
              <View key={k} style={[styles.tile, { borderColor: colors.border }]}>
                <Text weight="600">{t(k)}</Text>
              </View>
            ))}
          </View>
          <Button testID="balance-tokens-confirm" onPress={submitAction('buy-stake-tokens')}>
            {t('screens.wallet.continuePurchase')}
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet testID="balance-upgrade" open={dialog === 'upgrade'} onClose={() => setDialog(null)} title={t('screens.wallet.upgradeMembership')}>
        <View style={styles.sheet}>
          <Text variant="caption" muted>
            {t('screens.wallet.upgradePlatinumTierFor90Coverage')}
          </Text>
          <View style={[styles.plan, { borderColor: colors.border }]}>
            <View style={styles.planHead}>
              <Text weight="600">{t('screens.wallet.platinumTier')}</Text>
              <Text weight="700" size="lg">
                {t('screens.wallet.text99month')}
              </Text>
            </View>
            {['screens.wallet.text90LabTestCoverage', 'screens.wallet.unlimitedHealthCoaching', 'screens.wallet.prioritySupport247', 'screens.wallet.advancedAnalytics'].map((k) => (
              <Text key={k} variant="caption" muted>
                {t(k)}
              </Text>
            ))}
          </View>
          <Button testID="balance-upgrade-confirm" onPress={submitAction('upgrade-membership')}>
            {t('screens.wallet.upgradeNow')}
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 128, gap: 16 },
  header: { gap: 4 },
  action: { alignSelf: 'flex-start' },
  tabs: { flexDirection: 'row', borderRadius: radius.lg, padding: 4, gap: 4 },
  tab: { flex: 1, justifyContent: 'center', borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 4, gap: 0 },
  tabLabel: { textAlign: 'center' },
  section: { gap: 12 },
  sheet: { gap: 16, paddingBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '45%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 64, borderWidth: 1, borderRadius: radius.md },
  plan: { gap: 4, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
});
