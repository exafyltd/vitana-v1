/**
 * VTID-05431 (Native Wave 2, settings lane) — `/settings/limitations`
 * (SETTINGS.LIMITATIONS), the native twin of the phone branch of
 * `src/pages/settings/Limitations.tsx` (VTID-02000; Spotlight is desktop-only).
 * The non-negotiable Discover filters: the live "currently filtered" counter
 * (`GET /user/limitations/impact`), allergies, dietary, medications,
 * pregnancy, budget and accessibility, each saved on its own with `PATCH
 * /user/limitations` (body = that section's fields, `./data/requests.ts`).
 * Loading shows a skeleton; a failed load toasts and leaves the empty form,
 * exactly as the web does.
 *
 * Deviations, both web defects not reproduced: the active-products count is
 * formatted as a number (the web passes it to `fmtDateTime`), and the tag
 * chip uses a real no-break space (the web catalog value carries a literal
 * `&nbsp;` entity). The web `SubNavigation` strip (desktop settings pages
 * that redirect into the hub on the phone) is not rendered.
 */
import { useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, PressableRow, Skeleton, Text, TextInput, useUITheme } from '../../ports/ui';
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SettingsIcon, type SettingsGlyph } from '../../ports/settings-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useLimitations, type Limitations } from './data/hooks';
import { formatDate, formatNumber } from './format';

const DIETARY_OPTIONS = ['vegan', 'vegetarian', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'nut-free', 'soy-free', 'sugar-free', 'organic'] as const;
const DIETARY_KEY: Record<(typeof DIETARY_OPTIONS)[number], string> = {
  vegan: 'vegan',
  vegetarian: 'vegetarian',
  halal: 'halal',
  kosher: 'kosher',
  'gluten-free': 'glutenFree',
  'dairy-free': 'dairyFree',
  'nut-free': 'nutFree',
  'soy-free': 'soyFree',
  'sugar-free': 'sugarFree',
  organic: 'organic',
};

function TagEditor({ label, icon, values, onChange, placeholder, testID }: { label: string; icon: SettingsGlyph; values: string[]; onChange: (next: string[]) => void; placeholder: string; testID: string }): ReactElement {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const add = () => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInput('');
  };
  return (
    <View style={styles.field} testID={testID}>
      <View style={styles.inline}>
        <SettingsIcon name={icon} size={16} />
        <Text size="sm" weight="500">
          {label}
        </Text>
      </View>
      <View style={styles.wrap}>
        {values.map((v) => (
          <PressableRow key={v} onPress={() => onChange(values.filter((x) => x !== v))} accessibilityLabel={t('settingsNative.limitations.removeTag', { v })} testID={`${testID}-tag-${v}`}>
            <Badge variant="secondary">{t('settingsNative.limitations.tag', { v })}</Badge>
          </PressableRow>
        ))}
        {values.length === 0 ? (
          <Text size="xs" muted>
            {t('screens.settings.noneAddedYet')}
          </Text>
        ) : null}
      </View>
      <View style={styles.inline}>
        <View style={styles.fill}>
          <TextInput value={input} onChangeText={setInput} placeholder={placeholder} onSubmitEditing={add} returnKeyType="done" accessibilityLabel={label} testID={`${testID}-input`} />
        </View>
        <Button variant="outline" onPress={add} disabled={!input.trim()} testID={`${testID}-add`}>
          {t('screens.settings.add')}
        </Button>
      </View>
    </View>
  );
}

function Panel({ icon, iconColor, title, note, description, children, testID }: { icon: SettingsGlyph; iconColor?: string; title: string; note?: string; description: string; children: ReactElement | ReactElement[]; testID: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]} testID={testID}>
      <View style={styles.inlineWrap}>
        <SettingsIcon name={icon} size={20} color={iconColor} />
        <Text weight="600" accessibilityRole="header">
          {title}
        </Text>
        {note ? (
          <Text size="xs" muted>
            {note}
          </Text>
        ) : null}
      </View>
      <Text size="sm" muted>
        {description}
      </Text>
      {children}
    </View>
  );
}

const centsToInput = (cents: number | null) => (cents !== null ? String(cents / 100) : '');
const inputToCents = (text: string) => (text === '' ? null : Math.round(Number(text) * 100));

