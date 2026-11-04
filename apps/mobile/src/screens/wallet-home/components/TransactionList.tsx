/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — twin of
 * src/components/wallet/mobile/MobileWalletTransactionList.tsx: the "Recent
 * activity" card with a loading skeleton, the empty line, and one row per
 * transaction (type icon, title, date + non-completed status, signed amount
 * and currency). The web hardcodes the English row titles; the native rows
 * use the existing catalog keys (`spotlightTierB.wallet.txType.*` /
 * `txStatus.*`) so every locale reads them.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle, Icon, Skeleton, Text, useUITheme } from '../../../ports/ui';
import { useI18n } from '../../../i18n/I18nProvider';
import { fmtDateTime, fmtSigned } from '../format';
import type { WalletTransaction } from '../data/wallet';

const ICON: Record<string, string> = {
  transfer: 'ArrowUpRight',
  reseller_commission: 'ArrowDownLeft',
  exchange: 'RefreshCw',
  reward: 'Gift',
};

export function TransactionList({
  transactions,
  isLoading,
  maxItems = 5,
  testIDPrefix = 'wallet-tx',
  emptyKey = 'screens.wallet.noTransactionsYet',
}: {
  transactions: WalletTransaction[];
  isLoading?: boolean;
  maxItems?: number;
  testIDPrefix?: string;
  emptyKey?: string;
}): ReactElement {
  const { colors } = useUITheme();
  const { t, locale } = useI18n();
  const rows = transactions.slice(0, maxItems);
  const header = (
    <CardHeader>
      <CardTitle>{t('screens.wallet.recentActivity')}</CardTitle>
    </CardHeader>
  );

  if (isLoading) {
    return (
      <Card testID={`${testIDPrefix}-loading`}>
        {header}
        <CardContent style={styles.list}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.row}>
              <Skeleton style={styles.disc} />
              <View style={styles.fill}>
                <Skeleton style={styles.line} />
              </View>
            </View>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card testID={`${testIDPrefix}-empty`}>
        {header}
        <CardContent>
          <Text variant="caption" muted style={styles.center}>
            {t(emptyKey)}
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card testID={`${testIDPrefix}-list`}>
      {header}
      <CardContent style={styles.list}>
        {rows.map((tx) => {
          const date = fmtDateTime(locale, tx.created_at);
          return (
            <View key={tx.id} testID={`${testIDPrefix}-${tx.id}`} style={styles.row}>
              <View style={[styles.disc, { backgroundColor: colors.muted }]}>
                <Icon name={ICON[tx.transaction_type] ?? 'RefreshCw'} size={16} color={tx.amount > 0 ? colors.statusSuccess : colors.foreground} />
              </View>
              <View style={styles.fill}>
                <Text weight="600" numberOfLines={1}>
                  {t(`spotlightTierB.wallet.txType.${tx.transaction_type}`)}
                </Text>
                <Text variant="caption" muted>
                  {tx.status !== 'completed' ? `${date} • ${t(`spotlightTierB.wallet.txStatus.${tx.status}`)}` : date}
                </Text>
              </View>
              <View style={styles.amount}>
                <Text weight="600" color={tx.amount > 0 ? colors.statusSuccess : undefined}>
                  {fmtSigned(locale, tx.amount)}
                </Text>
                {tx.from_currency ? (
                  <Text variant="caption" muted>
                    {tx.from_currency}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  fill: { flex: 1, minWidth: 0 },
  disc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  line: { height: 14, width: 112 },
  amount: { alignItems: 'flex-end' },
  center: { textAlign: 'center', paddingVertical: 24 },
});
