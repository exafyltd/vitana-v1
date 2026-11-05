/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — twin of
 * src/components/wallet/CurrencyToggle.tsx: the compact $ / € segmented switch
 * on the cash balance card. Each segment is its own pressable, so a toggle
 * never fires the surrounding card's onPress (web stopPropagation).
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableRow, Text, useUITheme } from '../../../ports/ui';
import { getCurrencySymbol, type DisplayCurrency } from '../../../ports/wallet';
import { useI18n } from '../../../i18n/I18nProvider';

const OPTIONS: DisplayCurrency[] = ['USD', 'EUR'];

export function CurrencyToggle({ value, onChange }: { value: DisplayCurrency; onChange: (next: DisplayCurrency) => void }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useI18n();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('wallet.displayCurrency')} style={[styles.group, { backgroundColor: colors.background }]}>
      {OPTIONS.map((opt) => {
        const active = value === opt;
        return (
          <PressableRow
            key={opt}
            testID={`wallet-currency-${opt}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={opt}
            onPress={() => onChange(opt)}
            style={[styles.option, active ? { backgroundColor: colors.primary } : null]}
          >
            <Text variant="label" color={active ? colors.primaryForeground : colors.mutedForeground}>
              {getCurrencySymbol(opt)}
            </Text>
          </PressableRow>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', borderRadius: 999, padding: 2, gap: 0 },
  option: { height: 24, width: 28, borderRadius: 999, justifyContent: 'center', gap: 0 },
});
