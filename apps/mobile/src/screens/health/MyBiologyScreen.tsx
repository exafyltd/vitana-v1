/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the
 * biology screen (`HEALTH.MY_BIOLOGY /health/my-biology`, `HEALTH.BIOLOGY_OMICS
 * ?tab=omics`, `HEALTH.BIOLOGY_SUPPLEMENTS ?tab=supplements`), a 1:1 port of
 * the phone branch of `src/pages/health/MyBiology.tsx` (:456-763; the
 * Spotlight branch :240-454 is desktop + flag only, plan decision 6). One
 * route; the `tab` search param picks the tab like the web `useUrlTab("tab",
 * "medical")` (an unknown value falls back to medical; a change writes `?tab=`
 * back and keeps the default out of the URL).
 *
 *  - Chrome: the health sub-navigation, the phone StandardHeader (title),
 *    the utility rail (Search, Calendar, "Add Data" → Biomarker Actions,
 *    Life Compass, Gift Voucher) — index-biology/chrome.tsx.
 *  - My Medical / My Omics: the panel, "Upload PDF" / "Upload Results"
 *    (the upload sheet with blood_panel / genomics), the in-screen Health
 *    Sync affordance ("Connect Device" / "Connect API", health-hub's
 *    `HealthSyncAffordance`, plan "Health Hub coordination"), then the
 *    error state with retry, the report cards (type icon, title, type +
 *    status badges, date, provider) or the empty state with its CTA.
 *    Medical = blood_panel / hormones / cancer / allergy / imaging / other /
 *    untyped; omics = genomics / metabolomics / microbiome (:136-145).
 *  - My Supplements: "Add Supplement", the category filter (all + every
 *    catalogue category with its count), the cards (pencil opens the edit
 *    dialog), loading / empty, "Your Active Categories" chips that set the filter.
 *  - Overlays: Biomarker Actions, the add / edit supplement dialog, the
 *    report upload sheet.
 *
 * Data: health-hub's native module (`useLabReports`, `useUserSupplements`:
 * RLS-scoped `user_id = auth.uid()` selects), not re-fetched here.
 *
 * READS ONLY (plan.md "No health data is written to production. Reads
 * only"; lanes/vitana-index-biology.md "write-disabled upload/add
 * affordances"): the upload and supplement submits are disabled, a card's
 * delete is disabled, and a report card does not open its file — the web
 * opens it through a storage signed URL (`createSignedUrl`, :148-161, a
 * POST), which the network guard (GETs only) does not allow; health-hub's
 * Medical mode makes the same call. The web "Connect" taps only log an
 * activity row (useHealthLogger.ts, a write), which the native affordance
 * does not do. While the reports load the web shows the empty state
 * (HorizontalCardList gets no isLoading, :533-549); so does the twin.
 * React 19: typed with `ReactElement`.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, CardContent, Text, useUITheme, type BadgeVariant } from '../../ports/ui';
import { HealthButtonIcon, HealthIcon, withAlpha } from '../../ports/health';
import { HealthReportUploadSheet, HealthSyncAffordance, useLabReports, useUserSupplements, type LabReport, type UserSupplement } from '../../ports/health-data';
import { BiologyIcon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, getAllCategories, useSurfaceColors } from '../../ports/health-biology';
import { useHealthText } from './text';
import { BiologyPanel, BiologyUtilityBar, HealthSubNav, MobileStandardHeader, PaneState, SplitBar } from './index-biology/chrome';
import { AddSupplementDialog, BiomarkersMasterActionPopup } from './index-biology/dialogs';

export type BiologyTab = 'medical' | 'omics' | 'supplements';
export const BIOLOGY_TABS: readonly BiologyTab[] = ['medical', 'omics', 'supplements'];
const DEFAULT_TAB: BiologyTab = 'medical';

const asTab = (v: unknown): BiologyTab => ((BIOLOGY_TABS as readonly unknown[]).includes(v) ? (v as BiologyTab) : DEFAULT_TAB);

