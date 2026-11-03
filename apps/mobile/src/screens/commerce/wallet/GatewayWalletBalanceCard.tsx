/**
 * VTID-05512 — twin of src/components/wallet/GatewayWalletBalanceCard.tsx:
 * "Your balance" with the EUR / USD `wallet_accounts` balances
 * (`GET /wallet/balance`, joined with " · "), "Loading balance …" (spinner)
 * or "No balance yet", and "Add money", which opens the AddMoneyDialog twin.
 * After a Stripe top-up the return leg's state shows under the balance
 * (data/depositReturn.ts): "Confirming payment" while pending, then the
 * web's outcome — "Balance topped up", "Top-up failed" or "Deposit canceled".
 *
 * iOS IAP gate flag (R5): the top-up entry — today's behaviour, no iOS gate
 * (as on the web); drawer.ts:37-38 `iapRestricted` unchanged.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Spinner, Text, useUITheme } from '../../../ports/ui';
import { CheckoutIcon } from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { useWalletBalance } from '../data/wallet';
import { useDepositReturnState, type DepositReturnStatus } from '../data/depositReturn';
import { useMoney } from '../format';
import { AddMoneyDialog } from './AddMoneyDialog';
import { Panel } from '../parts';

const DEPOSIT_STATE_KEYS: Record<DepositReturnStatus, string> = {
  pending: 'marketplaceCheckout.deposit.checkingTitle',
  succeeded: 'marketplaceCheckout.deposit.succeededTitle',
  failed: 'marketplaceCheckout.deposit.failedTitle',
  canceled: 'toasts.wallet.depositCanceled',
};

export function GatewayWalletBalanceCard(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const money = useMoney();
  const { accounts, isLoading } = useWalletBalance();
  const [open, setOpen] = useState(false);
  const deposit = useDepositReturnState();
  const depositTone = deposit?.status === 'succeeded' ? colors.statusSuccess : deposit?.status === 'pending' ? colors.mutedForeground : colors.statusError;
  return (
    <Panel testID="wallet-balance-card">
      <View style={styles.row}>
        <View style={styles.flex}>
          <View style={styles.inline}>
            <CheckoutIcon name="Wallet" size={16} color={colors.foreground} />
            <Text size="sm" weight="500">
              {t('marketplaceCheckout.balance.title')}
            </Text>
          </View>
          {isLoading ? (
            <View style={styles.inline}>
              <Spinner />
              <Text size="sm" muted>
                {t('marketplaceCheckout.balance.loading')}
              </Text>
            </View>
          ) : accounts.length === 0 ? (
            <Text size="sm" muted testID="wallet-balance-empty">
              {t('marketplaceCheckout.balance.empty')}
            </Text>
          ) : (
            <Text size="sm" muted testID="wallet-balance">
              {accounts.map((a) => money(a.balance_minor, a.currency)).join(' · ')}
            </Text>
          )}
          {deposit ? (
            <View style={styles.inline}>
              {deposit.status === 'pending' ? <Spinner /> : null}
              <Text size="sm" color={depositTone} testID="deposit-return-status" accessibilityLiveRegion="polite">
                {t(DEPOSIT_STATE_KEYS[deposit.status])}
              </Text>
            </View>
          ) : null}
        </View>
        <Button variant="outline" size="sm" testID="wallet-add-money" onPress={() => setOpen(true)}>
          <CheckoutIcon name="Plus" size={16} color={colors.foreground} />
          {t('marketplaceCheckout.balance.addMoney')}
        </Button>
      </View>
      <AddMoneyDialog open={open} onOpenChange={setOpen} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16 },
  flex: { flex: 1, gap: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
