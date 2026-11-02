/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) —
 * `/health/conditions` (HEALTH.CONDITIONS), twin of the phone branch of
 * `src/pages/health/ConditionsRisks.tsx:45-83`: the health sub-navigation, the
 * ⚠ header and the two condition cards (risk assessments, preventive plans).
 * The cards have no handler on the web (ConditionsRisks.tsx:64), so they are
 * not pressable here. The header description is a literal on the web
 * (ConditionsRisks.tsx:54); natively it is the `healthNative` catalog key.
 * No health data is read.
 */
import { View } from 'react-native';
import { Text } from '../../ports/ui';
import { useHealthPalette, type Hue } from '../../ports/health-plans';
import { useI18n } from '../../i18n/I18nProvider';
import { HealthPanel, HealthScaffold, IconTile, StandardHeader, healthStyles } from './plans-services/components';

/** ConditionsRisks.tsx:14-17. */
const ITEMS: ReadonlyArray<{ id: string; titleKey: string; descKey: string; icon: string; hue: Hue }> = [
  { id: 'risk', titleKey: 'screens.health.riskAssessments', descKey: 'screens.health.conditionsSubtitle_riskTools', icon: 'AlertTriangle', hue: 'orange' },
  { id: 'preventive', titleKey: 'screens.health.conditionsTitle_preventivePlans', descKey: 'screens.health.conditionsSubtitle_preventivePlans', icon: 'FileText', hue: 'green' },
];

export function ConditionsRisksScreen() {
  const { t } = useI18n();
  const palette = useHealthPalette();
  return (
    <HealthScaffold activePath="/health/conditions" testID="screen-health-conditions">
      <StandardHeader emoji="⚠" title={t('screens.health.takeControlYourHealthRisks')} description={t('healthNative.conditions.description')} />
      <View style={healthStyles.list}>
        {ITEMS.map((item) => (
          <HealthPanel key={item.id} testID={`health-condition-${item.id}`}>
            <IconTile name={item.icon} tint={palette.hue[item.hue]} />
            <Text size="lg" weight="600">
              {t(item.titleKey)}
            </Text>
            <Text size="sm" muted>
              {t(item.descKey)}
            </Text>
          </HealthPanel>
        ))}
      </View>
    </HealthScaffold>
  );
}
