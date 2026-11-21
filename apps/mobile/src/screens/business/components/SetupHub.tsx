/**
 * VTID-05524 — native twin of src/components/commerce/SetupHub.tsx ("Get
 * ready to sell"): the registered business's readiness from server facts
 * only (`GET /partner-onboarding/:orgId` + `/catalogue`), the five steps with
 * their actions, the partner-terms row (accept / re-accept), "Still needed",
 * Submit / Resubmit for verification after a confirm (`POST …/submit`, the
 * server decides, the hub shows what it said) and the business-profile sheet
 * (website + country, suggested values, `PATCH …/company`).
 *
 * Every rule is the web's own from `@vitana/core` (deriveSetupSteps,
 * openSteps, reviewNote, submitMode, submitResultFor, readinessPercent).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, PressableRow, Text, notifyError, useUITheme } from '../../../ports/ui';
import {
  BizIcon,
  Input,
  Label,
  Progress,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  withAlpha,
} from '../../../ports/business-ui';
import {
  NO_SUGGESTIONS,
  PARTNER_ONBOARDING_API,
  SETUP_STATE_LABEL,
  SETUP_STEP_COPY,
  SETUP_SUBMIT_RESULT_COPY,
  deriveSetupSteps,
  fetchCompanySuggestions,
  isValidWebsite,
  normalizeWebsite,
  openSteps,
  parseChecklist,
  readinessPercent,
  reviewNote,
  submitMode,
  submitResultFor,
  suggestionSourceKey,
  type CompanySuggestions,
  type HubFacts,
  type HubStep,
  type MyOrgRow,
  type StepState,
  type SubmitResult,
  type TermsStatus,
} from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { commerceFetch } from '../data/client';
import { countryOptions } from '../format';
import { OrgSelect } from './BusinessContext';
import { PartnerTermsSheet, fetchPartnerTerms } from './PartnerTermsSheet';
import { CenterSpinner, Field, SelectField } from './parts';

function StateIcon({ state }: { state: StepState }): ReactElement {
  const { colors } = useUITheme();
  if (state === 'done') return <BizIcon name="CheckCircle2" size={24} color={colors.statusSuccess} />;
  if (state === 'in_progress') return <BizIcon name="Clock" size={24} color={colors.statusWarning} />;
  if (state === 'attention') return <BizIcon name="TriangleAlert" size={24} color={colors.statusError} />;
  return <BizIcon name="Circle" size={24} color={withAlpha(colors.mutedForeground, 0.6)} />;
}

/** The web's `data-state` on a row, as a hidden marker the tests read. */
function StateMark({ id, state }: { id: string; state: string }): ReactElement {
  return <View testID={`${id}-state-${state}`} style={styles.mark} />;
}