/** MyBiology.tsx:136-145. */
export const MEDICAL_TYPES = ['blood_panel', 'hormones', 'cancer', 'allergy', 'imaging', 'other'];
export const OMICS_TYPES = ['genomics', 'metabolomics', 'microbiome'];
export const isMedical = (r: LabReport) => !r.report_type || MEDICAL_TYPES.includes(r.report_type);
export const isOmics = (r: LabReport) => !!r.report_type && OMICS_TYPES.includes(r.report_type);

/** MyBiology.tsx:73-95 report-type icons (labels from spotlightTierB.health.reportType.*). */
const REPORT_TYPE_ICON: Record<string, string> = {
  blood_panel: 'Droplets',
  genomics: 'Dna',
  metabolomics: 'FlaskConical',
  microbiome: 'Bug',
  allergy: 'AlertTriangle',
  cancer: 'Heart',
  hormones: 'FlaskConical',
  imaging: 'Scan',
  other: 'MoreHorizontal',
};

/** MyBiology.tsx:97-102 STATUS_CONFIG (labels from spotlightTierB.health.reportStatus.*). */
const STATUS_VARIANT: Record<string, BadgeVariant> = { uploaded: 'secondary', processing: 'outline', parsed: 'default', failed: 'destructive' };

function ReportCard({ report }: { report: LabReport }): ReactElement {
  const { colors } = useUITheme();
  const { t, shortDate } = useHealthText();
  const typeKey = REPORT_TYPE_ICON[report.report_type || 'other'] ? report.report_type || 'other' : 'other';
  const statusKey = STATUS_VARIANT[report.processing_status || 'uploaded'] ? report.processing_status || 'uploaded' : 'uploaded';
  const when = report.report_date || report.created_at;
  return (
    <View testID={`biology-report-${report.id}`} style={[styles.reportCard, { borderColor: withAlpha(colors.border, 0.6), backgroundColor: withAlpha(colors.background, 0.6) }]}>
      <View style={styles.reportIcon}>
        <BiologyIcon name={REPORT_TYPE_ICON[typeKey]} size={16} />
      </View>
      <View style={styles.fill}>
        <View style={styles.reportHead}>
          <Text weight="600" numberOfLines={1} style={styles.shrink}>
            {report.title || report.raw_file_ref || t('spotlightTierB.health.reportFallbackTitle')}
          </Text>
          <Badge variant="outline" testID={`biology-report-type-${report.id}`}>
            {t(`spotlightTierB.health.reportType.${typeKey}`)}
          </Badge>
          <Badge variant={STATUS_VARIANT[statusKey]} testID={`biology-report-status-${report.id}`}>
            {t(`spotlightTierB.health.reportStatus.${statusKey}`)}
          </Badge>
          {when ? (
            <Text size="xs" muted testID={`biology-report-date-${report.id}`} style={styles.date}>
              {shortDate(when)}
            </Text>
          ) : null}
        </View>
        <Text size="sm" numberOfLines={2} style={styles.mt1}>
          {report.provider_name || report.source || t('health.unknownProvider')}
        </Text>
      </View>
    </View>
  );
}

