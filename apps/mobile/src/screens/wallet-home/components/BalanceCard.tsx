/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — twin of
 * src/components/wallet/mobile/MobileWalletBalanceCard.tsx: icon disc, title
 * (+ an accessory such as the currency toggle), balance, sub-balance and
 * change, a chevron when the card is pressable, and the skeleton while
 * loading. Also used for the balance detail's account cards (the web
 * `WalletBalanceCard`, which adds a status and a description line).
 */
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, CardContent, Icon, PressableRow, Skeleton, Text, useUITheme } from '../../../ports/ui';
import { radius } from '../../../ports/tokens';

export type BalanceCardType = 'tokens' | 'cash' | 'credits';

export type BalanceCardProps = {
  type: BalanceCardType;
  title: string;
  balance: string;
  subBalance?: string;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  status?: string;
  description?: string;
  isLoading?: boolean;
  onPress?: () => void;
  accessory?: ReactNode;
  /** Overrides the cash glyph (Euro vs DollarSign). */
  icon?: string;
  testID?: string;
};

export function BalanceCard({ type, title, balance, subBalance, change, changeType = 'neutral', status, description, isLoading, onPress, accessory, icon, testID }: BalanceCardProps): ReactElement {
  const { colors } = useUITheme();
  const glyph = type === 'tokens' ? 'Coins' : type === 'cash' ? (icon ?? 'DollarSign') : 'CreditCard';
  const tone = type === 'tokens' ? colors.statusWarning : type === 'cash' ? colors.statusSuccess : colors.primary;
  const toneBg = type === 'tokens' ? colors.statusWarningSubtle : type === 'cash' ? colors.statusSuccessSubtle : colors.muted;
  const changeColor = changeType === 'increase' ? colors.statusSuccess : changeType === 'decrease' ? colors.statusError : colors.mutedForeground;

  if (isLoading) {
    return (
      <Card testID={testID}>
        <CardContent style={styles.content}>
          <View style={styles.row} testID={testID ? `${testID}-loading` : undefined}>
            <Skeleton style={styles.disc} />
            <View style={styles.fill}>
              <Skeleton style={styles.lineShort} />
              <Skeleton style={styles.lineLong} />
            </View>
          </View>
        </CardContent>
      </Card>
    );
  }

  const body = (
    <View style={styles.row}>
      <View style={[styles.disc, { backgroundColor: toneBg }]}>
        <Icon name={glyph} size={20} color={tone} />
      </View>
      <View style={styles.fill}>
        <View style={styles.titleRow}>
          <Text variant="caption" muted numberOfLines={1} style={styles.fill}>
            {title}
          </Text>
          {accessory}
          {status ? (
            <Text variant="label" color={colors.statusSuccess}>
              {status}
            </Text>
          ) : null}
        </View>
        <Text weight="600" size="lg" numberOfLines={1}>
          {balance}
        </Text>
        {subBalance || change ? (
          <View style={styles.subRow}>
            {subBalance ? (
              <Text variant="caption" muted>
                {subBalance}
              </Text>
            ) : null}
            {change ? (
              <Text variant="caption" color={changeColor}>
                {change}
              </Text>
            ) : null}
          </View>
        ) : null}
        {description ? (
          <Text variant="caption" muted>
            {description}
          </Text>
        ) : null}
      </View>
      {onPress ? <Icon name="ChevronRight" size={20} color={colors.mutedForeground} /> : null}
    </View>
  );

  return (
    <Card testID={testID}>
      <CardContent style={styles.content}>
        {onPress ? (
          <PressableRow onPress={onPress} accessibilityLabel={title} testID={testID ? `${testID}-press` : undefined}>
            {body}
          </PressableRow>
        ) : (
          body
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fill: { flex: 1, minWidth: 0 },
  disc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  lineShort: { height: 14, width: 96, borderRadius: radius.sm, marginBottom: 8 },
  lineLong: { height: 22, width: 128, borderRadius: radius.sm },
});
