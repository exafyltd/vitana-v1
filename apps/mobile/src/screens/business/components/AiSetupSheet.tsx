/**
 * VTID-05524 — native twin of src/components/commerce/AiSetupSheet.tsx ("Set
 * up with AI"): 1. your website → Vitana reads it (nothing saved), 2. review
 * name / category / country and the products found (each editable, a
 * product without a price needs one or is left out), 3. one tap on "Create
 * my business" writes everything. With a business selected the products go to
 * it. A retry reuses the same setup key. "Prefer to fill it in yourself" is
 * always one tap away. All rules from `@vitana/core` (requestDraft,
 * reviewFromDraft, reviewProblem, applyPayload, applyDraft, draftErrorKey).
 *
 * Voice ("Talk to Vitana"): the web shows it only when the loaded orb widget
 * can start a commerce setup (`canTalkToVitana()`); the native ORB does not
 * run commerce-setup host events yet (apps/mobile/src/orb/protocol.ts
 * IGNORED_DIRECTIVE_PREFIXES `commerce_setup_` → N6e), so the button is not
 * shown — the web's own rule. The sheet still listens on the native overlay
 * bus for `vitana:commerce-setup-reading` / `-failed` (and the portal for
 * `-draft`), so the voice draft lands here the day the ORB forwards it.
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { Button, PressableRow, Text, useUITheme } from '../../../ports/ui';
import {
  BizIcon,
  Checkbox,
  Input,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '../../../ports/business-ui';
import {
  COMMERCE_CATEGORIES,
  VOICE_SETUP_EVENTS,
  applyDraft,
  applyPayload,
  draftErrorKey,
  errorFromVoiceEvent,
  fetchCompanySuggestions,
  guessCountry,
  isValidWebsite,
  newSetupKey,
  normalizeWebsite,
  requestDraft,
  reviewFromDraft,
  reviewProblem,
  type ApplyOutcome,
  type BusinessCategory,
  type MyOrgRow,
  type ReviewState,
  type SetupDraft,
} from '../../../ports/commerce';
import { useBusEvent } from '../../../navigation/overlay-bus';
import { useI18n } from '../../../i18n/I18nProvider';
import { commerceFetch } from '../data/client';
import { countryOptions, deviceLanguages } from '../format';
import { BusinessContext } from './BusinessContext';
import { Busy, ErrorAlert, Field, SelectField } from './parts';

type Step = 'website' | 'reading' | 'review' | 'saving' | 'done';

export function AiSetupSheet({
  open,
  onOpenChange,
  org = null,
  orgs = [],
  onSelectOrg,
  onDone,
  onPreferManual,
  initialDraft = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org?: MyOrgRow | null;
  orgs?: MyOrgRow[];
  onSelectOrg?: (id: string) => void;
  onDone: (outcome: ApplyOutcome) => void | Promise<void>;
  onPreferManual: () => void;
  initialDraft?: SetupDraft | null;
}): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const [step, setStep] = useState<Step>('website');
  const [website, setWebsite] = useState('');
  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const setupKey = useRef('');
  const currentDraft = useRef<SetupDraft | null>(null);
  const countries = useMemo(() => (open ? countryOptions(language) : []), [open, language]);

  const startReview = (d: SetupDraft) => {
    const fallback = guessCountry(deviceLanguages());
    currentDraft.current = d;
    setDraft(d);
    setReview(reviewFromDraft(d, fallback));
    setupKey.current = newSetupKey(() => Crypto.randomUUID());
    setStep('review');
    if (!d.business.country && d.website) {
      void fetchCompanySuggestions(commerceFetch, { website: d.website }).then((s) => {
        const c = s.country;
        if (!c || c.source !== 'website_domain' || currentDraft.current !== d) return;
        setReview((r) => (r && r.country === fallback ? { ...r, country: c.value } : r));
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    setError('');
    setOutcome(null);
    if (initialDraft) startReview(initialDraft);
    else {
      setStep('website');
      setDraft(null);
      setReview(null);
    }
  }, [open, initialDraft]);

  useBusEvent<{ website?: unknown }>(
    VOICE_SETUP_EVENTS.reading,
    (detail) => {
      if (typeof detail?.website === 'string') setWebsite(detail.website);
      setError('');
      setStep((s) => (s === 'website' ? 'reading' : s));
    },
    open,
  );
  useBusEvent(
    VOICE_SETUP_EVENTS.failed,
    (detail) => {
      setError(t(draftErrorKey(errorFromVoiceEvent(detail))));
      setStep((s) => (s === 'reading' ? 'website' : s));
    },
    open,
  );

  const websiteOk = website.trim() !== '' && isValidWebsite(website);

  const read = async () => {
    if (!websiteOk) return;
    setError('');
    setStep('reading');
    try {
      startReview(await requestDraft(commerceFetch, normalizeWebsite(website)));
    } catch (e) {
      setError(t(draftErrorKey(e instanceof Error ? e.message : '')));
      setStep('website');
    }
  };

  const problem = review ? reviewProblem(review) : null;
  const included = review?.products.filter((p) => p.include).length ?? 0;

  const create = async () => {
    if (!draft || !review || problem) return;
    setError('');
    setStep('saving');
    try {
      const result = await applyDraft(commerceFetch, applyPayload(draft, review, setupKey.current, org?.id ?? null));
      setOutcome(result);
      setStep('done');
      await onDone(result);
    } catch {
      setError(t('screens.commerceportal.aiSetup.errorCreate'));
      setStep('review');
    }
  };

  const patch = (p: Partial<ReviewState>) => setReview((r) => (r ? { ...r, ...p } : r));
  const patchProduct = (i: number, p: Partial<ReviewState['products'][number]>) => setReview((r) => (r ? { ...r, products: r.products.map((x, j) => (j === i ? { ...x, ...p } : x)) } : r));
  const preferManual = () => {
    onOpenChange(false);
    onPreferManual();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(next: boolean) => (step === 'saving' ? undefined : onOpenChange(next))}>
      <ResponsiveDialogContent fullscreenOnMobile testID="ai-setup">
        <ResponsiveDialogHeader>
          <BizIcon name={step === 'done' ? 'PartyPopper' : 'Sparkles'} size={step === 'done' ? 32 : 28} color={colors.primary} />
          <ResponsiveDialogTitle>
            <Text size="2xl" weight="700">
              {step === 'done' ? t('screens.commerceportal.aiSetup.doneTitle') : step === 'review' || step === 'saving' ? t('screens.commerceportal.aiSetup.reviewTitle') : t('screens.commerceportal.aiSetup.title')}
            </Text>
          </ResponsiveDialogTitle>
          {org && step !== 'done' ? <BusinessContext org={org} orgs={orgs} onSelectOrg={onSelectOrg} /> : null}
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <View style={styles.stack}>
            {error ? <ErrorAlert text={error} testID="ai-error" /> : null}

            {step === 'website' || step === 'reading' ? (
              <View style={styles.gap}>
                <Text>{t('screens.commerceportal.aiSetup.lead')}</Text>
                <Field label={t('screens.commerceportal.aiSetup.websiteLabel')} hint={t('screens.commerceportal.aiSetup.websiteHint')}>
                  <Input
                    type="url"
                    value={website}
                    onChangeText={setWebsite}
                    onSubmitEditing={() => void read()}
                    placeholder={t('screens.commerceportal.aiSetup.websitePlaceholder')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    disabled={step === 'reading'}
                    testID="ai-website"
                    accessibilityLabel={t('screens.commerceportal.aiSetup.websiteLabel')}
                  />
                </Field>
                {step === 'reading' ? <Busy text={t('screens.commerceportal.aiSetup.reading')} testID="ai-reading" /> : null}
              </View>
            ) : null}

            {(step === 'review' || step === 'saving') && draft && review ? (
              <>
                {!org ? (
                  <View style={styles.gap}>
                    <Field label={t('screens.commerceportal.orgOnboarding.orgName')}>
                      <Input value={review.displayName} onChangeText={(v: string) => patch({ displayName: v })} testID="ai-name" accessibilityLabel={t('screens.commerceportal.orgOnboarding.orgName')} />
                    </Field>
                    <Field label={t('screens.commerceportal.aiSetup.category')}>
                      <SelectField
                        value={review.category}
                        onChange={(v) => patch({ category: v as BusinessCategory })}
                        options={COMMERCE_CATEGORIES.map((c) => ({ value: c.key, label: t(c.labelKey) }))}
                        accessibilityLabel={t('screens.commerceportal.aiSetup.category')}
                        testID="ai-category"
                      />
                    </Field>
                    <Field label={t('screens.commerceportal.orgOnboarding.country')}>
                      <SelectField
                        value={review.country}
                        onChange={(v) => patch({ country: v })}
                        options={countries.map((c) => ({ value: c.code, label: c.name }))}
                        placeholder={t('screens.commerceportal.orgOnboarding.countryPlaceholder')}
                        accessibilityLabel={t('screens.commerceportal.orgOnboarding.country')}
                        testID="ai-country"
                      />
                    </Field>
                  </View>
                ) : null}
                <View style={styles.gap}>
                  <Text size="sm" weight="600" testID="ai-products-count">
                    {review.products.length > 0 ? t('screens.commerceportal.aiSetup.productsFound', { count: review.products.length }) : t('screens.commerceportal.aiSetup.noProducts')}
                  </Text>
                  <View style={styles.gap} testID="ai-products">
                    {review.products.map((p, i) => (
                      <View key={`${p.title}-${i}`} style={[styles.product, { borderColor: colors.border, borderStyle: p.include ? 'solid' : 'dashed', opacity: p.include ? 1 : 0.6 }]} testID={`ai-product-${i}`}>
                        <PressableRow
                          onPress={() => patchProduct(i, { include: !p.include })}
                          accessibilityRole="button"
                          accessibilityState={{ checked: p.include }}
                          accessibilityLabel={t('screens.commerceportal.aiSetup.includeProduct', { title: p.title })}
                          testID={`ai-include-${i}`}
                          style={styles.check}
                        >
                          <Checkbox checked={p.include} onCheckedChange={(v: boolean | 'indeterminate') => patchProduct(i, { include: v === true })} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                        </PressableRow>
                        <View style={[styles.fill, styles.gap]}>
                          <Input value={p.title} onChangeText={(v: string) => patchProduct(i, { title: v })} accessibilityLabel={t('screens.commerceportal.aiSetup.productTitle')} disabled={!p.include} testID={`ai-title-${i}`} />
                          <View style={styles.inline}>
                            <Input
                              value={p.priceText}
                              onChangeText={(v: string) => patchProduct(i, { priceText: v })}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                              accessibilityLabel={t('screens.commerceportal.aiSetup.price')}
                              aria-invalid={p.include && !p.priceText.trim()}
                              disabled={!p.include}
                              style={styles.price}
                              testID={`ai-price-${i}`}
                            />
                            <Text size="sm" muted>
                              {p.currency ?? draft.business.currency ?? 'EUR'}
                            </Text>
                            {p.include && !p.priceText.trim() ? (
                              <Text size="xs" color={colors.destructive}>
                                {t('screens.commerceportal.aiSetup.priceMissing')}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                  {draft.notes.map((n) => (
                    <Text key={n} size="xs" muted>
                      {`• ${n}`}
                    </Text>
                  ))}
                  <Text size="xs" muted>
                    {t('screens.commerceportal.aiSetup.draftsHint')}
                  </Text>
                </View>
              </>
            ) : null}

            {step === 'done' && outcome ? (
              <View style={[styles.done, { borderColor: colors.border, backgroundColor: colors.accent }]} testID="ai-done">
                <Text size="lg" weight="600">
                  {outcome.organization.display_name}
                </Text>
                <Text>{t('screens.commerceportal.aiSetup.doneBody', { count: outcome.products_added + outcome.products_replayed })}</Text>
              </View>
            ) : null}
          </View>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter style={styles.gap}>
          {step === 'website' || step === 'reading' ? (
            <Button onPress={() => void read()} disabled={!websiteOk || step === 'reading'} testID="ai-read" style={styles.primary}>
              {t('screens.commerceportal.aiSetup.readCta')}
            </Button>
          ) : null}
          {step === 'review' || step === 'saving' ? (
            <Button onPress={() => void create()} disabled={!!problem || step === 'saving'} testID="ai-create" style={styles.primary}>
              {org ? t('screens.commerceportal.aiSetup.addCta', { count: included }) : t('screens.commerceportal.aiSetup.createCta')}
            </Button>
          ) : null}
          {step === 'done' ? (
            <Button onPress={() => onOpenChange(false)} testID="ai-continue" style={styles.primary}>
              {t('screens.commerceportal.orgOnboarding.successCta')}
            </Button>
          ) : null}
          {step !== 'done' && step !== 'saving' ? (
            <Button variant="link" onPress={preferManual} testID="ai-prefer-manual">
              {t('screens.commerceportal.aiSetup.preferManual')}
            </Button>
          ) : null}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  gap: { gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  product: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12 },
  check: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  price: { width: 128 },
  fill: { flex: 1, minWidth: 0 },
  done: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  primary: { minHeight: 48, alignSelf: 'stretch' },
});
