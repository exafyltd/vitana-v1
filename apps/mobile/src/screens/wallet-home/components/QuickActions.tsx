/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — twin of
 * src/components/wallet/mobile/MobileWalletQuickActions.tsx: the four primary
 * tiles (deposit, send, swap, withdraw) and the full-width "Buy VTNA Credits"
 * button. The web's `isIAPRestricted()` filter is mirrored one-for-one: on iOS
 * add-funds, buy-credits, exchange and withdraw are removed; send stays.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, CardContent, CardHeader, CardTitle, Icon, PressableRow, Text, useUITheme } from '../../../ports/ui';
import { radius } from '../../../ports/tokens';
import { useI18n } from '../../../i18n/I18nProvider';
import { isIAPRestricted } from '../iap';

type QuickAction = { id: string; labelKey: string; icon: string; onPress: () => void };

const RESTRICTED_IDS = ['add-funds', 'buy-credits', 'exchange', 'withdraw'];

export type QuickActionsProps = {
  onAddFunds: () => void;
  onSend: () => void;
  onExchange: () => void;
  onWithdraw: () => void;
  onBuyCredits: () => void;
};

export function QuickActions({ onAddFunds, onSend, onExchange, onWithdraw, onBuyCredits }: QuickActionsProps): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  const restricted = isIAPRestricted();
  const all: QuickAction[] = [
    { id: 'add-funds', labelKey: 'walletActions.addFunds', icon: 'CirclePlus', onPress: onAddFunds },
    { id: 'send', labelKey: 'walletActions.send', icon: 'Send', onPress: onSend },
    { id: 'exchange', labelKey: 'walletActions.exchange', icon: 'ArrowUpDown', onPress: onExchange },
    { id: 'withdraw', labelKey: 'walletActions.withdraw', icon: 'ArrowUpRight', onPress: onWithdraw },
  ];
  const allSecondary: QuickAction[] = [{ id: 'buy-credits', labelKey: 'walletActions.buyCredits', icon: 'CreditCard', onPress: onBuyCredits }];
  const actions = restricted ? all.filter((a) => !RESTRICTED_IDS.includes(a.id)) : all;
  const secondary = restricted ? allSecondary.filter((a) => !RESTRICTED_IDS.includes(a.id)) : allSecondary;

  return (
    <Card testID="wallet-quick-actions">
      <CardHeader>
        <CardTitle>{t('walletActions.title')}</CardTitle>
      </CardHeader>
      <CardContent style={styles.content}>
        <View style={styles.grid}>
          {actions.map((a) => (
            <PressableRow key={a.id} testID={`wallet-quick-${a.id}`} onPress={a.onPress} accessibilityLabel={t(a.labelKey)} style={[styles.tile, { backgroundColor: colors.muted }]}>
              <Icon name={a.icon} size={24} color={colors.foreground} />
              <Text variant="label">{t(a.labelKey)}</Text>
            </PressableRow>
          ))}
        </View>
        {secondary.map((a) => (
          <Button key={a.id} testID={`wallet-quick-${a.id}`} variant="outline" onPress={a.onPress} accessibilityLabel={t(a.labelKey)}>
            {t(a.labelKey)}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  grid: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 8, borderRadius: radius.lg * 2 },
});
