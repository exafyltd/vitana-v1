/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — `/staff/queue`,
 * src/pages/staff/Queue.tsx, phone branch (`p-6 pb-28 space-y-6`; Spotlight
 * is desktop-only): the header, the four counters (Waiting / In progress /
 * Urgent / Completed, each icon in its status tone), then "Current queue"
 * with three cards — a 4 px start border in the status tone, the tinted
 * avatar initials, name (one line, truncated) and reason, the status badge,
 * the wrapping metadata line and, below it on a phone (VTID-04001), the
 * actions sharing the row width (`flex-1`). The web shows demo copy from the
 * catalog — there is no backing table for a staff patient queue (Queue.tsx:11-16)
 * — so nothing is fetched. The buttons have no `onClick` on the web
 * (Queue.tsx:107-108, 138-139, 169), so they have no `onPress` here either.
 * Behind the `ProtectedRoute requiredRole="staff"` twin.
 */
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Text, useUITheme, type BadgeVariant } from '../../ports/ui';
import { StaffAvatar } from '../../ports/staff-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { StaffGate } from './StaffGate';
import { PageHeader, StatCard } from './parts';
import { formatCount } from './format';

type Tone = 'error' | 'warning' | 'info';

type QueueEntry = {
  tone: Tone;
  initials: string;
  name: string;
  reason: string;
  badge: string;
  variant: BadgeVariant;
  meta: [string, string, string];
  /** `[label, primary?]` — the web's default (`Call Patient`) or outline button. */
  actions: Array<[string, boolean]>;
};

/** Queue.tsx:83-178, in order. */
const ENTRIES: QueueEntry[] = [
  {
    tone: 'error',
    initials: 'screens.staff.jd',
    name: 'screens.staff.johnDoe',
    reason: 'screens.staff.walkinChestPain',
    badge: 'screens.staff.urgent2',
    variant: 'destructive',
    meta: ['screens.staff.arrived1015Am', 'screens.staff.waitTime45Min', 'screens.staff.roomTriage'],
    actions: [
      ['screens.staff.callPatient', true],
      ['screens.staff.assignRoom', false],
    ],
  },
  {
    tone: 'warning',
    initials: 'screens.staff.sj',
    name: 'screens.staff.sarahJohnson',
    reason: 'screens.staff.appointmentFollowup',
    badge: 'screens.staff.waiting2',
    variant: 'outline',
    meta: ['screens.staff.arrived1030Am', 'screens.staff.waitTime30Min', 'screens.staff.roomWaitingArea'],
    actions: [
      ['screens.staff.callPatient', true],
      ['screens.staff.assignRoom', false],
    ],
  },
  {
    tone: 'info',
    initials: 'screens.staff.mw',
    name: 'screens.staff.mikeWilson',
    reason: 'screens.staff.appointmentLabResults',
    badge: 'screens.staff.progress2',
    variant: 'secondary',
    meta: ['screens.staff.started1045Am', 'screens.staff.duration15Min', 'screens.staff.room205DrMiller'],
    actions: [['screens.staff.viewProgress', false]],
  },
];

function useTones() {
  const { colors } = useUITheme();
  return {
    error: { fg: colors.statusError, subtle: colors.statusErrorSubtle },
    warning: { fg: colors.statusWarning, subtle: colors.statusWarningSubtle },
    info: { fg: colors.statusInfo, subtle: colors.statusInfoSubtle },
  } satisfies Record<Tone, { fg: string; subtle: string }>;
}

function QueueCard({ testID, entry }: { testID: string; entry: QueueEntry }): ReactElement {
  const { t } = useI18n();
  const tone = useTones()[entry.tone];
  return (
    <Card testID={testID} style={[styles.queueCard, { borderStartColor: tone.fg }]}>
      <CardHeader>
        <View style={styles.cardTop}>
          <View style={styles.person}>
            <StaffAvatar initials={t(entry.initials)} background={tone.subtle} color={tone.fg} />
            <View style={styles.flexShrink}>
              <CardTitle size="lg" numberOfLines={1}>
                {t(entry.name)}
              </CardTitle>
              <CardDescription>{t(entry.reason)}</CardDescription>
            </View>
          </View>
          <Badge testID={`staff-badge-${entry.variant}`} variant={entry.variant}>
            {t(entry.badge)}
          </Badge>
        </View>
      </CardHeader>
      <CardContent style={styles.cardBody}>
        <View testID="staff-queue-meta" style={styles.meta}>
          {entry.meta.map((key) => (
            <Text key={key} size="sm" muted>
              {t(key)}
            </Text>
          ))}
        </View>
        <View testID="staff-queue-actions" style={styles.actions}>
          {entry.actions.map(([key, primary]) => (
            <Button key={key} size="sm" variant={primary ? 'default' : 'outline'} style={styles.flex}>
              {t(key)}
            </Button>
          ))}
        </View>
      </CardContent>
    </Card>
  );
}

function Queue(): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  return (
    <ScrollView testID="screen-staff-queue" contentContainerStyle={styles.page}>
      <PageHeader title={t('screens.staff.patientQueue')} subtitle={t('screens.staff.managePatientCheckinsWaitingList')} />

      <View testID="staff-queue-stats" style={styles.stats}>
        <StatCard testID="staff-stat-waiting" title={t('screens.staff.waiting')} icon="Clock" iconColor={colors.statusWarning} value={formatCount(8, language)} caption={t('screens.staff.patientsQueue')} />
        <StatCard testID="staff-stat-progress" title={t('screens.staff.progress')} icon="User" iconColor={colors.statusInfo} value={formatCount(5, language)} caption={t('screens.staff.seen')} />
        <StatCard testID="staff-stat-urgent" title={t('screens.staff.urgent')} icon="AlertCircle" iconColor={colors.statusError} value={formatCount(2, language)} caption={t('screens.staff.priorityCases')} />
        <StatCard testID="staff-stat-completed" title={t('screens.staff.completed')} icon="CheckCircle" iconColor={colors.statusSuccess} value={formatCount(24, language)} caption={t('screens.staff.todaySTotal')} />
      </View>

      <View testID="staff-current-queue" style={styles.queue}>
        <Text size="xl" weight="600" accessibilityRole="header">
          {t('screens.staff.currentQueue')}
        </Text>
        {ENTRIES.map((entry, i) => (
          <QueueCard key={entry.name} testID={`staff-queue-card-${i + 1}`} entry={entry} />
        ))}
      </View>
    </ScrollView>
  );
}

export function StaffQueueScreen(): ReactElement {
  return (
    <StaffGate>
      <Queue />
    </StaffGate>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingBottom: 112, gap: 24 },
  stats: { gap: 16 },
  queue: { gap: 16 },
  queueCard: { borderStartWidth: 4 },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 16, minWidth: 0, flexShrink: 1 },
  flexShrink: { flexShrink: 1, minWidth: 0 },
  cardBody: { gap: 12 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  actions: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  flex: { flex: 1 },
});
