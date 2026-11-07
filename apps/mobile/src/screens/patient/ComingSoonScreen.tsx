/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/care-team`,
 * `/patient/goals`, `/patient/insurance` and `/patient/notifications`: the
 * web's `ComingSoonPlaceholder` (src/components/patient/ComingSoonPlaceholder.tsx,
 * mounted at src/App.tsx:1661-1688 with the icon + title key below), phone
 * branch (`p-6` body): the `text-3xl` title, then the dashed box with the
 * icon at 50 % opacity, "coming soon" title and body. No data source exists
 * for these four screens, so none is fetched.
 */
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { PatientIcon, type PatientGlyph } from '../../ports/patient-ui';
import { useI18n } from '../../i18n/I18nProvider';

export type ComingSoonRoute = 'care-team' | 'goals' | 'insurance' | 'notifications';

/** src/App.tsx:1661-1688 — `icon` + `titleKey` per route. */
export const COMING_SOON: Record<ComingSoonRoute, { icon: PatientGlyph; titleKey: string }> = {
  'care-team': { icon: 'Users', titleKey: 'screens.common.careTeam' },
  goals: { icon: 'ClipboardCheck', titleKey: 'screens.common.healthGoals' },
  insurance: { icon: 'ShieldCheck', titleKey: 'screens.common.insurance' },
  notifications: { icon: 'Bell', titleKey: 'screens.common.notifications' },
};

export function ComingSoonScreen({ route }: { route: ComingSoonRoute }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { icon, titleKey } = COMING_SOON[route];
  return (
    <ScrollView testID={`screen-patient-${route}`} contentContainerStyle={styles.page}>
      <Text size="2xl" weight="700" accessibilityRole="header">
        {t(titleKey)}
      </Text>
      <View testID="patient-coming-soon" style={[styles.box, { borderColor: colors.border }]}>
        <PatientIcon name={icon} size={40} color={colors.mutedForeground} opacity={0.5} />
        <Text weight="500" muted style={styles.center}>
          {t('screens.patient.comingSoon.title')}
        </Text>
        <Text size="sm" muted style={[styles.center, styles.body]}>
          {t('screens.patient.comingSoon.body')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24 },
  box: { marginTop: 32, alignItems: 'center', gap: 12, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 64, paddingHorizontal: 16 },
  center: { textAlign: 'center' },
  body: { maxWidth: 384 },
});
