/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/appointments`,
 * the phone branch of src/pages/patient/Appointments.tsx (Spotlight is desktop
 * only). The header with "Schedule new", then the same three appointment
 * panels (two upcoming, one completed) with time, place and the two outline
 * actions. The web screen has no data source and its buttons have no
 * handler (Appointments.tsx:35-38, 66-67, 99-100, 132-133); the native
 * buttons are the same inert buttons — no action is invented.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Text, useUITheme, type BadgeVariant } from '../../ports/ui';
import { PatientIcon } from '../../ports/patient-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { PatientPage } from './components';

type Appointment = { id: string; title: string; specialty: string; badge: string; badgeVariant: BadgeVariant; time: string; place: string; actions: [string, string] };

const APPOINTMENTS: Appointment[] = [
  {
    id: 'miller',
    title: 'screens.patient.drSarahMillerAnnualCheckup',
    specialty: 'screens.patient.generalMedicine',
    badge: 'screens.patient.upcoming',
    badgeVariant: 'default',
    time: 'screens.patient.tomorrow200Pm2',
    place: 'screens.patient.medicalCenterRoom205',
    actions: ['screens.patient.reschedule', 'screens.patient.cancel'],
  },
  {
    id: 'davis',
    title: 'screens.patient.drJamesDavisFollowup',
    specialty: 'screens.patient.cardiology',
    badge: 'screens.patient.upcoming',
    badgeVariant: 'default',
    time: 'screens.patient.nextWeekFriday1000Am',
    place: 'screens.patient.cardiologyWingRoom301',
    actions: ['screens.patient.reschedule', 'screens.patient.cancel'],
  },
  {
    id: 'chen',
    title: 'screens.patient.drLisaChenConsultation',
    specialty: 'screens.patient.dermatology',
    badge: 'screens.patient.completed',
    badgeVariant: 'secondary',
    time: 'screens.patient.lastWeekMonday300Pm',
    place: 'screens.patient.dermatologyClinic',
    actions: ['screens.patient.viewNotes', 'screens.patient.bookFollowup'],
  },
];

function AppointmentPanel({ a }: { a: Appointment }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <Card testID={`patient-appointment-${a.id}`}>
      <CardHeader>
        <View style={styles.headerRow}>
          <View style={styles.shrink}>
            <View style={styles.titleRow}>
              <PatientIcon name="Calendar" size={20} />
              <CardTitle style={styles.shrink}>{t(a.title)}</CardTitle>
            </View>
            <CardDescription>{t(a.specialty)}</CardDescription>
          </View>
          <Badge variant={a.badgeVariant}>{t(a.badge)}</Badge>
        </View>
      </CardHeader>
      <CardContent style={styles.content}>
        <View style={styles.infoRow}>
          <PatientIcon name="Clock" size={16} color={colors.mutedForeground} />
          <Text size="sm">{t(a.time)}</Text>
        </View>
        <View style={styles.infoRow}>
          <PatientIcon name="MapPin" size={16} color={colors.mutedForeground} />
          <Text size="sm">{t(a.place)}</Text>
        </View>
        <View style={styles.actions}>
          {a.actions.map((key) => (
            <Button key={key} size="sm" variant="outline">
              {t(key)}
            </Button>
          ))}
        </View>
      </CardContent>
    </Card>
  );
}

export function AppointmentsScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <PatientPage
      testID="screen-patient-appointments"
      title={t('screens.patient.myAppointments')}
      subtitle={t('screens.patient.manageYourUpcomingPastAppointments')}
      action={
        <Button testID="patient-appointments-schedule-new">
          <PatientIcon name="Plus" size={16} color={colors.primaryForeground} />
          {t('screens.patient.scheduleNew')}
        </Button>
      }
    >
      <View style={styles.list}>
        {APPOINTMENTS.map((a) => (
          <AppointmentPanel key={a.id} a={a} />
        ))}
      </View>
    </PatientPage>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shrink: { flexShrink: 1 },
  content: { gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  list: { gap: 16 },
});
