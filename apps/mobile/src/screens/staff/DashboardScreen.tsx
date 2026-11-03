/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — `/staff/dashboard`,
 * src/pages/staff/Dashboard.tsx, phone branch (`p-6 pb-28 space-y-6`;
 * Spotlight is desktop-only, useSpotlightEnabled.ts): the header, the four
 * stat cards (one column on a phone), "Pending tasks" with three rows and a
 * priority badge each (destructive "Urgent", outline "Normal" ×2), and
 * "Quick actions" with three outline buttons. The web screen fetches nothing
 * and its figures and rows are fixed copy from the catalog; so is this one.
 * The quick-action buttons have no `onClick` on the web (Dashboard.tsx:111-125),
 * so they have no `onPress` here either. Behind the
 * `ProtectedRoute requiredRole="staff"` twin.
 */
import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Text, useUITheme, type BadgeVariant } from '../../ports/ui';
import { StaffIcon, type StaffGlyph } from '../../ports/staff-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { StaffGate } from './StaffGate';
import { PageHeader, StatCard } from './parts';
import { formatCount, formatHours, formatRatio } from './format';

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

function TaskRow({ testID, title, detail, badge, variant }: { testID: string; title: string; detail: string; badge: string; variant: BadgeVariant }): ReactElement {
  return (
    <View testID={testID} style={styles.row}>
      <View style={styles.flex}>
        <Text size="sm" weight="500">
          {title}
        </Text>
        <Text size="xs" muted>
          {detail}
        </Text>
      </View>
      <Badge testID={`staff-badge-${variant}`} variant={variant}>
        {badge}
      </Badge>
    </View>
  );
}

function QuickAction({ icon, label }: { icon: StaffGlyph; label: string }): ReactElement {
  return (
    <Button variant="outline" style={styles.startButton}>
      <StaffIcon name={icon} size={16} />
      {label}
    </Button>
  );
}

function Dashboard(): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const muted = colors.mutedForeground;
  return (
    <ScrollView testID="screen-staff-dashboard" contentContainerStyle={styles.page}>
      <PageHeader title={t('screens.staff.staffDashboard')} subtitle={t('screens.staff.yourDailyWorkflowTaskManagementCenter')} />

      <View testID="staff-dashboard-stats" style={styles.stats}>
        <StatCard testID="staff-stat-queue" title={t('screens.staff.patientQueue')} icon="ClipboardList" iconColor={muted} value={formatCount(8, language)} caption={t('screens.staff.patientsWaiting')} />
        <StatCard testID="staff-stat-hours" title={t('screens.staff.hoursToday')} icon="Clock" iconColor={muted} value={formatHours(6.5, language)} caption={t('screens.staff.text15hRemaining')} />
        <StatCard testID="staff-stat-tasks" title={t('screens.staff.tasksCompleted')} icon="Activity" iconColor={muted} value={formatRatio(12, 18, language)} caption={t('screens.staff.text6TasksRemaining')} />
        <StatCard testID="staff-stat-coverage" title={t('screens.staff.teamCoverage')} icon="Users" iconColor={muted} value={formatRatio(4, 5, language)} caption={t('screens.staff.staffDuty')} />
      </View>

      <View style={styles.panels}>
        <Panel testID="staff-dashboard-pending-tasks" title={t('screens.staff.pendingTasks')} description={t('screens.staff.yourAssignedTasksForToday')} gap={16}>
          <TaskRow testID="staff-task-1" title={t('screens.staff.patientCheckinAssistance')} detail={t('screens.staff.room3MrJohnson')} badge={t('screens.staff.urgent')} variant="destructive" />
          <TaskRow testID="staff-task-2" title={t('screens.staff.equipmentSanitization')} detail={t('screens.staff.examRooms14')} badge={t('screens.staff.normal')} variant="outline" />
          <TaskRow testID="staff-task-3" title={t('screens.staff.insuranceVerification')} detail={t('screens.staff.text3PendingCases')} badge={t('screens.staff.normal')} variant="outline" />
        </Panel>

        <Panel testID="staff-dashboard-quick-actions" title={t('screens.staff.quickActions')} description={t('screens.staff.commonStaffFunctions')} gap={12}>
          <QuickAction icon="ClipboardList" label={t('screens.staff.viewPatientQueue')} />
          <QuickAction icon="Clock" label={t('screens.staff.clockInout')} />
          <QuickAction icon="Activity" label={t('screens.staff.dailyTasks')} />
        </Panel>
      </View>
    </ScrollView>
  );
}

export function StaffDashboardScreen(): ReactElement {
  return (
    <StaffGate>
      <Dashboard />
    </StaffGate>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingBottom: 112, gap: 24 },
  stats: { gap: 16 },
  panels: { gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1 },
  startButton: { alignSelf: 'stretch', justifyContent: 'flex-start', gap: 8 },
});
