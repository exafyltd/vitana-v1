/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the three overlays
 * the mobile-web /health dashboard opens, twins of
 *  - `src/components/HealthMasterActionPopup.tsx` (the "Action" button):
 *    six quick actions; upload / order open the sheets below, the rest
 *    navigate (services hub, groups, health tracker, education);
 *  - `src/components/health/mobile/QuickLabOrderSheet.tsx`: four lab panels,
 *    every "Order" and "Browse all tests" goes to /health/services-hub;
 *  - `src/components/health/mobile/HealthReportUploadSheet.tsx`: report type
 *    pills, document picker, provider, test date, upload button.
 *
 * READS ONLY (plan "No health data is written", tasks.md health-hub task 3):
 * the upload sheet is presented, but its write path (storage upload +
 * `lab_reports` insert, HealthReportUploadSheet.tsx:95-127) is not wired.
 * The document zone is not pressable, so no file is ever selected and the
 * "Upload report" button stays disabled — the same disabled state the web
 * button has without a file (:257). The web test-date calendar popover is
 * not ported; the date row shows today, read-only.
 */
import { useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  HealthButtonIcon,
  HealthIcon,
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  useHealthPalette,
  withAlpha,
} from '../../ports/health';
import { navigateToWebPath } from '../../navigation/navigate';
import { useHealthText } from './text';

// ── Health actions popup ────────────────────────────────────────────────
type QuickAction = { id: string; icon: string; to?: string; open?: 'upload' | 'order' };

/** HealthMasterActionPopup.tsx:23-83, in order. */
export const HEALTH_QUICK_ACTIONS: readonly QuickAction[] = [
  { id: 'uploadLabResults', icon: 'Upload', open: 'upload' },
  { id: 'orderBloodTest', icon: 'FlaskConical', open: 'order' },
  { id: 'bookScreening', icon: 'Stethoscope', to: '/health/services-hub' },
  { id: 'joinWellnessGroup', icon: 'Users', to: '/comm/groups' },
  { id: 'trackToday', icon: 'Activity', to: '/health-tracker' },
  { id: 'healthEducation', icon: 'BookOpen', to: '/health/education' },
];