function TermsRow({ status, onOpen }: { status: Exclude<TermsStatus, { kind: 'not_published' }>; onOpen: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const K = 'screens.commerceportal.terms';
  if (status.kind === 'accepted') {
    return (
      <View style={[styles.row, { borderColor: colors.border }]} testID="setup-terms">
        <StateMark id="setup-terms" state="done" />
        <BizIcon name="CheckCircle2" size={24} color={colors.statusSuccess} />
        <View style={styles.fill}>
          <Text weight="600">{t(`${K}.rowTitle`)}</Text>
          <Text size="sm" muted>
            {t(`${K}.rowAccepted`, { version: status.terms.version })}
          </Text>
        </View>
        <Button variant="link" onPress={onOpen} testID="setup-terms-view">
          {t(`${K}.view`)}
        </Button>
      </View>
    );
  }
  const reaccept = status.reacceptance;
  return (
    <PressableRow
      onPress={onOpen}
      testID="setup-terms"
      accessibilityLabel={t(reaccept ? `${K}.rowReacceptTitle` : `${K}.rowTitle`)}
      style={[styles.row, reaccept ? { borderColor: withAlpha(colors.statusWarning, 0.4), backgroundColor: colors.statusWarningSubtle } : { borderColor: colors.border }]}
    >
      <StateMark id="setup-terms" state={reaccept ? 'reaccept' : 'todo'} />
      <BizIcon name={reaccept ? 'TriangleAlert' : 'ShieldCheck'} size={24} color={reaccept ? colors.statusWarning : withAlpha(colors.mutedForeground, 0.7)} />
      <View style={styles.fill}>
        <Text weight="600">{t(reaccept ? `${K}.rowReacceptTitle` : `${K}.rowTitle`)}</Text>
        <Text size="sm" muted>
          {t(reaccept ? `${K}.rowReacceptBody` : `${K}.rowBody`, { version: status.terms.version })}
        </Text>
      </View>
      <View style={styles.action}>
        <Text size="sm" weight="600" color={colors.primary}>
          {t(`${K}.rowCta`)}
        </Text>
        <BizIcon name="ChevronRight" size={16} color={colors.primary} flip />
      </View>
    </PressableRow>
  );
}

function ProfileSheet({
  open,
  onOpenChange,
  orgId,
  initialCountry,
  initialWebsite,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  initialCountry: string;
  initialWebsite: string;
  onSaved: () => void;
}): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const [country, setCountry] = useState(initialCountry);
  const [website, setWebsite] = useState(initialWebsite);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<CompanySuggestions>(NO_SUGGESTIONS);
  const [editing, setEditing] = useState(false);
  const countries = useMemo(() => (open ? countryOptions(language) : []), [open, language]);

  useEffect(() => {
    if (!open) return undefined;
    setCountry(initialCountry);
    setWebsite(initialWebsite);
    setSuggestions(NO_SUGGESTIONS);
    setEditing(false);
    let live = true;
    void fetchCompanySuggestions(commerceFetch, { orgId }).then((s) => {
      if (!live) return;
      setSuggestions(s);
      if (!initialCountry && s.country) setCountry((c) => c || s.country!.value);
      if (!initialWebsite && s.website) setWebsite((w) => (w.trim() ? w : s.website!.value));
    });
    return () => {
      live = false;
    };
  }, [open, orgId, initialCountry, initialWebsite]);

  const countryName = countries.find((c) => c.code === country)?.name ?? country;
  const countrySourceKey = !initialCountry && suggestions.country?.value === country ? suggestionSourceKey(suggestions.country.source) : null;
  const websiteSourceKey = !initialWebsite && suggestions.website?.value === website ? suggestionSourceKey(suggestions.website.source) : null;
  const summary = !editing && !!country && !!website.trim() && isValidWebsite(website);

  const save = async () => {
    setSaving(true);
    try {
      const w = normalizeWebsite(website);
      await commerceFetch(`${PARTNER_ONBOARDING_API}/${orgId}/company`, { method: 'PATCH', body: JSON.stringify({ country, ...(w ? { website: w } : {}) }) });
      onOpenChange(false);
      onSaved();
    } catch {
      notifyError('screens.commerceportal.setupHub.profileSaveFailed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent fullscreenOnMobile testID="profile-sheet">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            <Text size="2xl" weight="700">
              {t(summary ? 'screens.commerceportal.setupHub.profileConfirmTitle' : 'screens.commerceportal.setupHub.profileTitle')}
            </Text>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {summary ? (
            <View style={[styles.summary, { borderColor: colors.border }]} testID="profile-summary">
              <View>
                <Text size="xs" muted>
                  {t('screens.commerceportal.orgOnboarding.country')}
                </Text>
                <Text weight="500" testID="profile-summary-country">
                  {countryName}
                </Text>
                {countrySourceKey ? (
                  <Text size="xs" muted>
                    {t(countrySourceKey)}
                  </Text>
                ) : null}
              </View>
              <View>
                <Text size="xs" muted>
                  {t('screens.commerceportal.orgOnboarding.website')}
                </Text>
                <Text weight="500" testID="profile-summary-website" style={styles.ltr}>
                  {website}
                </Text>
                {websiteSourceKey ? (
                  <Text size="xs" muted>
                    {t(websiteSourceKey)}
                  </Text>
                ) : null}
              </View>
              <Button variant="link" onPress={() => setEditing(true)} testID="profile-change" style={styles.selfStart}>
                {t('screens.commerceportal.orgOnboarding.change')}
              </Button>
            </View>
          ) : (
            <View style={styles.stack}>
              <Field
                label={
                  <Label>
                    {`${t('screens.commerceportal.orgOnboarding.website')} `}
                    <Text size="sm" muted>
                      {t('screens.commerceportal.orgOnboarding.optional')}
                    </Text>
                  </Label>
                }
                hint={websiteSourceKey ? t(websiteSourceKey) : null}
              >
                <Input
                  type="url"
                  value={website}
                  onChangeText={(v: string) => {
                    setEditing(true);
                    setWebsite(v);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="profile-website"
                  accessibilityLabel={t('screens.commerceportal.orgOnboarding.website')}
                />
              </Field>
              <Field label={t('screens.commerceportal.orgOnboarding.country')} hint={countrySourceKey ? t(countrySourceKey) : null}>
                <SelectField
                  value={country}
                  onChange={(v) => {
                    setEditing(true);
                    setCountry(v);
                  }}
                  options={countries.map((c) => ({ value: c.code, label: c.name }))}
                  placeholder={t('screens.commerceportal.orgOnboarding.countryPlaceholder')}
                  accessibilityLabel={t('screens.commerceportal.orgOnboarding.country')}
                  testID="profile-country"
                />
              </Field>
            </View>
          )}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button onPress={() => void save()} disabled={saving || !country || !isValidWebsite(website)} testID="profile-save" style={styles.primary}>
            {t('screens.commerceportal.setupHub.profileSave')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function SetupHub({
  orgs,
  activeOrgId,
  onSelectOrg,
  onAddProducts,
  onSalesSetup,
  refreshKey = 0,
}: {
  orgs: MyOrgRow[];
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
  onAddProducts: () => void;
  onSalesSetup?: () => void;
  refreshKey?: number;
}): ReactElement | null {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const org = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  const [facts, setFacts] = useState<HubFacts | null>(null);
  const [failed, setFailed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [terms, setTerms] = useState<TermsStatus | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const submittingRef = useRef(false);

  const loadTerms = useCallback(async () => {
    if (!org) return;
    try {
      setTerms(await fetchPartnerTerms(org.id, language));
    } catch {
      setTerms(null);
    }
  }, [org, language]);

  const load = useCallback(async () => {
    if (!org) return;
    setFailed(false);
    try {
      const [ob, cat] = await Promise.all([commerceFetch(`${PARTNER_ONBOARDING_API}/${org.id}`), commerceFetch(`${PARTNER_ONBOARDING_API}/${org.id}/catalogue`)]);
      setFacts({
        country: ob?.organization?.country ?? null,
        website: ob?.organization?.website ?? null,
        lifecycleState: ob?.organization?.lifecycle_state ?? org.lifecycle_state ?? null,
        productCount: Array.isArray(cat?.products) ? cat.products.length : 0,
        hasMerchant: !!cat?.merchant,
        checklist: parseChecklist(ob?.checklist),
      });
    } catch {
      setFailed(true);
    }
  }, [org]);

  useEffect(() => {
    setFacts(null);
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    setSubmitResult(null);
  }, [org?.id]);

  useEffect(() => {
    setTerms(null);
    void loadTerms();
  }, [loadTerms, refreshKey]);

  const submit = async () => {
    if (!org || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const r = await commerceFetch(`${PARTNER_ONBOARDING_API}/${org.id}/submit`, { method: 'POST' });
      const after: string | null = r?.organization?.lifecycle_state ?? null;
      setFacts((f) =>
        f
          ? {
              ...f,
              country: r?.organization?.country ?? f.country,
              website: r?.organization?.website ?? f.website,
              lifecycleState: after ?? f.lifecycleState,
              checklist: parseChecklist(r?.checklist) ?? f.checklist,
            }
          : f,
      );
      setSubmitResult(submitResultFor(after, r?.transitions));
    } catch {
      setSubmitResult('failed');
      void load();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const steps = useMemo(() => (facts ? deriveSetupSteps(facts) : []), [facts]);
  const open = useMemo(() => (facts && facts.lifecycleState !== 'live' ? openSteps(facts.checklist) : []), [facts]);
  const note = facts ? reviewNote(facts.checklist) : null;
  const mode = facts ? submitMode(facts) : null;
  if (!org) return null;

  const action = (id: HubStep['id'], state: StepState): { label: string; run: () => void } | null => {
    if (id === 'sales' && onSalesSetup) return { label: state === 'done' ? 'screens.commerceportal.setupHub.edit' : 'screens.commerceportal.setupHub.salesCta', run: onSalesSetup };
    if (state === 'done') return null;
    if (id === 'profile') return { label: 'screens.commerceportal.setupHub.profileCta', run: () => setProfileOpen(true) };
    if (id === 'products') return { label: 'screens.commerceportal.setupHub.productsCta', run: onAddProducts };
    return null;
  };
  const percent = readinessPercent(steps);

  return (
    <View style={[styles.hub, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: colors.card }]} testID="setup-hub">
      <View>
        <Text size="2xl" weight="700">
          {t('screens.commerceportal.setupHub.title')}
        </Text>
        {orgs.length > 1 ? (
          <OrgSelect label={t('screens.commerceportal.setupHub.businessLabel')} org={org} orgs={orgs} onSelectOrg={onSelectOrg} testID="setup-hub-business" />
        ) : (
          <Text size="sm" muted numberOfLines={1}>
            {org.display_name}
          </Text>
        )}
      </View>

      {failed ? (
        <View style={styles.inline} testID="setup-hub-failed">
          <Text size="sm" muted>
            {t('screens.commerceportal.setupHub.loadFailed')}
          </Text>
          <Button variant="outline" size="sm" onPress={() => void load()} testID="setup-hub-retry">
            {t('screens.commerceportal.setupHub.retry')}
          </Button>
        </View>
      ) : !facts ? (
        <CenterSpinner testID="setup-hub-loading" />
      ) : (
        <View style={styles.stack}>
          <View style={styles.gap}>
            <Text size="sm" weight="600" testID="setup-hub-percent">
              {t('screens.commerceportal.setupHub.readiness', { percent })}
            </Text>
            <Progress value={percent} style={styles.progress} />
          </View>
          <View style={styles.gap}>
            {steps.map(({ id, state }) => {
              const a = action(id, state);
              const content = (
                <>
                  <StateMark id={`setup-step-${id}`} state={state} />
                  <StateIcon state={state} />
                  <View style={styles.fill}>
                    <Text weight="600">{t(SETUP_STEP_COPY[id].title)}</Text>
                    <Text size="sm" muted>
                      {state === 'todo' || state === 'done' ? t(SETUP_STEP_COPY[id].body) : t(SETUP_STATE_LABEL[state])}
                    </Text>
                    {id === 'verification' && note && state !== 'done' ? (
                      <Text size="sm" testID="setup-review-note">
                        <Text size="sm" weight="600">
                          {t('screens.commerceportal.setupHub.reviewNoteLabel')}
                        </Text>
                        {` ${note}`}
                      </Text>
                    ) : null}
                  </View>
                  {a ? (
                    <View style={styles.action}>
                      <Text size="sm" weight="600" color={colors.primary}>
                        {t(a.label)}
                      </Text>
                      <BizIcon name="ChevronRight" size={16} color={colors.primary} flip />
                    </View>
                  ) : null}
                </>
              );
              return a ? (
                <PressableRow key={id} onPress={a.run} testID={`setup-step-${id}`} accessibilityLabel={`${t(SETUP_STEP_COPY[id].title)}, ${t(SETUP_STATE_LABEL[state])}`} style={[styles.row, { borderColor: colors.border }]}>
                  {content}
                </PressableRow>
              ) : (
                <View key={id} testID={`setup-step-${id}`} accessibilityLabel={`${t(SETUP_STEP_COPY[id].title)}, ${t(SETUP_STATE_LABEL[state])}`} style={[styles.row, { borderColor: colors.border }]}>
                  {content}
                </View>
              );
            })}
          </View>
          {terms && terms.kind !== 'not_published' ? <TermsRow status={terms} onOpen={() => setTermsOpen(true)} /> : null}
          {open.length > 0 ? (
            <View style={[styles.still, { borderColor: colors.border, backgroundColor: withAlpha(colors.muted, 0.4) }]} testID="setup-still-needed">
              <Text size="sm" weight="600">
                {t('screens.commerceportal.setupHub.stillNeeded')}
              </Text>
              {open.map((o) => (
                <Text key={o.key} size="sm" muted testID={`setup-still-${o.key}`}>
                  {`• ${t(o.label)}`}
                </Text>
              ))}
            </View>
          ) : null}
          {submitResult ? (
            <Text size="sm" weight="500" color={submitResult === 'failed' ? colors.statusError : colors.foreground} accessibilityLiveRegion="polite" testID={`setup-submit-result-${submitResult}`}>
              {t(SETUP_SUBMIT_RESULT_COPY[submitResult])}
            </Text>
          ) : null}
          {mode ? (
            <Button onPress={() => setConfirmOpen(true)} disabled={submitting} testID={`setup-submit-${mode}`} style={styles.primary}>
              {t(mode === 'submit' ? 'screens.commerceportal.setupHub.submitCta' : 'screens.commerceportal.setupHub.resubmitCta')}
            </Button>
          ) : null}
        </View>
      )}

      <ResponsiveDialog open={confirmOpen} onOpenChange={(next: boolean) => (submitting ? undefined : setConfirmOpen(next))}>
        <ResponsiveDialogContent testID="setup-submit-confirm-sheet">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              <Text size="2xl" weight="700">
                {t(mode === 'resubmit' ? 'screens.commerceportal.setupHub.resubmitConfirmTitle' : 'screens.commerceportal.setupHub.submitConfirmTitle')}
              </Text>
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t('screens.commerceportal.setupHub.submitConfirmBody')}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter style={styles.buttons}>
            <Button variant="outline" disabled={submitting} onPress={() => setConfirmOpen(false)} testID="setup-submit-cancel" style={styles.primary}>
              {t('screens.commerceportal.setupHub.submitCancel')}
            </Button>
            <Button disabled={submitting} onPress={() => void submit()} testID="setup-submit-confirm" style={styles.primary}>
              {t('screens.commerceportal.setupHub.submitConfirm')}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <PartnerTermsSheet open={termsOpen} onOpenChange={setTermsOpen} orgId={org.id} onAccepted={() => void loadTerms()} />
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} orgId={org.id} initialCountry={facts?.country ?? ''} initialWebsite={facts?.website ?? ''} onSaved={() => void load()} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute', width: 0, height: 0 },
  hub: { marginTop: 32, borderWidth: 1, borderRadius: 24, padding: 20, gap: 20 },
  stack: { gap: 16 },
  gap: { gap: 8 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  progress: { height: 8 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  fill: { flex: 1, minWidth: 0 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  still: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 2 },
  summary: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 12 },
  ltr: { writingDirection: 'ltr' },
  selfStart: { alignSelf: 'flex-start' },
  primary: { flex: 1, minHeight: 48 },
  buttons: { flexDirection: 'row', gap: 8 },
});
