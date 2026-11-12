/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — `/staff/tasks`,
 * `/schedule`, `/reports`, `/communications`, `/tools` and `/time`: the web's
 * `ComingSoonPlaceholder` (src/components/patient/ComingSoonPlaceholder.tsx),
 * mounted at src/App.tsx:1769-1810 with the icon + title key below; phone
 * branch (`p-6` body; Spotlight is desktop-only): the `text-3xl` title, then
 * the dashed box with the icon at 50 % opacity, the "coming soon" title and
 * body. No data source exists for these six screens, so none is fetched.
 *
 * The box copy is the web's `screens.patient.comingSoon.*` text, carried in
 * `staffNative.comingSoon.*`: the web shard holds it in English for eight of
 * the eleven locales (sr fr pl pt ru tr zh ar), the native shard has it in
 * all eleven (DE identical to the web's German).
 */
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { StaffIcon, type StaffGlyph } from '../../ports/staff-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { StaffGate } from './StaffGate';

export type StaffComingSoonRoute = 'tasks' | 'schedule' | 'reports' | 'communications' | 'tools' | 'time';

/** src/App.tsx:1769-1810 — `icon` + `titleKey` per route. */
export const STAFF_COMING_SOON: Record<StaffComingSoonRoute, { icon: StaffGlyph; titleKey: string }> = {
  tasks: { icon: 'Activity', titleKey: 'screens.common.dailyTasks' },
  schedule: { icon: 'Calendar', titleKey: 'screens.common.schedule' },
  reports: { icon: 'BarChart3', titleKey: 'screens.common.reports' },
  communications: { icon: 'MessageSquare', titleKey: 'screens.common.communications' },
  tools: { icon: 'Zap', titleKey: 'screens.common.staffTools' },
  time: { icon: 'Clock', titleKey: 'screens.common.timeTracking' },
};

function ComingSoon({ route }: { route: StaffComingSoonRoute }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { icon, titleKey } = STAFF_COMING_SOON[route];
  return (
    <ScrollView testID={`screen-staff-${route}`} contentContainerStyle={styles.page}>
      <Text size="2xl" weight="700" accessibilityRole="header">
        {t(titleKey)}
      </Text>
      <View testID="staff-coming-soon" style={[styles.box, { borderColor: colors.border }]}>
        <StaffIcon name={icon} size={40} color={colors.mutedForeground} opacity={0.5} />
        <Text weight="500" muted style={styles.center}>
          {t('staffNative.comingSoon.title')}
        </Text>
        <Text size="sm" muted style={[styles.center, styles.body]}>
          {t('staffNative.comingSoon.body')}
        </Text>
      </View>
    </ScrollView>
  );
}

export function StaffComingSoonScreen({ route }: { route: StaffComingSoonRoute }): ReactElement {
  return (
    <StaffGate>
      <ComingSoon route={route} />
    </StaffGate>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24 },
  box: { marginTop: 32, alignItems: 'center', gap: 12, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 64, paddingHorizontal: 16 },
  center: { textAlign: 'center' },
  body: { maxWidth: 384 },
});