export function HealthMasterActionPopup({
  open,
  onOpenChange,
  onUploadOpen,
  onOrderOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadOpen: () => void;
  onOrderOpen: () => void;
}): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const { t } = useHealthText();
  const run = (a: QuickAction) => {
    onOpenChange(false);
    if (a.open === 'upload') onUploadOpen();
    else if (a.open === 'order') onOrderOpen();
    else if (a.to) navigateToWebPath(a.to);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent testID="health-actions-popup">
        <DialogHeader>
          <View style={styles.row}>
            <HealthIcon name="Heart" size={20} color={colors.statusSuccess} />
            <DialogTitle>{t('screens.common.healthActions')}</DialogTitle>
          </View>
        </DialogHeader>
        <ScrollView contentContainerStyle={styles.gap}>
          {HEALTH_QUICK_ACTIONS.map((a, i) => (
            <Pressable
              key={a.id}
              testID={`health-action-${a.id}`}
              accessibilityRole="button"
              onPress={() => run(a)}
              style={[styles.action, { borderColor: colors.border, backgroundColor: withAlpha(palette.category[i % palette.category.length], 0.15) }]}
            >
              <HealthIcon name={a.icon} size={20} />
              <View style={styles.fill}>
                <Text size="sm" weight="600">
                  {t(`healthNative.actions.${a.id}.title`)}
                </Text>
                <Text size="xs" muted>
                  {t(`healthNative.actions.${a.id}.description`)}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}

// ── Quick lab order sheet ───────────────────────────────────────────────
/** QuickLabOrderSheet.tsx:7-32. */
export const LAB_TESTS: ReadonlyArray<{ id: string; icon: string; tone: number }> = [
  { id: 'completeBloodPanel', icon: 'Droplets', tone: 0 },
  { id: 'metabolicPanel', icon: 'FlaskConical', tone: 1 },
  { id: 'hormonesPanel', icon: 'Heart', tone: 2 },
  { id: 'allergyPanel', icon: 'AlertTriangle', tone: 3 },
];

export function QuickLabOrderSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const { t } = useHealthText();
  const toHub = () => {
    onOpenChange(false);
    navigateToWebPath('/health/services-hub');
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" testID="health-lab-order-sheet" style={styles.tall}>
        <SheetHeader>
          <View style={styles.row}>
            <HealthIcon name="Stethoscope" size={20} color={colors.primary} />
            <SheetTitle>{t('screens.health.orderLabTest')}</SheetTitle>
          </View>
        </SheetHeader>
        <ScrollView contentContainerStyle={styles.gap}>
          {LAB_TESTS.map((test) => {
            const tone = palette.category[test.tone];
            return (
              <View key={test.id} testID={`health-lab-test-${test.id}`} style={[styles.labRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={[styles.labIcon, { backgroundColor: withAlpha(tone, 0.1) }]}>
                  <HealthIcon name={test.icon} size={20} color={tone} />
                </View>
                <View style={styles.fill}>
                  <Text size="sm" weight="600">
                    {t(`healthNative.labTests.${test.id}.name`)}
                  </Text>
                  <Text size="xs" muted>
                    {t(`healthNative.labTests.${test.id}.description`)}
                  </Text>
                </View>
                <Button testID={`health-lab-order-${test.id}`} size="sm" variant="outline" onPress={toHub}>
                  {t('screens.health.order')}
                </Button>
              </View>
            );
          })}
          <Pressable testID="health-lab-browse-all" accessibilityRole="button" onPress={toHub} style={styles.browse}>
            <Text size="sm" weight="500" color={colors.primary}>
              {t('screens.health.browseAllTests')}
            </Text>
            <HealthIcon name="ArrowRight" size={16} color={colors.primary} />
          </Pressable>
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

// ── Health report upload sheet (presented, write not wired) ────────────
/** HealthReportUploadSheet.tsx:18-28, in order. */
export const REPORT_CATEGORIES: ReadonlyArray<{ value: string; icon: string }> = [
  { value: 'blood_panel', icon: 'Droplets' },
  { value: 'genomics', icon: 'Dna' },
  { value: 'metabolomics', icon: 'FlaskConical' },
  { value: 'microbiome', icon: 'Bug' },
  { value: 'allergy', icon: 'AlertTriangle' },
  { value: 'cancer', icon: 'Heart' },
  { value: 'hormones', icon: 'FlaskConical' },
  { value: 'imaging', icon: 'Scan' },
  { value: 'other', icon: 'MoreHorizontal' },
];

export function HealthReportUploadSheet({
  open,
  onOpenChange,
  defaultCategory = 'blood_panel',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: string;
}): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const { t, longDate } = useHealthText();
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [providerName, setProviderName] = useState('');
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedCategory(defaultCategory);
      setProviderName('');
    }
    onOpenChange(isOpen);
  };
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" testID="health-upload-sheet" style={styles.tallest}>
        <SheetHeader>
          <View style={styles.row}>
            <HealthIcon name="Upload" size={20} color={colors.primary} />
            <SheetTitle>{t('screens.health.uploadHealthReport')}</SheetTitle>
          </View>
        </SheetHeader>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View>
            <Text size="sm" weight="500" style={styles.label}>
              {t('screens.health.reportType')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
              {REPORT_CATEGORIES.map((cat, i) => {
                const on = selectedCategory === cat.value;
                const tone = cat.value === 'other' ? colors.mutedForeground : palette.category[i % palette.category.length];
                return (
                  <Pressable
                    key={cat.value}
                    testID={`health-upload-category-${cat.value}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setSelectedCategory(cat.value)}
                    style={[
                      styles.catPill,
                      on ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: withAlpha(tone, 0.1), borderColor: withAlpha(tone, 0.2) },
                    ]}
                  >
                    <HealthIcon name={cat.icon} size={14} color={on ? colors.primaryForeground : tone} />
                    <Text size="xs" weight="500" color={on ? colors.primaryForeground : tone}>
                      {t(`healthNative.reportCategories.${cat.value}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View>
            <Text size="sm" weight="500" style={styles.label}>
              {t('screens.health.document')}
            </Text>
            <View testID="health-upload-file-zone" accessibilityState={{ disabled: true }} style={[styles.dropZone, { borderColor: colors.border }]}>
              <HealthIcon name="Upload" size={32} color={colors.mutedForeground} />
              <Text size="sm" weight="500" muted>
                {t('screens.health.tapSelectFile')}
              </Text>
              <Text size="xs" muted>
                {t('screens.health.pdfJpegPngHeicMax20mb')}
              </Text>
            </View>
          </View>

          <View>
            <Text size="sm" weight="500" style={styles.label}>
              {t('screens.health.providerLabOptional')}
            </Text>
            <Input testID="health-upload-provider" placeholder={t('screens.health.eGQuestDiagnostics')} value={providerName} onChangeText={setProviderName} />
          </View>

          <View>
            <Text size="sm" weight="500" style={styles.label}>
              {t('screens.health.testDate')}
            </Text>
            <View testID="health-upload-date" style={[styles.dateRow, { borderColor: colors.input }]}>
              <HealthIcon name="Calendar" size={16} />
              <Text size="sm">{longDate(new Date())}</Text>
            </View>
          </View>

          <Button testID="health-upload-submit" size="lg" disabled>
            <HealthButtonIcon name="CheckCircle" />
            {t('screens.health.uploadReport')}
          </Button>
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gap: { gap: 10 },
  fill: { flex: 1, minWidth: 0 },
  action: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 8, borderWidth: 2 },
  tall: { maxHeight: '75%' },
  tallest: { maxHeight: '90%' },
  labRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  labIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  browse: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  form: { gap: 24, paddingBottom: 8 },
  label: { marginBottom: 8 },
  pills: { gap: 8, paddingBottom: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  dropZone: { padding: 32, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', gap: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
});
