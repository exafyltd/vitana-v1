/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) —
 * `/health/pillars` (HEALTH.PILLARS), twin of the phone branch of
 * `src/pages/health/PillarsOfHealth.tsx:58-107`: the health sub-navigation,
 * the welcome header, the small Vitana Index tile (the member's current
 * `score_total`, "…" while loading — VitanaIndexValue.tsx:10-13) and the five
 * pillar cards. The tile goes where the web tile goes: `/health-tracker/vitana-index`
 * redirects to `/health/my-health-tracker` and on to `/health`
 * (src/App.tsx:1169,1173), so the native tile opens `/health`. The pillar
 * cards have no handler on the web (no onClick, PillarsOfHealth.tsx:91), so
 * they are not pressable here either.
 */
import { StyleSheet, View } from 'react-native';
import { PressableRow, Text, useUITheme } from '../../ports/ui';
import { useHealthPalette, type Hue } from '../../ports/health-plans';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { HealthPanel, HealthScaffold, IconTile, healthStyles } from './plans-services/components';
import { useVitanaIndexTotal } from './plans-services/data';

/** PillarsOfHealth.tsx:16-22 (icon + the leading hue of each tile gradient). */
const PILLARS: ReadonlyArray<{ id: string; icon: string; hue: Hue }> = [
  { id: 'hydration', icon: 'Droplets', hue: 'blue' },
  { id: 'nutrition', icon: 'Apple', hue: 'green' },
  { id: 'exercise', icon: 'Dumbbell', hue: 'orange' },
  { id: 'sleep', icon: 'Moon', hue: 'purple' },
  { id: 'mental', icon: 'Brain', hue: 'pink' },
];

export function PillarsOfHealthScreen() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const { total, isLoading } = useVitanaIndexTotal();

  return (
    <HealthScaffold activePath="/health/pillars" testID="screen-health-pillars">
      <View style={[styles.welcome, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text variant="title" accessibilityRole="header">
          {t('screens.health.buildYourFoundationForWellness')}
        </Text>
        <Text muted>{t('screens.health.exploreFiveFundamentalPillarsHealthDiscover')}</Text>
      </View>
      <PressableRow
        onPress={() => navigateToWebPath('/health')}
        accessibilityRole="link"
        accessibilityLabel={t('vitanaIndex.title')}
        testID="health-pillars-index"
        style={[styles.indexPanel, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.indexCircle, { backgroundColor: palette.successSubtle }]}>
          <Text size="xl" weight="700" color={palette.success} testID="health-pillars-index-value">
            {isLoading || total === null ? '…' : String(total)}
          </Text>
        </View>
      </PressableRow>
      <View style={healthStyles.list}>
        {PILLARS.map((p) => (
          <HealthPanel key={p.id} testID={`health-pillar-${p.id}`}>
            <IconTile name={p.icon} tint={palette.hue[p.hue]} />
            <Text size="lg" weight="600">
              {t(`screens.health.pillar_${p.id}_title`)}
            </Text>
            <Text size="sm" muted>
              {t(`screens.health.pillar_${p.id}_desc`)}
            </Text>
          </HealthPanel>
        ))}
      </View>
    </HealthScaffold>
  );
}

const styles = StyleSheet.create({
  welcome: { borderWidth: 1, borderRadius: 16, padding: 24, gap: 8 },
  indexPanel: { alignSelf: 'flex-start', width: 128, borderWidth: 1, borderRadius: 16, padding: 24, justifyContent: 'center' },
  indexCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
});
