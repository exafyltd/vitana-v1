/**
 * VTID-05461 — twin of `src/components/journey/JourneyHowItWorks.tsx`: the
 * Guided-Mode "how it works" card (guided journey vs. session catalog; the
 * catalog tile scrolls to the session list) and the violet "click the
 * session" card. Presentational; all copy from the catalog.
 */
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { alpha, JourneyIcon, useToneColor } from '../../ports/journey';
import { useI18n } from '../../i18n/I18nProvider';
import { JourneyCard } from './components';

export function JourneyHowItWorks({ onScrollToSessions }: { onScrollToSessions: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  const pink = useToneColor('category-4');
  const blue = useToneColor('category-7');
  return (
    <View style={styles.wrap} testID="journey-how-it-works">
      <JourneyCard tint={violet} radius={24}>
        <Text weight="700" accessibilityRole="header" style={styles.center}>
          {t('screens.guidedCatalog.howItWorksTitle')}
        </Text>
        <View style={styles.grid}>
          <View style={styles.col}>
            <View style={[styles.circle, { backgroundColor: alpha(violet, 0.4) }]}>
              <JourneyIcon name="BookOpen" size={28} color={colors.primaryForeground} />
            </View>
            <Text size="sm" weight="700" color={blue} style={styles.center}>
              {t('screens.guidedCatalog.howItWorksJourneyTitle')}
            </Text>
            <Text size="xs" muted style={styles.center}>
              {t('screens.guidedCatalog.howItWorksJourneyBody')}
            </Text>
          </View>
          <Pressable testID="journey-how-catalog" accessibilityRole="button" onPress={onScrollToSessions} style={styles.col}>
            <View style={[styles.circle, { backgroundColor: alpha(blue, 0.4) }]}>
              <JourneyIcon name="Search" size={28} color={colors.primaryForeground} />
            </View>
            <Text size="sm" weight="700" color={blue} style={styles.center}>
              {t('screens.guidedCatalog.howItWorksCatalogTitle')}
            </Text>
            <Text size="xs" muted style={styles.center}>
              {t('screens.guidedCatalog.howItWorksCatalogBody')}
            </Text>
          </Pressable>
        </View>
      </JourneyCard>

      <View style={[styles.click, { backgroundColor: alpha(violet, 0.22) }]}>
        <View style={[styles.clickBadge, { backgroundColor: colors.card, borderColor: alpha(violet, 0.25) }]}>
          <JourneyIcon name="MousePointerClick" size={24} color={violet} />
        </View>
        <Text size="lg" weight="700" color={violet} accessibilityRole="header" style={styles.center}>
          {t('screens.guidedCatalog.clickSessionTitle')}
        </Text>
        <Text size="sm" weight="500" color={alpha(violet, 0.8)} style={styles.center}>
          {t('screens.guidedCatalog.clickSessionBody')}
        </Text>
        <View style={[styles.clickPill, { backgroundColor: alpha(colors.card, 0.95) }]}>
          <Text size="sm" weight="600" color={violet} numberOfLines={1}>
            {t('screens.guidedCatalog.clickSessionPill')}
          </Text>
          <JourneyIcon name="Heart" size={14} color={pink} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  center: { textAlign: 'center' },
  grid: { flexDirection: 'row', gap: 16, marginTop: 16 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  click: { marginTop: 32, borderRadius: 24, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 36, alignItems: 'center', gap: 6 },
  clickBadge: { position: 'absolute', top: -24, alignSelf: 'center', width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  clickPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginTop: 6, maxWidth: '100%' },
});