/** src/components/supplements/SupplementCard.tsx — the pencil opens the edit dialog; delete is write-disabled. */
function BiologySupplementCard({ supplement, onEdit }: { supplement: UserSupplement; onEdit: (s: UserSupplement) => void }): ReactElement {
  const { colors } = useUITheme();
  const { t, shortDate } = useHealthText();
  return (
    <Card testID={`biology-supplement-${supplement.id}`}>
      <CardContent style={styles.cardBody}>
        <View style={styles.cardRow}>
          <View style={styles.fill}>
            <View style={styles.nameRow}>
              <Text weight="600" numberOfLines={1} style={styles.shrink}>
                {supplement.name}
              </Text>
              {!supplement.is_active ? <Badge variant="secondary">{t('screens.supplements.inactive')}</Badge> : null}
            </View>
            <Text size="sm" muted style={styles.mb2}>
              {supplement.category}
            </Text>
            <View style={styles.facts}>
              {supplement.dosage ? (
                <Text size="sm" style={styles.half}>
                  <Text size="sm" muted>{`${t('screens.supplements.dosage')} `}</Text>
                  <Text size="sm" weight="500">
                    {supplement.dosage}
                  </Text>
                </Text>
              ) : null}
              {supplement.frequency ? (
                <Text size="sm" style={styles.half}>
                  <Text size="sm" muted>{`${t('screens.supplements.frequency')} `}</Text>
                  <Text size="sm" weight="500">
                    {supplement.frequency}
                  </Text>
                </Text>
              ) : null}
              {supplement.start_date ? (
                <Text size="sm" style={styles.full}>
                  <Text size="sm" muted>{`${t('screens.supplements.started')} `}</Text>
                  <Text size="sm" weight="500">
                    {shortDate(supplement.start_date)}
                  </Text>
                </Text>
              ) : null}
            </View>
            {supplement.notes ? (
              <Text size="sm" muted style={styles.notes}>
                {supplement.notes}
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            <Button testID={`biology-supplement-edit-${supplement.id}`} variant="ghost" size="sm" accessibilityLabel={t('healthNative.supplements.edit')} onPress={() => onEdit(supplement)}>
              <HealthButtonIcon name="Pencil" />
            </Button>
            <Button testID={`biology-supplement-delete-${supplement.id}`} variant="ghost" size="sm" disabled accessibilityLabel={t('healthNative.supplements.delete')}>
              <HealthIcon name="Trash2" size={16} color={colors.destructive} />
            </Button>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

/** The Health Sync pass result needs no UI on this screen. */
const ignoreSyncResult = (): void => undefined;

function ReportsPane({
  kind,
  reports,
  isError,
  onRetry,
  onUpload,
}: {
  kind: 'medical' | 'omics';
  reports: LabReport[];
  isError: boolean;
  onRetry: () => void;
  onUpload: (category: string) => void;
}): ReactElement {
  const { t } = useHealthText();
  const medical = kind === 'medical';
  const category = medical ? 'blood_panel' : 'genomics';
  return (
    <BiologyPanel
      testID={`biology-pane-${kind}`}
      icon={medical ? 'TestTube' : 'Dna'}
      title={t(medical ? 'screens.health.medicalBiomarkers' : 'screens.health.omicsBiomarkers')}
      subtitle={t(medical ? 'screens.health.clinicalLabResultsFromBloodTests' : 'screens.health.genomicsEpigenomicsMetabolomicsMicrobiomeProteomic')}
    >
      <View style={styles.paneActions}>
        <Button testID={`biology-${kind}-upload`} variant="outline" size="sm" onPress={() => onUpload(category)} style={styles.paneAction}>
          <HealthButtonIcon name={medical ? 'Upload' : 'FileText'} />
          {t(medical ? 'screens.health.uploadPdf' : 'screens.health.uploadResults')}
        </Button>
        <View style={styles.paneAction}>
          {/* onResult is passed on purpose: HealthSyncAffordance.tsx calls `onResult?.(await entry.connect())`, which skips the
              connect() call when no onResult is given. The result needs no UI (the web tap shows nothing either). */}
          <HealthSyncAffordance kind={medical ? 'device' : 'api'} testID={`biology-${kind}-connect`} onResult={ignoreSyncResult} />
        </View>
      </View>
      {isError ? (
        <PaneState
          testID={`biology-${kind}-error`}
          icon="AlertTriangle"
          title={t('screens.health.reportsLoadFailed')}
          body={t('screens.health.reportsLoadFailedDesc')}
          action={
            <Button testID={`biology-${kind}-retry`} variant="outline" size="sm" onPress={onRetry}>
              {t('screens.health.reportsLoadFailedRetry')}
            </Button>
          }
        />
      ) : reports.length === 0 ? (
        <PaneState
          testID={`biology-${kind}-empty`}
          icon={medical ? 'Droplets' : 'Dna'}
          title={t(medical ? 'screens.health.noMedicalReportsYet' : 'screens.health.noOmicsDataYet')}
          body={t(medical ? 'screens.health.uploadYourFirstBloodPanelStart' : 'screens.health.uploadYourGenomicsMetabolomicsResultsUnlock')}
          action={
            <Button testID={`biology-${kind}-empty-upload`} variant="outline" size="sm" onPress={() => onUpload(category)}>
              <HealthButtonIcon name="Upload" />
              {t(medical ? 'screens.health.uploadBloodPanel' : 'screens.health.uploadOmicsReport')}
            </Button>
          }
        />
      ) : (
        <View style={styles.list} testID={`biology-${kind}-list`}>
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </View>
      )}
    </BiologyPanel>
  );
}

function SupplementsPane({ onAdd, onEdit }: { onAdd: () => void; onEdit: (s: UserSupplement) => void }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  const { supplements, isLoading } = useUserSupplements();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const allCategories = getAllCategories();
  const filtered = categoryFilter === 'all' ? supplements : supplements.filter((s) => s.category === categoryFilter);
  const activeCategoryCount = supplements.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});
  return (
    <BiologyPanel testID="biology-pane-supplements" icon="Pill" title={t('screens.health.mySupplements2')} subtitle={t('screens.health.trackYourSupplementRegimenAcross40')}>
      <View style={styles.suppActions}>
        <Button testID="biology-supplements-add" size="sm" onPress={onAdd}>
          <HealthButtonIcon name="Plus" />
          {t('screens.health.addSupplement')}
        </Button>
        <View style={styles.filter}>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger testID="biology-supplements-filter">
              <View style={styles.row}>
                <BiologyIcon name="Filter" size={16} />
                <SelectValue placeholder={t('screens.health.filterByCategory')} />
              </View>
            </SelectTrigger>
            <SelectContent testID="biology-supplements-filter-options">
              <SelectItem value="all" testID="biology-filter-all">
                {t('screens.health.allCategoriesLength', { length: supplements.length })}
              </SelectItem>
              {allCategories.map((category) => (
                <SelectItem key={category} value={category} testID={`biology-filter-${category}`}>
                  {t('spotlightTierB.health.categoryCount', { category, count: activeCategoryCount[category] || 0 })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
      </View>
      <View style={styles.list}>
        {isLoading ? (
          <View style={styles.state} testID="biology-supplements-loading">
            <Text muted>{t('screens.health.loadingSupplements')}</Text>
          </View>
        ) : filtered.length > 0 ? (
          filtered.map((s) => <BiologySupplementCard key={s.id} supplement={s} onEdit={onEdit} />)
        ) : (
          <PaneState
            testID="biology-supplements-empty"
            icon="Pill"
            title={categoryFilter === 'all' ? t('healthNative.biology.noSupplementsYet') : t('healthNative.biology.noSupplementsInCategory', { category: categoryFilter })}
          />
        )}
      </View>
      {supplements.length > 0 ? (
        <View style={[styles.activeBox, { backgroundColor: withAlpha(colors.muted, 0.2) }]} testID="biology-active-categories">
          <Text weight="600" style={styles.mb3}>
            {t('screens.health.yourActiveCategories')}
          </Text>
          <View style={styles.chips}>
            {Object.entries(activeCategoryCount)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <Pressable key={category} testID={`biology-active-category-${category}`} accessibilityRole="button" onPress={() => setCategoryFilter(category)}>
                  <Badge variant="secondary">{t('spotlightTierB.health.categoryCount', { category, count })}</Badge>
                </Pressable>
              ))}
          </View>
        </View>
      ) : null}
    </BiologyPanel>
  );
}

export function MyBiologyScreen(): ReactElement {
  const surface = useSurfaceColors();
  const { t } = useHealthText();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<BiologyTab>(() => asTab(params.tab));
  const [biomarkerActionsOpen, setBiomarkerActionsOpen] = useState(false);
  const [supplementDialogOpen, setSupplementDialogOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<UserSupplement | null>(null);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploadDefaultCategory, setUploadDefaultCategory] = useState('blood_panel');
  const { data: labReports = [], isError: reportsError, refetch: refetchReports } = useLabReports();

  useEffect(() => {
    setActiveTab(asTab(params.tab));
  }, [params.tab]);

  const changeTab = (next: BiologyTab) => {
    setActiveTab(next);
    router.setParams({ tab: next === DEFAULT_TAB ? undefined : next });
  };
  const openUploadSheet = (category: string) => {
    setUploadDefaultCategory(category);
    setUploadSheetOpen(true);
  };
  const openAdd = () => {
    setEditingSupplement(null);
    setSupplementDialogOpen(true);
  };
  const openEdit = (s: UserSupplement) => {
    setEditingSupplement(s);
    setSupplementDialogOpen(true);
  };

  return (
    <View style={styles.fill}>
      <ScrollView testID="screen-my-biology" style={{ backgroundColor: surface.pageFrom }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <HealthSubNav activePath="/health/my-biology" />
        <View style={styles.body}>
          <MobileStandardHeader title={t('screens.health.yourBiologyCentralHub')} />
          <BiologyUtilityBar onAddData={() => setBiomarkerActionsOpen(true)} />
          <SplitBar
            testID="biology-tabs"
            value={activeTab}
            onChange={changeTab}
            items={[
              { value: 'medical', label: t('screens.health.myMedical') },
              { value: 'omics', label: t('screens.health.myOmics') },
              { value: 'supplements', label: t('screens.health.mySupplements') },
            ]}
          />
          {activeTab === 'medical' ? (
            <ReportsPane kind="medical" reports={labReports.filter(isMedical)} isError={reportsError} onRetry={() => void refetchReports()} onUpload={openUploadSheet} />
          ) : null}
          {activeTab === 'omics' ? (
            <ReportsPane kind="omics" reports={labReports.filter(isOmics)} isError={reportsError} onRetry={() => void refetchReports()} onUpload={openUploadSheet} />
          ) : null}
          {activeTab === 'supplements' ? <SupplementsPane onAdd={openAdd} onEdit={openEdit} /> : null}
        </View>
      </ScrollView>

      <BiomarkersMasterActionPopup open={biomarkerActionsOpen} onOpenChange={setBiomarkerActionsOpen} />
      <AddSupplementDialog
        open={supplementDialogOpen}
        onOpenChange={(open) => {
          setSupplementDialogOpen(open);
          if (!open) setEditingSupplement(null);
        }}
        supplement={editingSupplement}
      />
      <HealthReportUploadSheet key={uploadDefaultCategory} open={uploadSheetOpen} onOpenChange={setUploadSheetOpen} defaultCategory={uploadDefaultCategory} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mt1: { marginTop: 4 },
  mb2: { marginBottom: 8 },
  mb3: { marginBottom: 12 },
  page: { paddingBottom: 128 },
  body: { padding: 24 },
  paneActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  paneAction: { flexGrow: 1, flexBasis: '40%' },
  list: { gap: 12 },
  reportCard: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 88, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  reportIcon: { width: 40, alignItems: 'center', justifyContent: 'center' },
  date: { marginStart: 'auto' },
  reportHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  suppActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  filter: { flex: 1, minWidth: 0, maxWidth: 200 },
  state: { alignItems: 'center', paddingVertical: 48 },
  activeBox: { marginTop: 24, padding: 16, borderRadius: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardBody: { padding: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  half: { width: '50%' },
  full: { width: '100%' },
  notes: { marginTop: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8 },
});