export function LimitationsScreen(): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { loading, saving, state, setState, impact, lastVerified, save } = useLimitations();
  const set = (patch: Partial<Limitations>) => setState((s) => ({ ...s, ...patch }));
  const confirmed = (field: string) => (lastVerified[field] ? formatDate(lastVerified[field], locale) : t('settingsNative.limitations.never'));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} testID="screen-limitations" keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {t('screens.settings.preferencesLimitations')}
        </Text>
        <Text size="sm" muted>
          {t('settingsNative.limitations.description')}
        </Text>
      </View>

      {loading ? (
        <View style={styles.sections} testID="limitations-loading">
          <Skeleton style={styles.skeleton} />
          <Skeleton style={styles.skeleton} />
          <Skeleton style={styles.skeleton} />
        </View>
      ) : (
        <View style={styles.sections} testID="limitations-form">
          <View style={[styles.panel, styles.counter, { backgroundColor: colors.card, borderColor: colors.border }]} testID="limitations-counter">
            <View style={styles.fill}>
              <Text size="sm" muted>
                {t('screens.settings.currentlyFilteredFromYourFeed')}
              </Text>
              <Text size="2xl" weight="600" testID="limitations-hidden-total">
                {formatNumber(impact?.hidden_total_approx ?? 0, locale)}{' '}
                <Text size="sm" muted>
                  {t('settingsNative.limitations.ofActiveProducts', { count: formatNumber(impact?.total_active_products ?? 0, locale) })}
                </Text>
              </Text>
            </View>
            <SettingsIcon name="ShieldCheck" size={40} color={colors.statusSuccess} />
          </View>

          <Panel
            icon="AlertTriangle"
            iconColor={colors.statusError}
            title={t('screens.settings.allergies')}
            note={t('screens.settings.neverOverridable')}
            description={t('screens.settings.weWillNeverRecommendProductsContaining', { value0: ' ', value1: confirmed('allergies') })}
            testID="limitations-allergies"
          >
            <TagEditor label={t('settingsNative.limitations.allergens')} icon="AlertTriangle" values={state.allergies} onChange={(next) => set({ allergies: next })} placeholder={t('screens.settings.eGPeanutsShellfishLatex')} testID="allergies" />
            <Button onPress={() => void save({ allergies: state.allergies })} disabled={saving} testID="save-allergies">
              {t('screens.settings.saveAllergies')}
            </Button>
          </Panel>

          <Panel icon="Utensils" iconColor={colors.primary} title={t('screens.settings.dietaryRestrictions')} description={t('screens.settings.preferencesWeApplyUnlessYouExplicitly')} testID="limitations-dietary">
            <View style={styles.wrap}>
              {DIETARY_OPTIONS.map((v) => {
                const on = state.dietary_restrictions.includes(v);
                return (
                  <PressableRow
                    key={v}
                    onPress={() => set({ dietary_restrictions: on ? state.dietary_restrictions.filter((x) => x !== v) : [...state.dietary_restrictions, v] })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    testID={`dietary-${v}`}
                  >
                    <Badge variant={on ? 'default' : 'outline'}>{t(`settingsNative.limitations.dietary.${DIETARY_KEY[v]}`)}</Badge>
                  </PressableRow>
                );
              })}
            </View>
            <Button onPress={() => void save({ dietary_restrictions: state.dietary_restrictions })} disabled={saving} testID="save-dietary">
              {t('screens.settings.saveDietary')}
            </Button>
          </Panel>

          <Panel
            icon="Pill"
            iconColor={colors.primary}
            title={t('screens.settings.currentMedications')}
            note={t('screens.settings.interactionChecksApply')}
            description={t('screens.settings.weUseThisAvoidRecommendingSupplements', { value0: ' ', value1: confirmed('current_medications') })}
            testID="limitations-medications"
          >
            <TagEditor
              label={t('settingsNative.limitations.medicationsLabel')}
              icon="Pill"
              values={state.current_medications}
              onChange={(next) => set({ current_medications: next })}
              placeholder={t('screens.settings.eGSsriBloodthinnerStatin')}
              testID="medications"
            />
            <Button onPress={() => void save({ current_medications: state.current_medications })} disabled={saving} testID="save-medications">
              {t('screens.settings.saveMedications')}
            </Button>
          </Panel>

          <Panel icon="Baby" iconColor={colors.primary} title={t('screens.settings.pregnancyNursing')} description={t('screens.settings.someSupplementsContraindicatedDuringPregnancyNursi')} testID="limitations-pregnancy">
            <View style={styles.field}>
              <Label>{t('screens.settings.status')}</Label>
              <Select value={state.pregnancy_status ?? 'prefer_not_say'} onValueChange={(v) => set({ pregnancy_status: v })}>
                <SelectTrigger testID="pregnancy-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent testID="pregnancy">
                  <SelectItem value="not_pregnant" testID="pregnancy-not_pregnant">
                    {t('screens.settings.notPregnant')}
                  </SelectItem>
                  <SelectItem value="pregnant" testID="pregnancy-pregnant">
                    {t('screens.settings.pregnant')}
                  </SelectItem>
                  <SelectItem value="nursing" testID="pregnancy-nursing">
                    {t('screens.settings.nursing')}
                  </SelectItem>
                  <SelectItem value="prefer_not_say" testID="pregnancy-prefer_not_say">
                    {t('screens.settings.preferNotSay')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </View>
            <Button onPress={() => void save({ pregnancy_status: state.pregnancy_status })} disabled={saving} testID="save-pregnancy">
              {t('screens.settings.savePregnancyStatus')}
            </Button>
          </Panel>

          <Panel icon="Wallet" iconColor={colors.primary} title={t('screens.settings.budget')} description={t('screens.settings.productsAboveYourPerproductCeilingHidden')} testID="limitations-budget">
            <View style={styles.field}>
              <Label>{t('screens.settings.maxPerProductEur')}</Label>
              <TextInput
                keyboardType="numeric"
                value={centsToInput(state.budget_max_per_product_cents)}
                onChangeText={(v) => set({ budget_max_per_product_cents: inputToCents(v) })}
                placeholder={t('settingsNative.limitations.maxPlaceholder')}
                accessibilityLabel={t('screens.settings.maxPerProductEur')}
                testID="budget-max"
              />
            </View>
            <View style={styles.field}>
              <Label>{t('screens.settings.monthlyCapEurOptional')}</Label>
              <TextInput
                keyboardType="numeric"
                value={centsToInput(state.budget_monthly_cap_cents)}
                onChangeText={(v) => set({ budget_monthly_cap_cents: inputToCents(v) })}
                placeholder={t('settingsNative.limitations.capPlaceholder')}
                accessibilityLabel={t('screens.settings.monthlyCapEurOptional')}
                testID="budget-cap"
              />
            </View>
            <View style={styles.field}>
              <Label>{t('screens.settings.preferredPriceBand')}</Label>
              <Select value={state.budget_preferred_band ?? 'any'} onValueChange={(v) => set({ budget_preferred_band: v })}>
                <SelectTrigger testID="band-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent testID="band">
                  <SelectItem value="any">{t('screens.settings.any')}</SelectItem>
                  <SelectItem value="budget">{t('screens.settings.budgetfriendly')}</SelectItem>
                  <SelectItem value="mid">{t('screens.settings.midrange')}</SelectItem>
                  <SelectItem value="premium">{t('screens.settings.premium')}</SelectItem>
                </SelectContent>
              </Select>
            </View>
            <Button
              onPress={() =>
                void save({
                  budget_max_per_product_cents: state.budget_max_per_product_cents,
                  budget_monthly_cap_cents: state.budget_monthly_cap_cents,
                  budget_preferred_band: state.budget_preferred_band,
                })
              }
              disabled={saving}
              testID="save-budget"
            >
              {t('screens.settings.saveBudget')}
            </Button>
          </Panel>

          <Panel icon="Accessibility" iconColor={colors.primary} title={t('screens.settings.accessibility')} description={t('screens.settings.preferencesForFormFactorUsability')} testID="limitations-accessibility">
            <TagEditor
              label={t('settingsNative.limitations.accessibilityLabel')}
              icon="Accessibility"
              values={state.physical_accessibility_needs}
              onChange={(next) => set({ physical_accessibility_needs: next })}
              placeholder={t('screens.settings.eGLiquidformLargelabel')}
              testID="accessibility"
            />
            <Button onPress={() => void save({ physical_accessibility_needs: state.physical_accessibility_needs })} disabled={saving} testID="save-accessibility">
              {t('screens.settings.saveAccessibility')}
            </Button>
          </Panel>

          <Text size="xs" muted style={styles.footer}>
            {t('screens.settings.safetycriticalFieldsAllergiesMedicationsPregnancyR')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 96, gap: 24 },
  header: { gap: 4 },
  sections: { gap: 24 },
  skeleton: { height: 120, borderRadius: 16 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 12 },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  field: { gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineWrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fill: { flex: 1 },
  footer: { textAlign: 'center', paddingTop: 16 },
});
