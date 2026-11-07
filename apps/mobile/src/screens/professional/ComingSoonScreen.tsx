/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) —
 * `/professional/patients`, `/schedule`, `/tools`, `/referrals`, `/billing`,
 * `/profile` and `/education`: the web's `ComingSoonPlaceholder`
 * (src/components/patient/ComingSoonPlaceholder.tsx), mounted at
 * src/App.tsx:1711-1752 and by src/pages/professional/Patients.tsx with the
 * icon + title key below; phone branch (`p-6` body; Spotlight is
 * desktop-only): the `text-3xl` title, then the dashed box with the icon at
 * 50 % opacity, the "coming soon" title and body. No data source exists for
 * these seven screens (Patients.tsx:1-14), so none is fetched.
 *
 * The box copy is the web's `screens.patient.comingSoon.*` text, carried in
 * `professionalNative.comingSoon.*`: the web shard holds it in English for
 * eight of the eleven locales (sr fr pl pt ru tr zh ar), the native shard has it in all eleven
 * (DE identical to the web's German).
 */
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { ProfessionalIcon, type ProfessionalGlyph } from '../../ports/professional-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { ProfessionalGate } from './ProfessionalGate';

export type ProfessionalComingSoonRoute = 'patients' | 'schedule' | 'tools' | 'referrals' | 'billing' | 'profile' | 'education';

/** src/App.tsx:1711-1752 + Patients.tsx:20 — `icon` + `titleKey` per route. */
export const PROFESSIONAL_COMING_SOON: Record<ProfessionalComingSoonRoute, { icon: ProfessionalGlyph; titleKey: string }> = {
  patients: { icon: 'Users', titleKey: 'screens.professional.myPatients' },
  schedule: { icon: 'Calendar', titleKey: 'screens.common.schedule' },
  tools: { icon: 'Stethoscope', titleKey: 'screens.common.clinicalTools' },
  referrals: { icon: 'FileText', titleKey: 'screens.common.referrals' },
  billing: { icon: 'Wallet', titleKey: 'screens.common.billing' },
  profile: { icon: 'UserCheck', titleKey: 'screens.common.professionalProfile' },
  education: { icon: 'BookOpen', titleKey: 'screens.common.continuingEducation' },
};

function ComingSoon({ route }: { route: ProfessionalComingSoonRoute }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { icon, titleKey } = PROFESSIONAL_COMING_SOON[route];
  return (
    <ScrollView testID={`screen-professional-${route}`} contentContainerStyle={styles.page}>
      <Text size="2xl" weight="700" accessibilityRole="header">
        {t(titleKey)}
      </Text>
      <View testID="professional-coming-soon" style={[styles.box, { borderColor: colors.border }]}>
        <ProfessionalIcon name={icon} size={40} color={colors.mutedForeground} opacity={0.5} />
        <Text weight="500" muted style={styles.center}>
          {t('professionalNative.comingSoon.title')}
        </Text>
        <Text size="sm" muted style={[styles.center, styles.body]}>
          {t('professionalNative.comingSoon.body')}
        </Text>
      </View>
    </ScrollView>
  );
}

export function ProfessionalComingSoonScreen({ route }: { route: ProfessionalComingSoonRoute }): ReactElement {
  return (
    <ProfessionalGate>
      <ComingSoon route={route} />
    </ProfessionalGate>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24 },
  box: { marginTop: 32, alignItems: 'center', gap: 12, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 64, paddingHorizontal: 16 },
  center: { textAlign: 'center' },
  body: { maxWidth: 384 },
});
