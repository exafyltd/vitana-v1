/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/health`,
 * the phone branch of src/pages/patient/Health.tsx (Spotlight is desktop
 * only, src/hooks/useSpotlightEnabled.ts). Same three cards (vital signs,
 * activity, progress) and the health timeline, in the web's order and with
 * the web's sample figures — the web screen has no data source either, so
 * nothing is fetched. Figures go through the locale number formatter and the
 * `patientNative.figure.*` patterns instead of hardcoded literals.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, CardContent, CardHeader, CardTitle, useUITheme } from '../../ports/ui';
import { PatientIcon, useCategoryColor } from '../../ports/patient-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { MetricRow, PatientPage, Panel, TimelineRow } from './components';
import { formatNumber } from './format';

function IconTitle({ icon, children }: { icon: ReactElement; children: string }): ReactElement {
  return (
    <View style={styles.iconTitle}>
      {icon}
      <CardTitle style={styles.shrink}>{children}</CardTitle>
    </View>
  );
}

export function HealthScreen(): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const category3 = useCategoryColor(3);
  const n = (v: number) => formatNumber(v, locale);
  const fraction = (value: number, total: number) => t('patientNative.figure.fraction', { value: n(value), total: n(total) });
  return (
    <PatientPage testID="screen-patient-health" title={t('screens.patient.myHealth')} subtitle={t('screens.patient.trackManageYourHealthMetricsWellness')}>
      <View style={styles.grid}>
        <Card testID="patient-health-vitals">
          <CardHeader>
            <IconTitle icon={<PatientIcon name="Heart" size={20} color={colors.statusError} />}>{t('screens.patient.vitalSigns')}</IconTitle>
          </CardHeader>
          <CardContent style={styles.rows}>
            <MetricRow label={t('screens.patient.bloodPressure')} value={t('patientNative.figure.bloodPressure', { systolic: n(120), diastolic: n(80) })} />
            <MetricRow label={t('screens.patient.heartRate')} value={t('screens.patient.text72Bpm')} />
            <MetricRow label={t('screens.patient.weight')} value={t('screens.patient.text165Lbs')} />
          </CardContent>
        </Card>

        <Card testID="patient-health-activity">
          <CardHeader>
            <IconTitle icon={<PatientIcon name="Activity" size={20} color={category3} />}>{t('screens.patient.activity')}</IconTitle>
          </CardHeader>
          <CardContent style={styles.rows}>
            <MetricRow label={t('screens.patient.stepsToday')} value={n(8247)} />
            <MetricRow label={t('screens.patient.activeMinutes')} value={t('screens.patient.text45Min')} />
            <MetricRow label={t('screens.patient.caloriesBurned')} value={n(342)} />
          </CardContent>
        </Card>

        <Card testID="patient-health-progress">
          <CardHeader>
            <IconTitle icon={<PatientIcon name="TrendingUp" size={20} color={colors.statusSuccess} />}>{t('screens.patient.progress')}</IconTitle>
          </CardHeader>
          <CardContent style={styles.rows}>
            <MetricRow label={t('screens.patient.weeklyGoals')} value={fraction(7, 10)} />
            <MetricRow label={t('screens.patient.healthScore')} value={fraction(85, 100)} />
            <MetricRow label={t('screens.patient.trend')} value={t('screens.patient.improving')} variant="default" />
          </CardContent>
        </Card>
      </View>

      <Panel testID="patient-health-timeline" title={t('screens.patient.healthTimeline')} description={t('screens.patient.recentHealthEventsMilestones')}>
        <View style={styles.timeline}>
          <TimelineRow dot={colors.statusSuccess} title={t('screens.patient.bloodPressureRecorded')} caption={t('screens.patient.todayAt830Am')} />
          <TimelineRow dot={category3} title={t('screens.patient.completedWorkout')} caption={t('screens.patient.yesterday45MinCardioSession')} />
          <TimelineRow dot={colors.statusWarning} title={t('screens.patient.medicationTaken')} caption={t('screens.patient.text2DaysAgoDailyVitamins')} />
        </View>
      </Panel>
    </PatientPage>
  );
}

const styles = StyleSheet.create({
  iconTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shrink: { flexShrink: 1 },
  grid: { gap: 16 },
  rows: { gap: 8 },
  timeline: { gap: 16 },
});
