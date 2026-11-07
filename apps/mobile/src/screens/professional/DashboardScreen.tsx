/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) —
 * `/professional/dashboard`, src/pages/professional/Dashboard.tsx, phone
 * branch (`p-6 pb-28 space-y-6`; Spotlight is desktop-only,
 * useSpotlightEnabled.ts): the header, the four stat cards (one column on a
 * phone), "Today's schedule" with three appointment rows and an outline time
 * badge each, and "Quick actions" with three outline buttons. The web screen
 * fetches nothing and its figures and rows are fixed copy from the catalog;
 * so is this one. The quick-action buttons have no `onClick` on the web
 * (Dashboard.tsx:111-122), so they have no `onPress` here either.
 * Behind the `ProtectedRoute requiredRole="professional"` twin.
 */
import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Text, useUITheme } from '../../ports/ui';
import { ProfessionalIcon, type ProfessionalGlyph } from '../../ports/professional-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { ProfessionalGate } from './ProfessionalGate';
import { formatCount, formatUsd } from './format';

function StatCard({ testID, title, icon, value, caption }: { testID: string; title: string; icon: ProfessionalGlyph; value: string; caption: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Card testID={testID}>
      <CardHeader style={styles.statHeader}>
        <Text size="sm" weight="500" style={styles.flex}>
          {title}
        </Text>
        <ProfessionalIcon name={icon} size={16} color={colors.mutedForeground} />
      </CardHeader>
      <CardContent>
        <Text size="2xl" weight="700">
          {value}
        </Text>
        <Text size="xs" muted>
          {caption}
        </Text>
      </CardContent>
    </Card>
  );
}

function Panel({ testID, title, description, children, gap }: { testID: string; title: string; description: string; children: ReactNode; gap: number }): ReactElement {
  return (
    <Card testID={testID}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent style={{ gap }}>{children}</CardContent>
    </Card>
  );
}

function AppointmentRow({ testID, name, kind, time }: { testID: string; name: string; kind: string; time: string }): ReactElement {
  return (
    <View testID={testID} style={styles.row}>
      <View style={styles.flex}>
        <Text size="sm" weight="500">
          {name}
        </Text>
        <Text size="xs" muted>
          {kind}
        </Text>
      </View>
      <Badge variant="outline">{time}</Badge>
    </View>
  );
}

function QuickAction({ icon, label }: { icon: ProfessionalGlyph; label: string }): ReactElement {
  return (
    <Button variant="outline" style={styles.startButton}>
      <ProfessionalIcon name={icon} size={16} />
      {label}
    </Button>
  );
}

function Dashboard(): ReactElement {
  const { t, language } = useI18n();
  return (
    <ScrollView testID="screen-professional-dashboard" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text size="2xl" weight="700" accessibilityRole="header">
          {t('screens.professional.professionalDashboard')}
        </Text>
        <Text muted>{t('screens.professional.yourHealthcarePracticeManagementCenter')}</Text>
      </View>

      <View testID="professional-dashboard-stats" style={styles.stats}>
        <StatCard
          testID="professional-stat-patients"
          title={t('screens.professional.todaySPatients')}
          icon="Users"
          value={formatCount(12, language)}
          caption={t('screens.professional.text3PendingAppointments')}
        />
        <StatCard
          testID="professional-stat-next"
          title={t('screens.professional.nextAppointment')}
          icon="Calendar"
          value={t('screens.professional.text230Pm')}
          caption={t('screens.professional.sarahJohnsonFollowup')}
        />
        <StatCard
          testID="professional-stat-reviews"
          title={t('screens.professional.patientReviews')}
          icon="Activity"
          value={formatCount(5, language)}
          caption={t('screens.professional.pendingClinicalReviews')}
        />
        <StatCard
          testID="professional-stat-revenue"
          title={t('screens.professional.monthlyRevenue')}
          icon="DollarSign"
          value={formatUsd(24500, language)}
          caption={t('screens.professional.text12FromLastMonth')}
        />
      </View>

      <View style={styles.panels}>
        <Panel testID="professional-dashboard-schedule" title={t('screens.professional.todaySSchedule')} description={t('screens.professional.yourAppointmentsForToday')} gap={16}>
          <AppointmentRow testID="professional-appointment-1" name={t('screens.professional.johnDoe')} kind={t('screens.professional.annualCheckup')} time={t('screens.professional.text900Am')} />
          <AppointmentRow testID="professional-appointment-2" name={t('screens.professional.sarahJohnson')} kind={t('screens.professional.followup')} time={t('screens.professional.text230Pm')} />
          <AppointmentRow testID="professional-appointment-3" name={t('screens.professional.mikeWilson')} kind={t('screens.professional.labResultsReview')} time={t('screens.professional.text400Pm')} />
        </Panel>

        <Panel testID="professional-dashboard-quick-actions" title={t('screens.professional.quickActions')} description={t('screens.professional.commonProfessionalTasks')} gap={12}>
          <QuickAction icon="Users" label={t('screens.professional.viewPatientList')} />
          <QuickAction icon="Calendar" label={t('screens.professional.manageSchedule')} />
          <QuickAction icon="Activity" label={t('screens.professional.clinicalTools')} />
        </Panel>
      </View>
    </ScrollView>
  );
}

export function ProfessionalDashboardScreen(): ReactElement {
  return (
    <ProfessionalGate>
      <Dashboard />
    </ProfessionalGate>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 24 },
  header: { gap: 8 },
  stats: { gap: 16 },
  statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  panels: { gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1 },
  startButton: { alignSelf: 'stretch', justifyContent: 'flex-start', gap: 8 },
});
