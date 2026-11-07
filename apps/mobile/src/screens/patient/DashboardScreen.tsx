/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/dashboard`,
 * the phone branch of src/pages/patient/Dashboard.tsx (Spotlight is desktop
 * only). Same order: header, the real "recent results" card
 * (`RecentResultsCard`: the member's three newest results from
 * `GET /patient/health-results`, row skeletons while loading, the empty line,
 * "view all" → `/patient/results`), the four KPI panels, recent activity and
 * quick actions. The KPI, activity and quick-action content is the web's
 * sample content (the web has no source for it and its quick-action buttons
 * have no handler, Dashboard.tsx:171-182); the native buttons are the same
 * inert buttons.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { PatientIcon } from '../../ports/patient-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { PatientPage, Panel, RowsSkeleton, StatPanel, TimelineRow } from './components';
import { usePatientHealthResults } from './data/hooks';
import { formatNumber, formatReportDate } from './format';

function RecentResultsCard(): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { data: results, isLoading } = usePatientHealthResults();
  const recent = (results ?? []).slice(0, 3);
  return (
    <Panel testID="patient-recent-results" title={t('screens.patient.results.recentResultsTitle')} description={t('screens.patient.results.subtitle')}>
      {isLoading ? (
        <RowsSkeleton rows={3} testID="patient-recent-results-loading" />
      ) : recent.length === 0 ? (
        <Text testID="patient-recent-results-empty" size="sm" muted>
          {t('screens.patient.results.empty')}
        </Text>
      ) : (
        recent.map((r) => (
          <View key={r.id} testID={`patient-recent-result-${r.id}`} style={styles.resultRow}>
            <PatientIcon name="FlaskConical" size={16} color={colors.mutedForeground} />
            <View style={styles.flex}>
              <Text size="sm" weight="500">
                {t('screens.patient.results.markerCount', { count: r.biomarkers.length })}
              </Text>
              <Text size="xs" muted>
                {formatReportDate(r.report_date ?? r.created_at, locale)}
              </Text>
            </View>
          </View>
        ))
      )}
      <Button testID="patient-recent-results-view-all" variant="outline" style={styles.startButton} onPress={() => navigateToWebPath('/patient/results')}>
        <PatientIcon name="TestTube" size={16} />
        {t('screens.patient.results.viewAll')}
      </Button>
    </Panel>
  );
}

export function DashboardScreen(): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const n = (v: number) => formatNumber(v, locale);
  const fraction = (value: number, total: number) => t('patientNative.figure.fraction', { value: n(value), total: n(total) });
  const kpiIcon = (name: 'Calendar' | 'Heart' | 'TestTube' | 'Target') => <PatientIcon name={name} size={16} color={colors.mutedForeground} />;
  return (
    <PatientPage testID="screen-patient-dashboard" title={t('screens.patient.patientDashboard')} subtitle={t('screens.patient.yourPersonalizedHealthManagementCenter')}>
      <RecentResultsCard />

      <View testID="patient-dashboard-kpis" style={styles.kpis}>
        <StatPanel title={t('screens.patient.nextAppointment')} icon={kpiIcon('Calendar')} value={t('screens.patient.tomorrow')} caption={t('screens.patient.drSmithAt200Pm')} />
        <StatPanel title={t('screens.patient.healthScore')} icon={kpiIcon('Heart')} value={fraction(85, 100)} caption={t('screens.patient.text5FromLastMonth')} />
        <StatPanel title={t('screens.patient.pendingResults')} icon={kpiIcon('TestTube')} value={n(2)} caption={t('screens.patient.bloodWorkXray')} />
        <StatPanel title={t('screens.patient.goalsProgress')} icon={kpiIcon('Target')} value={fraction(7, 10)} caption={t('screens.patient.weeklyGoalsCompleted')} />
      </View>

      <View style={styles.panels}>
        <Panel testID="patient-dashboard-activity" title={t('screens.patient.recentActivity')} description={t('screens.patient.yourLatestHealthActivities')}>
          <View style={styles.timeline}>
            <TimelineRow dot={colors.statusSuccess} title={t('screens.patient.completedDailyWalk')} caption={t('screens.patient.text2HoursAgo')} />
            <TimelineRow dot={colors.statusInfo} title={t('screens.patient.bloodPressureRecorded')} caption={t('screens.patient.yesterday')} />
            <TimelineRow dot={colors.statusWarning} title={t('screens.patient.medicationReminder')} caption={t('screens.patient.text3DaysAgo')} />
          </View>
        </Panel>

        <Panel testID="patient-dashboard-quick-actions" title={t('screens.patient.quickActions')} description={t('screens.patient.commonTasksShortcuts')}>
          <Button variant="outline" style={styles.startButton}>
            <PatientIcon name="Calendar" size={16} />
            {t('screens.patient.scheduleAppointment')}
          </Button>
          <Button variant="outline" style={styles.startButton}>
            <PatientIcon name="TestTube" size={16} />
            {t('screens.patient.viewTestResults')}
          </Button>
          <Button variant="outline" style={styles.startButton}>
            <PatientIcon name="Heart" size={16} />
            {t('screens.patient.logHealthData')}
          </Button>
        </Panel>
      </View>
    </PatientPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  startButton: { alignSelf: 'stretch', justifyContent: 'flex-start', gap: 8 },
  kpis: { gap: 16 },
  panels: { gap: 24 },
  timeline: { gap: 16 },
});
