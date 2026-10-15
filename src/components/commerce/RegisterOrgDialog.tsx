/**
 * Commerce Partner Onboarding (VTID-03936, frontend Phase 2) — self-service
 * "register your business" form.
 *
 * VTID-04793: two steps and a success screen, so a new supplier is
 * registered in about a minute:
 *   1. What does your business offer? (category → `org_type`, and
 *      `commerce_vertical` derived from it, `src/lib/commerce-categories.ts`)
 *   2. Tell us about your business — name, website (optional), country.
 *      VTID-05209: the website is prefilled from a confirmed business email and
 *      the country, when Vitanaland can tell it reliably, is one confirm line
 *      ("Country: Germany · Change") instead of a list of ~200. Nothing is
 *      saved until the supplier taps Create; a country they picked themselves
 *      is never replaced.
 *      The short name (`org_key`) is no longer asked for: it is derived from
 *      the name and a clash is retried automatically (`commerce-register.ts`).
 *   → "You're registered", then "Continue setup" into the setup hub.
 * The separate "Review & confirm" step only repeated step 1 and 2 and is
 * gone; the request itself is unchanged (`POST /partner-orgs/register`).
 *
 * Supplier ID: `partner_organizations` has no supplier number yet
 * (architecture doc §3.1, open decisions D-1/D-2), so the success screen
 * shows the business's real identifier, its short name, and never a made-up
 * one. A backend task adds the VIT-SUP number.
 *
 * The step title is always the largest text in the sheet (owner ask). On
 * phones the dialog is a full-screen sheet with the button at the bottom.
 * What was typed is kept when going back, and survives closing the sheet or
 * reloading (per-browser draft, cleared once the business exists).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronLeft, Loader2, PartyPopper } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ORGS_API } from '@/lib/commerce-host';
import { COMMERCE_CATEGORIES, commerceVerticalForCategory } from '@/lib/commerce-categories';
import { countryOptions, guessCountry } from '@/lib/commerce-countries';
import { isValidWebsite, registerBusiness } from '@/lib/commerce-register';
import { NO_SUGGESTIONS, fetchCompanySuggestions, suggestionSourceKey, type CompanySuggestions } from '@/lib/commerce-suggestions';
import { useCommerceSkin } from '@/components/commerce/CommerceShell';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import { t, notifyError } from '@/lib/i18n-toast';

const EMPTY_FORM = { category: '', display_name: '', website: '', country: '' };
type Form = typeof EMPTY_FORM;
const TOTAL_STEPS = 2;
export const REGISTER_DRAFT_KEY = 'vitana.commerce.registerDraft';

// VTID-03999: inputs use the theme's own field styles; the amber focus ring is kept.
const fieldClass = 'h-12 text-base focus-visible:ring-amber-500';
const primaryClass = 'h-12 flex-1 text-base bg-amber-700 font-semibold text-white hover:bg-amber-800';

function readDraft(): { step: number; form: Form } | null {
  try {
    const raw = localStorage.getItem(REGISTER_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { step: d.step === 1 ? 1 : 0, form: { ...EMPTY_FORM, ...d.form } };
  } catch {
    return null;
  }
}

function writeDraft(step: number, form: Form) {
  try {
    localStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify({ step, form }));
  } catch {
    /* private mode: the draft is a convenience, never required */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(REGISTER_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function RegisterOrgDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** VTID-03999: receives the new organization so the caller can land in its business mode. */
  onCreated: (org: MyOrgRow | null) => void | Promise<void>;
}) {
  const { portalClass } = useCommerceSkin();
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [created, setCreated] = useState<MyOrgRow | null>(null);
  const countries = useMemo(() => (open ? countryOptions() : []), [open]);
  // VTID-05209: what Vitanaland can suggest, and whether the supplier chose the country themselves.
  const [suggestions, setSuggestions] = useState<CompanySuggestions>(NO_SUGGESTIONS);
  const countryPicked = useRef(false);
  const [countryEditing, setCountryEditing] = useState(false);

  /** Prefill from a suggestion: only empty fields, never a country the supplier picked. */
  const applySuggestions = (s: CompanySuggestions) => {
    setSuggestions(s);
    setForm((f) => ({
      ...f,
      website: f.website.trim() ? f.website : s.website?.value ?? f.website,
      country: countryPicked.current || !s.country ? f.country : s.country.value,
    }));
  };

  // Resume a draft (or preselect the country) each time the sheet opens.
  useEffect(() => {
    if (!open || created) return;
    const draft = readDraft();
    let website = '';
    if (draft) {
      setStep(draft.step);
      setForm(draft.form);
      website = draft.form.website;
    } else {
      setForm((f) => (f.country ? f : { ...f, country: guessCountry() }));
    }
    // A resumed draft's country may be the supplier's own choice: keep it.
    countryPicked.current = !!draft?.form.country;
    setCountryEditing(false);
    let live = true;
    void fetchCompanySuggestions(adminFetch, { website }).then((s) => {
      if (live) applySuggestions(s);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** A typed website can name the country (`.de`, `.co.uk`): ask again when the field is left. */
  const onWebsiteBlur = () => {
    if (!isValidWebsite(form.website)) return;
    void fetchCompanySuggestions(adminFetch, { website: form.website }).then(applySuggestions);
  };

  useEffect(() => {
    if (open && !created) writeDraft(step, form);
  }, [open, created, step, form]);

  const update = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const create = async () => {
    setCreating(true);
    try {
      const res = await registerBusiness(
        PARTNER_ORGS_API,
        {
          displayName: form.display_name,
          category: form.category,
          commerceVertical: commerceVerticalForCategory(form.category),
          website: form.website,
          country: form.country,
        },
        adminFetch,
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
  // One confirm line instead of the list, while the country is the reliable suggestion.
  const countryConfirmLine = !countryEditing && !!suggestedCountry && form.country === suggestedCountry.value;
  const countryName = countries.find((c) => c.code === form.country)?.name ?? form.country;
  const websiteFromEmail = !!suggestions.website && form.website === suggestions.website.value;
  const stepValid = [!!form.category, !!form.display_name.trim() && !!form.country && websiteOk][step];

  const stepTitleKey = [
    'screens.commerceportal.orgOnboarding.wizardStep1Title',
    'screens.commerceportal.orgOnboarding.wizardStep2Title',
  ][step];

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else close();
      }}
    >
      <ResponsiveDialogContent fullscreenOnMobile className={portalClass}>
        {created ? (
          <>
            <ResponsiveDialogHeader className="text-start">
              <PartyPopper aria-hidden className="h-8 w-8 text-amber-600" />
              <ResponsiveDialogTitle className="text-2xl font-bold">
                {t('screens.commerceportal.orgOnboarding.successTitle')}
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody className="space-y-4 md:mt-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-lg font-semibold text-foreground">{created.display_name}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('screens.commerceportal.orgOnboarding.successBusinessId')}
                </p>
                <p dir="ltr" className="font-mono text-sm font-semibold text-foreground">{created.org_key}</p>
              </div>
              <p className="text-base text-foreground">{t('screens.commerceportal.orgOnboarding.successBody')}</p>
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter className="flex-row gap-2 md:mt-4">
              <Button type="button" className={primaryClass} onClick={close} data-testid="register-continue-setup">
                {t('screens.commerceportal.orgOnboarding.successCta')}
              </Button>
            </ResponsiveDialogFooter>
          </>
        ) : (
          <>
            <ResponsiveDialogHeader className="text-start">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('screens.commerceportal.orgOnboarding.wizardStepOf', { current: step + 1, total: TOTAL_STEPS })}
              </p>
              {/* The step title is always the largest text in the sheet — bigger
                  than any field/value below it, so where-you-are never loses to
                  what's-being-filled-in. */}
              <ResponsiveDialogTitle className="text-2xl font-bold">{t(stepTitleKey)}</ResponsiveDialogTitle>
            </ResponsiveDialogHeader>

            <ResponsiveDialogBody className="space-y-3 md:mt-4">
              {step === 0 && (
                <div className="grid gap-2">
                  {COMMERCE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => update({ category: cat.key })}
                      aria-pressed={form.category === cat.key}
                      data-testid={`register-category-${cat.key}`}
                      className={`flex min-h-12 items-center justify-between rounded-xl border p-3 text-start text-base font-medium transition-colors ${
                        form.category === cat.key
                          ? 'border-amber-500 bg-amber-500/10 text-foreground'
                          : 'border-border text-foreground hover:border-amber-500/50'
                      }`}
                    >
                      {t(cat.labelKey)}
                      {form.category === cat.key && <Check className="h-4 w-4 shrink-0 text-amber-600" />}
                    </button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="ro-name">{t('screens.commerceportal.orgOnboarding.orgName')}</Label>
                    <Input
                      id="ro-name"
                      value={form.display_name}
                      onChange={(e) => update({ display_name: e.target.value })}
                      autoComplete="organization"
                      autoFocus
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ro-website">
                      {t('screens.commerceportal.orgOnboarding.website')}{' '}
                      <span className="font-normal text-muted-foreground">
                        {t('screens.commerceportal.orgOnboarding.optional')}
                      </span>
                    </Label>
                    <Input
                      id="ro-website"
                      type="url"
                      inputMode="url"
                      dir="ltr"
                      value={form.website}
                      onChange={(e) => update({ website: e.target.value })}
                      onBlur={onWebsiteBlur}
                      autoComplete="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-invalid={!websiteOk}
                      className={fieldClass}
                    />
                    <p className={`text-xs ${websiteOk ? 'text-muted-foreground' : 'text-destructive'}`} data-testid="register-website-hint">
                      {!websiteOk
                        ? t('screens.commerceportal.orgOnboarding.websiteInvalid')
                        : websiteFromEmail
                          ? t('screens.commerceportal.orgOnboarding.fromEmail')
                          : t('screens.commerceportal.orgOnboarding.websiteHint')}
                    </p>
                  </div>
                  {countryConfirmLine && suggestedCountry ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3" data-testid="register-country-confirm">
                      <div className="min-w-0">
                        <p className="text-base font-medium text-foreground">
                          {t('screens.commerceportal.orgOnboarding.countryConfirm', { name: countryName })}
                        </p>
                        {suggestionSourceKey(suggestedCountry.source) && (
                          <p className="text-xs text-muted-foreground">{t(suggestionSourceKey(suggestedCountry.source) as string)}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto shrink-0 p-0 text-base"
                        onClick={() => setCountryEditing(true)}
                        data-testid="register-country-change"
                      >
                        {t('screens.commerceportal.orgOnboarding.change')}
                      </Button>
                    </div>
                  ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="ro-country">{t('screens.commerceportal.orgOnboarding.country')}</Label>
                    <select
                      id="ro-country"
                      value={form.country}
                      onChange={(e) => {
                        countryPicked.current = true;
                        update({ country: e.target.value });
                      }}
                      autoComplete="country"
                      data-testid="register-country-select"
                      className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <option value="" disabled>
                        {t('screens.commerceportal.orgOnboarding.countryPlaceholder')}
                      </option>
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  )}
                </>
              )}
            </ResponsiveDialogBody>

            <ResponsiveDialogFooter className="flex-row gap-2 md:mt-4">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={creating}
                  className="h-12 shrink-0"
                  data-testid="register-back"
                >
                  <ChevronLeft className="me-1 h-4 w-4 rtl:rotate-180" />
                  {t('screens.commerceportal.orgOnboarding.wizardBack')}
                </Button>
              )}
              {step < TOTAL_STEPS - 1 ? (
                <Button
                  type="button"
                  className={primaryClass}
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!stepValid}
                  data-testid="register-next"
                >
                  {t('screens.commerceportal.orgOnboarding.wizardNext')}
                </Button>
              ) : (
                <Button
                  type="button"
                  className={primaryClass}
                  onClick={() => void create()}
                  disabled={creating || !stepValid}
                  data-testid="register-create"
                >
                  {creating ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t('screens.commerceportal.orgOnboarding.creating')}
                    </>
                  ) : (
                    t('screens.commerceportal.orgOnboarding.create')
                  )}
                </Button>
              )}
            </ResponsiveDialogFooter>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
