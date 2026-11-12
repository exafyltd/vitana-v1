/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/results`,
 * the phone branch of src/pages/patient/Results.tsx (VTID-03936; Spotlight is
 * desktop only). Real data: `GET /patient/health-results` (lab reports +
 * biomarkers with best-effort partner attribution). Same order: header, the
 * partner "Is this your test?" card, then row skeletons while loading, the
 * error state with Retry, the empty state, or one standard horizontal card
 * per result (marker count, partner or "self reported", "N need attention" /
 * "all normal" badge, report date). A card opens the centred detail dialog
 * with the biomarker table (marker, value, range, status badge).
 * `/patient/results` is AuthGuard only on the web (VTID-03988), so no role
 * gate wraps this screen.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, PressableRow, Text, useUITheme } from '../../ports/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, PatientIcon } from '../../ports/patient-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { PatientPage, RowsSkeleton } from './components';
import { PartnerLinkRequestsCard } from './PartnerLinkRequestsCard';
import { usePatientHealthResults } from './data/hooks';
import type { PatientBiomarker, PatientHealthResult } from './data/requests';
import { formatNumber, formatReportDate } from './format';

type T = (key: string, params?: Record<string, string | number>) => string;

export function isAbnormal(status: string | null): boolean {
  return status === 'low' || status === 'high' || status === 'critical';
}

export function orgLabel(t: T, result: PatientHealthResult): string {
  if (!result.org) return t('screens.patient.results.selfReported');
  return result.org.self_registered_name ?? result.org.display_name ?? t('screens.patient.results.selfReported');
}

export function statusLabel(t: T, status: string | null): string {
  if (!status) return t('screens.patient.results.statusUnknown');
  return t(`screens.patient.results.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);
}

function ResultCard({ result, onOpen }: { result: PatientHealthResult; onOpen: () => void }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const abnormal = result.biomarkers.filter((b) => isAbnormal(b.status)).length;
  const title = t('screens.patient.results.markerCount', { count: result.biomarkers.length });
  return (
    <PressableRow
      testID={`patient-result-${result.id}`}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onOpen}
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
    >
      <View style={styles.cardIcon}>
        <PatientIcon name="FlaskConical" size={20} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text weight="600" numberOfLines={1} style={styles.shrink}>
            {title}
          </Text>
          {abnormal > 0 ? (
            <Badge variant="destructive">{t('screens.patient.results.needsAttention', { count: abnormal })}</Badge>
          ) : (
            <Badge variant="secondary">{t('screens.patient.results.allNormal')}</Badge>
          )}
          <Text size="xs" muted style={styles.timestamp}>
            {formatReportDate(result.report_date ?? result.created_at, locale)}
          </Text>
        </View>
        <Text size="sm" numberOfLines={2}>
          {orgLabel(t, result)}
        </Text>
      </View>
    </PressableRow>
  );
}

function BiomarkerTable({ biomarkers }: { biomarkers: PatientBiomarker[] }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const n = (v: number) => formatNumber(v, locale);
  const value = (b: PatientBiomarker) =>
    b.value != null ? (b.unit ? t('patientNative.results.valueWithUnit', { value: n(b.value), unit: b.unit }) : n(b.value)) : t('patientNative.results.noValue');
  const range = (b: PatientBiomarker) =>
    b.ref_range_low != null && b.ref_range_high != null ? t('patientNative.results.range', { low: n(b.ref_range_low), high: n(b.ref_range_high) }) : t('patientNative.results.noValue');
  const head = (key: string) => (
    <Text size="sm" weight="500" muted style={styles.cell}>
      {t(key)}
    </Text>
  );
  return (
    <View testID="patient-result-table">
      <View style={[styles.tableRow, { borderColor: colors.border }]}>
        {head('screens.patient.results.biomarker')}
        {head('screens.patient.results.value')}
        {head('screens.patient.results.range')}
        {head('screens.patient.results.status')}
      </View>
      {biomarkers.map((b) => (
        <View key={b.id} testID={`patient-biomarker-${b.id}`} style={[styles.tableRow, { borderColor: colors.border }]}>
          <Text size="sm" style={styles.cell}>
            {b.name ?? b.biomarker_code ?? ''}
          </Text>
          <Text size="sm" style={styles.cell}>
            {value(b)}
          </Text>
          <Text size="sm" muted style={styles.cell}>
            {range(b)}
          </Text>
          <View style={styles.cell}>
            <Badge variant={isAbnormal(b.status) ? 'destructive' : 'secondary'}>{statusLabel(t, b.status)}</Badge>
          </View>
        </View>
      ))}
    </View>
  );
}

export function ResultsScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { data: results, isLoading, isError, refetch } = usePatientHealthResults();
  const [openResult, setOpenResult] = useState<PatientHealthResult | null>(null);

  let body: ReactElement;
  if (isLoading) body = <RowsSkeleton rows={4} testID="patient-results-loading" />;
  else if (isError)
    body = (
      <View testID="patient-results-error" style={styles.state}>
        <PatientIcon name="AlertTriangle" size={32} color={colors.destructive} />
        <Text size="sm" muted style={styles.center}>
          {t('screens.patient.results.loadFailed')}
        </Text>
        <PressableRow testID="patient-results-retry" accessibilityRole="button" onPress={() => void refetch()}>
          <Text size="sm" weight="500" color={colors.primary}>
            {t('screens.patient.results.retry')}
          </Text>
        </PressableRow>
      </View>
    );
  else if (!results || results.length === 0)
    body = (
      <View testID="patient-results-empty" style={styles.state}>
        <PatientIcon name="FlaskConical" size={48} color={colors.mutedForeground} opacity={0.5} />
        <Text weight="500" muted style={styles.center}>
          {t('screens.patient.results.empty')}
        </Text>
      </View>
    );
  else
    body = (
      <View testID="patient-results-list" style={styles.list}>
        {results.map((r) => (
          <ResultCard key={r.id} result={r} onOpen={() => setOpenResult(r)} />
        ))}
      </View>
    );

  return (
    <>
      <PatientPage testID="screen-patient-results" title={t('screens.patient.results.title')} subtitle={t('screens.patient.results.subtitle')}>
        <PartnerLinkRequestsCard />
        {body}
      </PatientPage>

      <Dialog open={openResult !== null} onOpenChange={(open) => !open && setOpenResult(null)}>
        <DialogContent testID="patient-result-dialog">
          <DialogHeader>
            <DialogTitle>{openResult ? orgLabel(t, openResult) : ''}</DialogTitle>
          </DialogHeader>
          {openResult ? (
            openResult.biomarkers.length === 0 ? (
              <Text size="sm" muted>
                {t('screens.patient.results.noBiomarkers')}
              </Text>
            ) : (
              <BiomarkerTable biomarkers={openResult.biomarkers} />
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 88, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  cardIcon: { width: 40, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  timestamp: { marginStart: 'auto' },
  shrink: { flexShrink: 1 },
  state: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  center: { textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, gap: 8 },
  cell: { flex: 1 },
});
