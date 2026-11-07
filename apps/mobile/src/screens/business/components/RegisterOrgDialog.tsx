/**
 * VTID-05524 — native twin of src/components/commerce/RegisterOrgDialog.tsx
 * ("Register your business": 1. what does it offer, 2. name / website
 * (optional) / country, → "You're registered" + "Continue setup").
 *
 * Same request (`registerBusiness` from `@vitana/core`: `POST
 * /partner-orgs/register`, the short name derived from the business name and
 * retried on a clash), same company suggestions (prefill only empty fields,
 * never a country the supplier picked, a stale answer ignored), same draft
 * that survives closing the sheet (per-device AsyncStorage under the web's key
 * instead of localStorage), same step-title-is-largest rule, same full-screen
 * sheet on the phone. Nothing is asked that the web does not ask.
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, notifyError, useUITheme } from '../../../ports/ui';
import {
  BizIcon,
  Input,
  Label,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  withAlpha,
} from '../../../ports/business-ui';
import {
  COMMERCE_CATEGORIES,
  NO_SUGGESTIONS,
  PARTNER_ORGS_API,
  REGISTER_DRAFT_KEY,
  commerceVerticalForCategory,
  fetchCompanySuggestions,
  guessCountry,
  isValidWebsite,
  registerBusiness,
  suggestionSourceKey,
  type CompanySuggestions,
  type MyOrgRow,
} from '../../../ports/commerce';
import { deviceStorage } from '../../../identity/device-storage';
import { useI18n } from '../../../i18n/I18nProvider';
import { commerceFetch } from '../data/client';
import { countryOptions, deviceLanguages } from '../format';
import { ChoiceRow, Field, SelectField } from './parts';

const EMPTY_FORM = { category: '', display_name: '', website: '', country: '' };
type Form = typeof EMPTY_FORM;
const TOTAL_STEPS = 2;

async function readDraft(): Promise<{ step: number; form: Form } | null> {
  try {
    const raw = await deviceStorage.getItem(REGISTER_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { step: d.step === 1 ? 1 : 0, form: { ...EMPTY_FORM, ...d.form } };
  } catch {
    return null;
  }
}

const writeDraft = (step: number, form: Form) => void deviceStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify({ step, form }));
const clearDraft = () => void deviceStorage.removeItem(REGISTER_DRAFT_KEY);

export function RegisterOrgDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (org: MyOrgRow | null) => void | Promise<void> }): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [created, setCreated] = useState<MyOrgRow | null>(null);
  const [ready, setReady] = useState(false);
  const countries = useMemo(() => (open ? countryOptions(language) : []), [open, language]);
  const [suggestions, setSuggestions] = useState<CompanySuggestions>(NO_SUGGESTIONS);
  const countryPicked = useRef(false);
  const [countryEditing, setCountryEditing] = useState(false);
  const suggestionSeq = useRef(0);

  const applySuggestions = (s: CompanySuggestions) => {
    setSuggestions(s);
    setForm((f) => ({
      ...f,
      website: f.website.trim() ? f.website : (s.website?.value ?? f.website),
      country: countryPicked.current || !s.country ? f.country : s.country.value,
    }));
  };
  const requestSuggestions = (website: string) => {
    const seq = ++suggestionSeq.current;
    void fetchCompanySuggestions(commerceFetch, { website }).then((s) => {
      if (seq === suggestionSeq.current) applySuggestions(s);
    });
  };

  // Resume a draft (or preselect the country) each time the sheet opens.
  useEffect(() => {
    if (!open || created) return undefined;
    let live = true;
    setReady(false);
    void readDraft().then((draft) => {
      if (!live) return;
      let website = '';
      if (draft) {
        setStep(draft.step);
        setForm(draft.form);
        website = draft.form.website;
      } else {
        setForm((f) => (f.country ? f : { ...f, country: guessCountry(deviceLanguages()) }));
      }
      countryPicked.current = !!draft?.form.country;
      setCountryEditing(false);
      setReady(true);
      requestSuggestions(website);
    });
    return () => {
      live = false;
      suggestionSeq.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && !created && ready) writeDraft(step, form);
  }, [open, created, ready, step, form]);

  const update = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const create = async () => {
    setCreating(true);
    try {
      const res = await registerBusiness(
        PARTNER_ORGS_API,
        { displayName: form.display_name, category: form.category, commerceVertical: commerceVerticalForCategory(form.category), website: form.website, country: form.country },
        commerceFetch,
      );
      clearDraft();
      const org: MyOrgRow | null = res?.organization ? { ...res.organization, role: 'org_admin' } : null;
      setCreated(org);
      await onCreated(org);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/website/i.test(msg)) notifyError('screens.commerceportal.orgOnboarding.websiteInvalid');
      else notifyError('screens.commerceportal.orgOnboarding.createFailed');
    } finally {
      setCreating(false);
    }
  };

  const close = () => {
    onOpenChange(false);
    if (created) {
      setCreated(null);
      setStep(0);
      setForm(EMPTY_FORM);
    }
  };

  const websiteOk = isValidWebsite(form.website);
  const suggestedCountry = suggestions.country;
  const countryConfirmLine = !countryEditing && !!suggestedCountry && form.country === suggestedCountry.value;
  const countryName = countries.find((c) => c.code === form.country)?.name ?? form.country;
  const websiteFromEmail = !!suggestions.website && form.website === suggestions.website.value;
  const stepValid = [!!form.category, !!form.display_name.trim() && !!form.country && websiteOk][step];
  const stepTitleKey = ['screens.commerceportal.orgOnboarding.wizardStep1Title', 'screens.commerceportal.orgOnboarding.wizardStep2Title'][step];
  const sourceKey = suggestedCountry ? suggestionSourceKey(suggestedCountry.source) : null;

  return (
    <ResponsiveDialog open={open} onOpenChange={(next: boolean) => (next ? onOpenChange(true) : close())}>
      <ResponsiveDialogContent fullscreenOnMobile testID="register-org">
        {created ? (
          <>
            <ResponsiveDialogHeader>
              <BizIcon name="PartyPopper" size={32} color={colors.primary} />
              <ResponsiveDialogTitle>
                <Text size="2xl" weight="700">
                  {t('screens.commerceportal.orgOnboarding.successTitle')}
                </Text>
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>
              <View style={[styles.success, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: withAlpha(colors.accent, 0.6) }]} testID="register-success">
                <Text size="lg" weight="600">
                  {created.display_name}
                </Text>
                <Text size="xs" weight="500" muted style={styles.caps}>
                  {t('screens.commerceportal.orgOnboarding.successBusinessId')}
                </Text>
                <Text size="sm" weight="600" style={styles.mono}>
                  {created.org_key}
                </Text>
              </View>
              <Text>{t('screens.commerceportal.orgOnboarding.successBody')}</Text>
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button onPress={close} testID="register-continue-setup" style={styles.primary}>
                {t('screens.commerceportal.orgOnboarding.successCta')}
              </Button>
            </ResponsiveDialogFooter>
          </>
        ) : (
          <>
            <ResponsiveDialogHeader>
              <Text size="xs" weight="500" muted style={styles.caps}>
                {t('screens.commerceportal.orgOnboarding.wizardStepOf', { current: step + 1, total: TOTAL_STEPS })}
              </Text>
              <ResponsiveDialogTitle>
                <Text size="2xl" weight="700" testID="register-step-title">
                  {t(stepTitleKey)}
                </Text>
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>
              {step === 0 ? (
                <View style={styles.list}>
                  {COMMERCE_CATEGORIES.map((cat) => (
                    <ChoiceRow
                      key={cat.key}
                      title={t(cat.labelKey)}
                      selected={form.category === cat.key}
                      onPress={() => update({ category: cat.key })}
                      testID={`register-category-${cat.key}`}
                      trailing={form.category === cat.key ? <BizIcon name="Check" size={16} color={colors.primary} /> : null}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.list}>
                  <Field label={t('screens.commerceportal.orgOnboarding.orgName')}>
                    <Input value={form.display_name} onChangeText={(v: string) => update({ display_name: v })} autoComplete="organization-title" autoFocus testID="register-name" accessibilityLabel={t('screens.commerceportal.orgOnboarding.orgName')} />
                  </Field>
                  <Field
                    label={
                      <Label>
                        {`${t('screens.commerceportal.orgOnboarding.website')} `}
                        <Text size="sm" muted>
                          {t('screens.commerceportal.orgOnboarding.optional')}
                        </Text>
                      </Label>
                    }
                    hint={!websiteOk ? t('screens.commerceportal.orgOnboarding.websiteInvalid') : websiteFromEmail ? t('screens.commerceportal.orgOnboarding.fromEmail') : t('screens.commerceportal.orgOnboarding.websiteHint')}
                    hintTone={websiteOk ? 'muted' : 'error'}
                  >
                    <Input
                      type="url"
                      value={form.website}
                      onChangeText={(v: string) => update({ website: v })}
                      onBlur={() => {
                        if (isValidWebsite(form.website)) requestSuggestions(form.website);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      aria-invalid={!websiteOk}
                      testID="register-website"
                      accessibilityLabel={t('screens.commerceportal.orgOnboarding.website')}
                    />
                  </Field>
                  {countryConfirmLine && suggestedCountry ? (
                    <View style={[styles.confirm, { borderColor: colors.border }]} testID="register-country-confirm">
                      <View style={styles.fill}>
                        <Text weight="500">{t('screens.commerceportal.orgOnboarding.countryConfirm', { name: countryName })}</Text>
                        {sourceKey ? (
                          <Text size="xs" muted>
                            {t(sourceKey)}
                          </Text>
                        ) : null}
                      </View>
                      <Button variant="link" onPress={() => setCountryEditing(true)} testID="register-country-change">
                        {t('screens.commerceportal.orgOnboarding.change')}
                      </Button>
                    </View>
                  ) : (
                    <Field label={t('screens.commerceportal.orgOnboarding.country')}>
                      <SelectField
                        value={form.country}
                        onChange={(v) => {
                          countryPicked.current = true;
                          update({ country: v });
                        }}
                        options={countries.map((c) => ({ value: c.code, label: c.name }))}
                        placeholder={t('screens.commerceportal.orgOnboarding.countryPlaceholder')}
                        accessibilityLabel={t('screens.commerceportal.orgOnboarding.country')}
                        testID="register-country-select"
                      />
                    </Field>
                  )}
                </View>
              )}
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter style={styles.footer}>
              {step > 0 ? (
                <Button variant="outline" onPress={() => setStep((s) => s - 1)} disabled={creating} testID="register-back" style={styles.back}>
                  <BizIcon name="ChevronLeft" size={16} flip />
                  {t('screens.commerceportal.orgOnboarding.wizardBack')}
                </Button>
              ) : null}
              {step < TOTAL_STEPS - 1 ? (
                <Button onPress={() => setStep((s) => s + 1)} disabled={!stepValid} testID="register-next" style={styles.primary}>
                  {t('screens.commerceportal.orgOnboarding.wizardNext')}
                </Button>
              ) : (
                <Button onPress={() => void create()} disabled={creating || !stepValid} testID="register-create" style={styles.primary}>
                  {creating ? t('screens.commerceportal.orgOnboarding.creating') : t('screens.commerceportal.orgOnboarding.create')}
                </Button>
              )}
            </ResponsiveDialogFooter>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  success: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 4, marginBottom: 16 },
  caps: { textTransform: 'uppercase', letterSpacing: 0.5 },
  mono: { fontFamily: 'monospace', writingDirection: 'ltr' },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12 },
  fill: { flex: 1, minWidth: 0 },
  footer: { flexDirection: 'row', gap: 8 },
  primary: { flex: 1, minHeight: 48 },
  back: { minHeight: 48 },
});
