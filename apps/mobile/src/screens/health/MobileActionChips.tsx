/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the header chips
 * of the mobile-web action rail, twins of `src/components/mobile/MobileActionChips.tsx`
 * (`VitanaIndexChip`, `AutopilotChip`) and `src/components/health/VitanaIndexValue.tsx`.
 * This lane owns them (plan decision 3); other lanes reach them through
 * src/ports/health-data.ts.
 *
 * The Index chip reads the ONE Vitana Index query (no extra subscription per
 * mount point, like the web provider) and opens the Index sheet on the
 * overlay bus (`vitana:open-index`). The web streak badge reads a
 * localStorage day log (`useVitanaStreaks.ts`) that nothing on the native app
 * writes yet, so the streak is 0 and the badge stays hidden (web
 * `showStreak = streakDays >= 3`).
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { HealthIcon, withAlpha } from '../../ports/health';
import { useHealthText } from './text';
import { useVitanaIndex } from './data/vitana-index';
import { openVitanaIndex } from './events';

/** The numeric Index, or "…" while loading / without a score (VitanaIndexValue.tsx:8-12). */
export function VitanaIndexValue(): ReactElement {
  const { index, isLoading } = useVitanaIndex();
  return <>{isLoading || !index ? '…' : String(index.total)}</>;
}

export function VitanaIndexChip(): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  return (
    <View style={styles.wrap}>
      <Button
        testID="vitana-index-chip"
        variant="ghost"
        size="sm"
        onPress={openVitanaIndex}
        accessibilityLabel={t('healthNative.chip.openIndex')}
        style={[styles.chip, { backgroundColor: withAlpha(colors.muted, 0.6) }]}
      >
        <Text size="xs">🧬</Text>
        <Text size="sm" weight="500" color={colors.primary}>
          <VitanaIndexValue />
        </Text>
      </Button>
    </View>
  );
}

export function AutopilotChip({ pendingCount, onPress }: { pendingCount: number; onPress: () => void }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  return (
    <View style={styles.wrap}>
      <Button testID="autopilot-chip" variant="ghost" size="sm" onPress={onPress} style={[styles.chip, { backgroundColor: withAlpha(colors.muted, 0.6) }]}>
        <HealthIcon name="Plane" size={16} color={colors.mutedForeground} />
        <Text size="sm">{t('actionBar.autopilot')}</Text>
      </Button>
      {pendingCount > 0 ? (
        <View testID="autopilot-chip-badge" pointerEvents="none" style={[styles.badge, { backgroundColor: colors.destructive }]}>
          <Text weight="600" color={colors.destructiveForeground} style={styles.badgeText}>
            {String(pendingCount)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', flexShrink: 0 },
  chip: { height: 36, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { position: 'absolute', top: -4, end: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
