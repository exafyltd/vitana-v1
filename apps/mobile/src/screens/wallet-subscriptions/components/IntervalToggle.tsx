/**
 * VTID-05425 — the month / year switch both plan grids carry (web
 * PlansGridHeadline / PlansGridExpanded `role="tablist"`). The labels are the
 * web's: `billing.plans.perMonth` / `perYear` with the slash removed.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableRow, Text, useUITheme } from '../../../ports/ui';
import { useI18n } from '../../../i18n/I18nProvider';

export type Interval = 'month' | 'year';

export function IntervalToggle({ value, onChange, testID }: { value: Interval; onChange: (next: Interval) => void; testID: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tab = (interval: Interval, label: string) => {
    const selected = value === interval;
    return (
      <PressableRow
        key={interval}
        testID={`${testID}-${interval}`}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPress={() => onChange(interval)}
        style={[styles.tab, selected ? { backgroundColor: colors.background } : null]}
      >
        <Text size="xs" weight={selected ? '600' : '400'}>
          {label}
        </Text>
      </PressableRow>
    );
  };
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={t('walletSubscriptionsNative.intervalAria')}
      style={[styles.list, { backgroundColor: colors.muted }]}
    >
      {tab('month', t('billing.plans.perMonth').replace('/', ''))}
      {tab('year', t('billing.plans.perYear').replace('/', ''))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', borderRadius: 6, padding: 2, alignSelf: 'flex-start' },
  tab: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, gap: 0 },
});
