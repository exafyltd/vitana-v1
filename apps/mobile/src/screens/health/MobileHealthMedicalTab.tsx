/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the Medical mode of
 * the mobile-web /health dashboard (`HEALTH.MEDICAL /health?mode=medical`), a
 * twin of `src/components/health/mobile/MobileHealthMedicalTab.tsx`: loading
 * spinner, error card with retry, the dashed upload CTA (only with reports),
 * the empty state with its own CTA, and one row per report (type emoji,
 * title, provider, date, status badge).
 *
 * Documented deferral: the web row opens the report through a storage signed
 * URL (`MobileHealthMedicalTab.tsx:53-61`, `createSignedUrl`, a POST to the
 * storage API). The native twin issues no non-GET call, so the rows are not
 * pressable; opening a report file is left to the biology lane / G1.
 */
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Spinner, Text, useUITheme, type BadgeVariant } from '../../ports/ui';
import { HealthButtonIcon, HealthIcon, withAlpha } from '../../ports/health';
import { useHealthText } from './text';
import { useLabReports } from './data/records';
import { HealthPanel } from './widgets';

const REPORT_TYPE_ICONS: Record<string, string> = {
  blood_panel: '🩸',
  hormones: '⚗',
  cancer: '🔬',
  allergy: '🤧',
  imaging: '📷',
  genomics: '🧬',
  metabolomics: '🧪',
  microbiome: '🦠',
  other: '📋',
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  uploaded: 'secondary',
  processing: 'default',
  processed: 'success',
  error: 'destructive',
};

const STATUSES = new Set(Object.keys(STATUS_VARIANTS));

export function MobileHealthMedicalTab({ onUpload }: { onUpload: () => void }): ReactElement {
  const { colors } = useUITheme();
  const { t, shortDate } = useHealthText();
  const { data: labReports = [], isLoading, isError, refetch } = useLabReports();

  if (isLoading) {
    return (
      <View style={styles.loading} testID="health-medical-loading">
        <Spinner accessibilityLabel={t('healthNative.loading')} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.px}>
        <View testID="health-medical-error" style={[styles.state, { backgroundColor: withAlpha(colors.destructive, 0.05), borderColor: withAlpha(colors.destructive, 0.2) }]}>
          <Text size="lg" weight="600" style={styles.center}>
            {t('health.reportsLoadFailed')}
          </Text>
          <Text size="sm" muted style={styles.center}>
            {t('health.reportsLoadFailedDesc')}
          </Text>
          <Button testID="health-medical-retry" size="sm" variant="outline" onPress={() => void refetch()}>
            {t('health.reportsLoadFailedRetry')}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.px, styles.gap]} testID="health-medical-list">
      {labReports.length > 0 ? (
        <Pressable
          testID="health-medical-upload-cta"
          accessibilityRole="button"
          onPress={onUpload}
          style={[styles.cta, { borderColor: withAlpha(colors.primary, 0.3), backgroundColor: withAlpha(colors.primary, 0.05) }]}
        >
          <View style={[styles.ctaIcon, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
            <HealthIcon name="Upload" size={24} color={colors.primary} />
          </View>
          <View style={styles.fill}>
            <Text weight="600">{t('health.uploadBloodTest')}</Text>
            <Text size="sm" muted>
              {t('health.uploadDescription')}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {labReports.length === 0 ? (
        <View testID="health-medical-empty" style={[styles.state, { borderColor: colors.border, backgroundColor: withAlpha(colors.primary, 0.05) }]}>
          <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
            <HealthIcon name="FileText" size={32} color={colors.primary} />
          </View>
          <Text size="lg" weight="600" style={styles.center}>
            {t('health.noReports')}
          </Text>
          <Text size="sm" muted style={styles.center}>
            {t('health.noReportsDesc')}
          </Text>
          <Button testID="health-medical-upload-first" size="sm" onPress={onUpload}>
            <HealthButtonIcon name="Upload" />
            {t('health.uploadFirstReport')}
          </Button>
        </View>
      ) : (
        <View style={styles.gapSm}>
          {labReports.map((report) => {
            const icon = REPORT_TYPE_ICONS[report.report_type || 'other'] || '📋';
            const status = report.processing_status || 'uploaded';
            return (
              <HealthPanel key={report.id} testID={`health-report-${report.id}`} style={styles.reportRow}>
                <Text style={styles.emoji}>{icon}</Text>
                <View style={styles.fill}>
                  <Text weight="500" numberOfLines={1}>
                    {report.title || report.raw_file_ref || t('healthNative.medical.untitledReport')}
                  </Text>
                  <Text size="sm" muted>
                    {report.provider_name || report.source || t('health.unknownProvider')}
                  </Text>
                  {report.report_date ? (
                    <Text size="xs" muted>
                      {shortDate(report.report_date)}
                    </Text>
                  ) : null}
                </View>
                <Badge variant={STATUS_VARIANTS[status] ?? 'secondary'} testID={`health-report-status-${report.id}`}>
                  <Text size="xs">{STATUSES.has(status) ? t(`healthNative.medical.status.${status}`) : status}</Text>
                </Badge>
              </HealthPanel>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  px: { paddingHorizontal: 16 },
  gap: { gap: 16 },
  gapSm: { gap: 12 },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  state: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 12 },
  center: { textAlign: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
  ctaIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1, minWidth: 0 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  emoji: { fontSize: 24, lineHeight: 30 },
});
