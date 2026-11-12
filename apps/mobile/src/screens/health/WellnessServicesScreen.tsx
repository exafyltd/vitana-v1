/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) —
 * `/health/services-hub` (HEALTH.SERVICES_HUB and its `?tab=` rows
 * medicalServices / wellnessPrograms / insuranceSupport / myServices), twin of
 * the phone branch of `src/pages/health/WellnessServices.tsx:191-285`: the
 * health sub-navigation, the 🏥 header, the Service Actions button and popup
 * (`ServicesMasterActionPopup`), and the five-section split bar
 * (`useUrlTab("tab", "preventiveCare")`) of service cards. A card opens the
 * service detail sheet; its Book / Add Plan / Ask AI buttons only stop the
 * tap on the web (WellnessServices.tsx:110-118), so here they do nothing
 * either. Not ported: the utility row's ExpandableSearchButton (no search
 * handler, WellnessServices.tsx:205) and UniversalCalendarButton (the calendar
 * lane's popup, :206), as on /memory.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Text } from '../../ports/ui';
import { mockServiceDetails, useHealthPalette, type Hue } from '../../ports/health-plans';
import { useI18n } from '../../i18n/I18nProvider';
import { HealthPanel, HealthScaffold, IconTile, QuickActionsDialog, SplitBar, StandardHeader, UtilityRow, healthStyles, useUrlTab, type QuickAction } from './plans-services/components';
import { ServiceDetailSheet, type ServiceCard } from './plans-services/ServiceDetailSheet';

const SECTIONS = ['preventiveCare', 'medicalServices', 'wellnessPrograms', 'insuranceSupport', 'myServices'] as const;
type Section = (typeof SECTIONS)[number];

/** The intro line of each section (WellnessServices.tsx:229-265). */
const INTRO: Record<Section, string> = {
  preventiveCare: 'screens.health.earlyDetectionPreventionServicesMaintainOptimal',
  medicalServices: 'screens.health.professionalMedicalServicesConsultations',
  wellnessPrograms: 'screens.health.personalizedWellnessProgramsForLastingLifestyle',
  insuranceSupport: 'screens.health.insuranceBillingSupportServices',
  myServices: 'screens.health.manageYourPersonalServicesAppointments',
};

const s = (id: string, key: string, icon: string, hue: Hue, extra: Partial<ServiceCard> = {}): ServiceCard => ({
  id,
  titleKey: `screens.health.svc_${key}_title`,
  descKey: `screens.health.svc_${key}_desc`,
  icon,
  hue,
  ...extra,
});

/** `servicesData` (WellnessServices.tsx:27-58); `vitanaImpact` is the "+N points" number. */
const SERVICES: Record<Section, readonly ServiceCard[]> = {
  preventiveCare: [
    s('CT-301', 'annualPhysical', 'Stethoscope', 'green', { impact: 25 }),
    s('CT-302', 'cancerScreening', 'Microscope', 'blue', { impact: 30 }),
    s('CT-303', 'cardio', 'Heart', 'red', { impact: 35 }),
    s('CT-304', 'metabolic', 'TestTube2', 'purple', { impact: 30 }),
  ],
  medicalServices: [
    s('CT-305', 'specialist', 'UserCheck', 'blue', { impact: 20 }),
    s('CT-306', 'telemedicine', 'Phone', 'green', { impact: 15 }),
    s('CT-307', 'labTests', 'TestTube', 'purple', { impact: 25 }),
    s('CT-308', 'prescription', 'Package', 'orange', { impact: 20 }),
  ],
  wellnessPrograms: [
    s('CT-309', 'nutritionCoaching', 'Apple', 'orange', { impact: 20 }),
    s('CT-310', 'fitnessTraining', 'Dumbbell', 'blue', { impact: 30 }),
    s('CT-311', 'mentalCoach', 'Brain', 'purple', { impact: 25 }),
    s('CT-312', 'wellnessChallenge', 'Target', 'cyan', { impact: 40, suggestionKey: 'screens.health.svc_wellnessChallenge_suggestion' }),
  ],
  insuranceSupport: [
    s('CT-313', 'claimsProcessing', 'FileText', 'blue', { impact: 10 }),
    s('CT-314', 'coverageVerification', 'Shield', 'green', { impact: 5 }),
    s('CT-315', 'preAuth', 'Briefcase', 'purple', { impact: 15 }),
    s('CT-316', 'paymentPlans', 'CreditCard', 'orange', { impact: 5 }),
  ],
  myServices: [
    s('CT-317', 'appointments', 'Calendar', 'green', { countKey: 'screens.health.svc_appointments_count' }),
    s('CT-318', 'serviceHistory', 'Clock', 'blue', { countKey: 'screens.health.svc_serviceHistory_count' }),
    s('CT-319', 'myProviders', 'Users', 'purple', { countKey: 'screens.health.svc_myProviders_count' }),
    s('CT-320', 'healthRecords', 'BookOpen', 'orange'),
  ],
};

/** ServicesMasterActionPopup.tsx:27-99 (title / description / destination). */
const ACTIONS: ReadonlyArray<{ id: string; icon: string; path: string }> = [
  { id: 'bookPhysical', icon: 'Stethoscope', path: '/health/services-hub' },
  { id: 'orderLabTests', icon: 'TestTube', path: '/discover' },
  { id: 'myAppointments', icon: 'Calendar', path: '/calendar/appointments' },
  { id: 'findSpecialists', icon: 'Users', path: '/discover/doctors-coaches' },
  { id: 'wellnessPrograms', icon: 'Target', path: '/health/services-hub' },
  { id: 'telemedicine', icon: 'Phone', path: '/health/services-hub' },
  { id: 'healthRecords', icon: 'FileText', path: '/health/services-hub' },
  { id: 'insuranceSupport', icon: 'Shield', path: '/health/services-hub' },
];

const noop = () => undefined;

export function WellnessServicesScreen() {
  const { t } = useI18n();
  const palette = useHealthPalette();
  const [section, setSection] = useUrlTab<Section>(SECTIONS, 'preventiveCare');
  const [selected, setSelected] = useState<ServiceCard | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  const actions: QuickAction[] = ACTIONS.map((a) => ({
    id: a.id,
    icon: a.icon,
    title: t(`healthNative.serviceActions.${a.id}.title`),
    description: t(`healthNative.serviceActions.${a.id}.description`),
    path: a.path,
  }));

  /*
   * The web drawer renders `mockServiceDetails[service.id] || service`
   * (ServiceDetailDrawer.tsx:117) and maps `serviceDetail.features`
   * (:212); only CT-301 has a detail record, so on the web every other card
   * throws inside the drawer. The native card opens the sheet for CT-301 and
   * does nothing for the others instead of reproducing the crash.
   */
  const open = (service: ServiceCard) => {
    if (mockServiceDetails[service.id]) setSelected(service);
  };

  return (
    <HealthScaffold activePath="/health/services-hub" testID="screen-health-services">
      <StandardHeader emoji="🏥" title={t('screens.health.servicesHub')} description={t('healthNative.services.description')} />
      <UtilityRow>
        <Button size="sm" onPress={() => setActionsOpen(true)} testID="health-services-actions-open">
          {t('screens.health.serviceActions')}
        </Button>
      </UtilityRow>
      <SplitBar testID="health-services-tab" value={section} onChange={setSection} items={SECTIONS.map((v) => ({ value: v, label: t(`screens.health.${v}`) }))} />
      <Text size="sm" muted testID="health-services-intro">
        {t(INTRO[section])}
      </Text>
      <View style={healthStyles.list} testID={`health-services-${section}`}>
        {SERVICES[section].map((service) => (
          <HealthPanel key={service.id} onPress={() => open(service)} accessibilityLabel={t(service.titleKey)} testID={`health-service-${service.id}`}>
            <IconTile name={service.icon} tint={palette.hue[service.hue]} />
            <View style={styles.titleRow}>
              <View style={healthStyles.fill}>
                <Text size="lg" weight="600">
                  {t(service.titleKey)}
                </Text>
                <Text size="sm" muted style={styles.desc}>
                  {t(service.descKey)}
                </Text>
              </View>
              {service.impact !== undefined ? (
                <Badge variant="secondary" style={{ backgroundColor: palette.successSubtle }}>
                  <Text size="xs" color={palette.success}>
                    {t('healthNative.services.impactPoints', { points: service.impact })}
                  </Text>
                </Badge>
              ) : null}
              {service.countKey ? (
                <Badge variant="outline">
                  <Text size="xs">{t(service.countKey)}</Text>
                </Badge>
              ) : null}
            </View>
            {service.suggestionKey ? (
              <View style={[styles.suggestion, { backgroundColor: palette.hue.purple }]}>
                <Text size="xs" color={palette.category[3]}>
                  {t(service.suggestionKey)}
                </Text>
              </View>
            ) : null}
            <View style={styles.buttons}>
              <Button size="sm" style={healthStyles.fill} onPress={noop} testID={`health-service-${service.id}-book`}>
                {t('screens.health.book')}
              </Button>
              <Button size="sm" variant="outline" style={healthStyles.fill} onPress={noop}>
                {t('screens.health.addPlan')}
              </Button>
              <Button size="sm" variant="outline" onPress={noop}>
                {t('screens.health.askAi')}
              </Button>
            </View>
          </HealthPanel>
        ))}
      </View>
      <ServiceDetailSheet service={selected} onClose={() => setSelected(null)} />
      <QuickActionsDialog open={actionsOpen} onClose={() => setActionsOpen(false)} title={t('screens.common.serviceActions')} actions={actions} testID="health-services-actions" />
    </HealthScaffold>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  desc: { marginTop: 4 },
  suggestion: { marginTop: 4, padding: 8, borderRadius: 8 },
  buttons: { flexDirection: 'row', gap: 8, paddingTop: 8 },
});
