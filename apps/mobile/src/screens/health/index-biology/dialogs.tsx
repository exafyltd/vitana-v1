/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the
 * three dialogs the two pages open, twins of
 *  - `src/components/health/VitanaLogDataDialog.tsx` (Index page "Log today",
 *    the pillars card and the focus step): pillar buttons, metric picker,
 *    value input, Cancel / "Log data";
 *  - `src/components/BiomarkersMasterActionPopup.tsx` (biology "Add Data"):
 *    Order New Lab Test → /health/services-hub, Download All Results (a
 *    no-op on web too, :32-36), Track Trends → /health-tracker, Close;
 *  - `src/components/supplements/AddSupplementDialog.tsx` (biology "Add
 *    Supplement" and a card's pencil): name, grouped category picker, dosage,
 *    frequency, start date, notes, Cancel / submit.
 *
 * READS ONLY (plan.md "No health data is written to production. Reads only";
 * lanes/vitana-index-biology.md "Upload / add-supplement affordances are
 * presented but write-disabled"). The log dialog's submit is a
 * `POST /integrations/manual/log` (VitanaLogDataDialog.tsx:84-98) and the
 * supplement submit an INSERT / UPDATE of `user_supplements`
 * (useUserSupplements.ts) — both buttons are rendered disabled and nothing
 * is wired to them, the same treatment health-hub gives the report upload
 * (sheets.tsx). Every field still works, so the member sees the real form.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, CardContent, Text, useUITheme } from '../../../ports/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, useHealthPalette, withAlpha } from '../../../ports/health';
import {
  BiologyIcon,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Textarea,
  getCategoryGroups,
} from '../../../ports/health-biology';
import { navigateToWebPath } from '../../../navigation/navigate';
import { PILLAR_KEYS, useHealthText } from '../text';
import type { VitanaPillarKey } from '../data/vitana-index';
import type { UserSupplement } from '../data/records';

// ── Log data dialog ─────────────────────────────────────────────────────
export interface FeatureOption {
  feature_key: string;
  unit: string;
  example: string;
}

/** VitanaLogDataDialog.tsx:22-50 FEATURES (labels from healthNative.indexDetail.logData.features.*). */
export const LOG_FEATURES: Record<VitanaPillarKey, readonly FeatureOption[]> = {
  nutrition: [
    { feature_key: 'biomarker_glucose', unit: 'mg/dL', example: '92' },
    { feature_key: 'meal_log', unit: 'count', example: '3' },
    { feature_key: 'macro_balance', unit: '0–100', example: '80' },
  ],
  hydration: [
    { feature_key: 'water_intake', unit: 'ml', example: '2000' },
    { feature_key: 'hydration_log', unit: 'count', example: '4' },
  ],
  exercise: [
    { feature_key: 'wearable_steps', unit: 'count', example: '8500' },
    { feature_key: 'wearable_heart_rate', unit: 'bpm', example: '72' },
    { feature_key: 'wearable_workout', unit: 'min', example: '30' },
    { feature_key: 'vo2_max', unit: 'ml/kg/min', example: '42' },
  ],
  sleep: [
    { feature_key: 'wearable_sleep_duration', unit: 'hours', example: '7.5' },
    { feature_key: 'wearable_sleep_efficiency', unit: '%', example: '88' },
    { feature_key: 'wearable_hrv', unit: 'ms', example: '45' },
  ],
  mental: [
    { feature_key: 'meditation_minutes', unit: 'min', example: '10' },
    { feature_key: 'mood_entry', unit: '1–10', example: '7' },
    { feature_key: 'wearable_stress', unit: '0–100', example: '30' },
    { feature_key: 'journal_entry', unit: 'count', example: '1' },
  ],
};

/** Units that are words are translated; symbols (mg/dL, ml, %, bpm …) are shown as on web. */
const WORD_UNITS = new Set(['count', 'hours', 'min']);

export function VitanaLogDataDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): ReactElement {
  const { colors } = useUITheme();
  const { t, pillarLabel } = useHealthText();
  const [pillar, setPillar] = useState<VitanaPillarKey>('hydration');
  const [featureKey, setFeatureKey] = useState<string>(LOG_FEATURES.hydration[0].feature_key);
  const [value, setValue] = useState('');
  const options = LOG_FEATURES[pillar];
  const selected = options.find((o) => o.feature_key === featureKey) ?? options[0];
  const unitLabel = (unit: string) => (WORD_UNITS.has(unit) ? t(`healthNative.indexDetail.logData.units.${unit}`) : unit);
  const featureLabel = (o: FeatureOption) => `${t(`healthNative.indexDetail.logData.features.${o.feature_key}`)} (${unitLabel(o.unit)})`;

  const choosePillar = (p: VitanaPillarKey) => {
    setPillar(p);
    setFeatureKey(LOG_FEATURES[p][0].feature_key);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent testID="vitana-log-data-dialog">
        <DialogHeader>
          <DialogTitle>{t('screens.health.logDataPoint')}</DialogTitle>
          <DialogDescription>{t('screens.health.addSingleHealthDataPointToday')}</DialogDescription>
        </DialogHeader>
        <View style={styles.form}>
          <View>
            <Label style={styles.caps}>{t('screens.health.pillar')}</Label>
            <View style={styles.pillarGrid}>
              {PILLAR_KEYS.map((p) => {
                const on = pillar === p;
                return (
                  <Pressable
                    key={p}
                    testID={`log-data-pillar-${p}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => choosePillar(p)}
                    style={[styles.pillarButton, on ? { backgroundColor: colors.primary } : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Text size="xs" weight="500" numberOfLines={1} color={on ? colors.primaryForeground : colors.foreground}>
                      {pillarLabel(p)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View>
            <Label style={styles.caps}>{t('screens.health.metric')}</Label>
            <Select value={selected.feature_key} onValueChange={setFeatureKey}>
              <SelectTrigger testID="log-data-metric" style={styles.mt}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent testID="log-data-metric-options">
                {options.map((o) => (
                  <SelectItem key={o.feature_key} value={o.feature_key} testID={`log-data-metric-${o.feature_key}`}>
                    {featureLabel(o)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
          <View>
            <Label style={styles.caps}>{t('screens.health.valueUnit', { unit: unitLabel(selected.unit) })}</Label>
            <Input
              testID="log-data-value"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={setValue}
              placeholder={t('healthNative.indexDetail.logData.example', { value: selected.example })}
              style={styles.mt}
            />
          </View>
        </View>
        <DialogFooter>
          <Button testID="log-data-cancel" variant="ghost" onPress={() => onOpenChange(false)}>
            {t('screens.health.cancel')}
          </Button>
          <Button testID="log-data-submit" disabled>
            {t('healthNative.indexDetail.logData.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Biomarker actions popup ─────────────────────────────────────────────
type BiomarkerAction = { id: 'orderLabTest' | 'downloadResults' | 'trackTrends'; icon: string; to?: string; tone: number };

/** BiomarkersMasterActionPopup.tsx:17-49, in order. */
export const BIOMARKER_ACTIONS: readonly BiomarkerAction[] = [
  { id: 'orderLabTest', icon: 'Calendar', to: '/health/services-hub', tone: 1 },
  { id: 'downloadResults', icon: 'Download', tone: 2 },
  { id: 'trackTrends', icon: 'TrendingUp', to: '/health-tracker', tone: 3 },
];

export function BiomarkersMasterActionPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): ReactElement {
  const palette = useHealthPalette();
  const { t } = useHealthText();
  const run = (a: BiomarkerAction) => {
    // "Download All Results" has no implementation on web either (console.log + close).
    if (a.to) navigateToWebPath(a.to);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent testID="biomarker-actions-popup">
        <DialogHeader>
          <View style={styles.row}>
            <BiologyIcon name="FileText" size={24} color={palette.category[2]} />
            <DialogTitle>{t('screens.common.biomarkerActions')}</DialogTitle>
          </View>
        </DialogHeader>
        <ScrollView contentContainerStyle={styles.gap}>
          {BIOMARKER_ACTIONS.map((a) => (
            <Pressable key={a.id} testID={`biomarker-action-${a.id}`} accessibilityRole="button" onPress={() => run(a)}>
              <Card>
                <CardContent style={styles.actionCard}>
                  <View style={[styles.actionIcon, { backgroundColor: withAlpha(palette.category[a.tone], 0.2) }]}>
                    <BiologyIcon name={a.icon} size={20} />
                  </View>
                  <Text size="sm" weight="600">
                    {t(`healthNative.biology.biomarkerActions.${a.id}.title`)}
                  </Text>
                  <Text size="xs" muted>
                    {t(`healthNative.biology.biomarkerActions.${a.id}.description`)}
                  </Text>
                </CardContent>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
        <DialogFooter>
          <Button testID="biomarker-actions-close" variant="outline" onPress={() => onOpenChange(false)}>
            {t('screens.common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add / edit supplement dialog ────────────────────────────────────────
type SupplementForm = { name: string; category: string; dosage: string; frequency: string; notes: string; start_date: string };

const today = () => new Date().toISOString().split('T')[0];
const emptyForm = (): SupplementForm => ({ name: '', category: '', dosage: '', frequency: '', notes: '', start_date: today() });

/** The group labels of getCategoryGroups() (English on web) → catalog keys. */
const GROUP_KEYS: Record<string, string> = {
  Vitamins: 'healthNative.supplements.filters.vitamins',
  Minerals: 'healthNative.supplements.filters.minerals',
  'Amino Acids': 'healthNative.supplements.filters.aminoAcids',
  'Fatty Acids': 'healthNative.biology.fattyAcids',
  Adaptogens: 'healthNative.supplements.filters.adaptogens',
  Probiotics: 'healthNative.supplements.filters.probiotics',
  Antioxidants: 'healthNative.supplements.filters.antioxidants',
  Other: 'healthNative.supplements.filters.other',
};

export function AddSupplementDialog({
  open,
  onOpenChange,
  supplement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode: the card's supplement pre-fills the form. */
  supplement?: UserSupplement | null;
}): ReactElement {
  const { t } = useHealthText();
  const mode = supplement ? 'edit' : 'add';
  const [form, setForm] = useState<SupplementForm>(emptyForm);
  useEffect(() => {
    if (open && supplement) {
      setForm({
        name: supplement.name,
        category: supplement.category,
        dosage: supplement.dosage || '',
        frequency: supplement.frequency || '',
        notes: supplement.notes || '',
        start_date: supplement.start_date || '',
      });
    } else if (!open) {
      setForm(emptyForm());
    }
  }, [open, supplement]);
  const set = (k: keyof SupplementForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent testID="add-supplement-dialog">
        <DialogHeader>
          <DialogTitle>{t(mode === 'add' ? 'healthNative.biology.dialog.addTitle' : 'healthNative.biology.dialog.editTitle')}</DialogTitle>
          <DialogDescription>{t(mode === 'add' ? 'healthNative.biology.dialog.addDescription' : 'healthNative.biology.dialog.editDescription')}</DialogDescription>
        </DialogHeader>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View>
            <Label>{t('screens.supplements.supplementName')}</Label>
            <Input testID="supplement-form-name" value={form.name} onChangeText={set('name')} placeholder={t('screens.supplements.eGVitaminD3Omega3')} style={styles.mt} />
          </View>
          <View>
            <Label>{t('screens.supplements.category')}</Label>
            <Select value={form.category} onValueChange={set('category')}>
              <SelectTrigger testID="supplement-form-category" style={styles.mt}>
                <SelectValue placeholder={t('screens.supplements.selectCategory')} />
              </SelectTrigger>
              <SelectContent testID="supplement-form-category-options">
                {getCategoryGroups().map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{t(GROUP_KEYS[group.label] ?? 'healthNative.supplements.filters.other')}</SelectLabel>
                    {group.items.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </View>
          <View>
            <Label>{t('screens.supplements.dosage')}</Label>
            <Input testID="supplement-form-dosage" value={form.dosage} onChangeText={set('dosage')} placeholder={t('screens.supplements.eG1000Iu500mg')} style={styles.mt} />
          </View>
          <View>
            <Label>{t('screens.supplements.frequency')}</Label>
            <Input testID="supplement-form-frequency" value={form.frequency} onChangeText={set('frequency')} placeholder={t('screens.supplements.eGOnceDailyTwiceDaily')} style={styles.mt} />
          </View>
          <View>
            <Label>{t('screens.supplements.startDate')}</Label>
            <Input testID="supplement-form-start-date" value={form.start_date} onChangeText={set('start_date')} placeholder={t('healthNative.biology.dialog.datePlaceholder')} style={styles.mt} />
          </View>
          <View>
            <Label>{t('screens.supplements.notes')}</Label>
            <Textarea testID="supplement-form-notes" value={form.notes} onChangeText={set('notes')} placeholder={t('screens.supplements.anyAdditionalInformation')} rows={3} style={styles.mt} />
          </View>
        </ScrollView>
        <DialogFooter>
          <Button testID="supplement-form-cancel" variant="outline" onPress={() => onOpenChange(false)}>
            {t('screens.supplements.cancel')}
          </Button>
          <Button testID="supplement-form-submit" disabled>
            {t(mode === 'add' ? 'healthNative.biology.dialog.addSubmit' : 'healthNative.biology.dialog.updateSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingVertical: 16 },
  caps: { textTransform: 'uppercase', letterSpacing: 1 },
  mt: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gap: { gap: 16, paddingVertical: 8 },
  pillarGrid: { flexDirection: 'row', gap: 4, marginTop: 8 },
  pillarButton: { flex: 1, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  actionCard: { padding: 16, gap: 6 },
  actionIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
