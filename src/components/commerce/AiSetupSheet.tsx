/**
 * VTID-04839 — "Set up with AI" (owner decisions 2026-10-02).
 *
 *   1. Your website → Vitana reads it (nothing is saved).
 *   2. Review: business name, category, country and the products found, each
 *      editable; a product without a price needs one or is left out.
 *   3. One tap on "Create my business" writes everything — the business and
 *      its products as hidden drafts — and nothing before that tap.
 *
 * With a business already selected, the products are added to it instead and
 * the business fields are not shown. A retry or a double tap reuses the same
 * setup key, so it never creates a second business. "Prefer to fill it in
 * yourself" is always one tap away.
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PartyPopper, Sparkles } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { COMMERCE_CATEGORIES } from '@/lib/commerce-categories';
import { countryOptions, guessCountry } from '@/lib/commerce-countries';
import { isValidWebsite, normalizeWebsite } from '@/lib/commerce-register';
import {
  applyDraft,
  applyPayload,
  draftErrorKey,
  newSetupKey,
  requestDraft,
  reviewFromDraft,
  reviewProblem,
  type ApplyOutcome,
  type BusinessCategory,
  type ReviewState,
  type SetupDraft,
} from '@/lib/commerce-ai-setup';
import { BusinessContext } from '@/components/commerce/BusinessContext';
import { useCommerceSkin } from '@/components/commerce/CommerceShell';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import { t } from '@/lib/i18n-toast';

type Step = 'website' | 'reading' | 'review' | 'saving' | 'done';

const fieldClass = 'h-12 text-base focus-visible:ring-amber-500';
const primaryClass = 'h-12 flex-1 text-base bg-amber-700 font-semibold text-white hover:bg-amber-800';
const selectClass =
  'flex h-12 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500';

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
  /** The business the products go to; none → a new business is created. */
  org?: MyOrgRow | null;
  orgs?: MyOrgRow[];
  onSelectOrg?: (id: string) => void;
  /** After a successful create: reload the portal and select the business. */
  onDone: (outcome: ApplyOutcome) => void | Promise<void>;
  /** "Prefer to fill it in yourself" — the manual path. */
  onPreferManual: () => void;
  /** A draft Vitana already made in conversation (opens straight on review). */
  initialDraft?: SetupDraft | null;
}) {
  const { portalClass } = useCommerceSkin();
  const [step, setStep] = useState<Step>('website');
  const [website, setWebsite] = useState('');
  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const setupKey = useRef('');
  const countries = useMemo(() => (open ? countryOptions() : []), [open]);

  const startReview = (d: SetupDraft) => {
    setDraft(d);
    setReview(reviewFromDraft(d, guessCountry()));
    setupKey.current = newSetupKey();
    setStep('review');
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
    // Only when the sheet opens or Vitana hands over a new draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDraft]);

  const websiteOk = website.trim() !== '' && isValidWebsite(website);

  const read = async () => {
    if (!websiteOk) return;
    setError('');
    setStep('reading');
    try {
      startReview(await requestDraft(adminFetch, normalizeWebsite(website)));
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
      const result = await applyDraft(adminFetch, applyPayload(draft, review, setupKey.current, org?.id ?? null));
      setOutcome(result);
      setStep('done');
      await onDone(result);
    } catch {
      // Same setup key on the next tap: a retry never creates a second business.
      setError(t('screens.commerceportal.aiSetup.errorCreate'));
      setStep('review');
    }
  };

  const patch = (p: Partial<ReviewState>) => setReview((r) => (r ? { ...r, ...p } : r));
  const patchProduct = (i: number, p: Partial<ReviewState['products'][number]>) =>
    setReview((r) => (r ? { ...r, products: r.products.map((x, j) => (j === i ? { ...x, ...p } : x)) } : r));

  const preferManual = () => {
    onOpenChange(false);
    onPreferManual();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(next) => (step === 'saving' ? undefined : onOpenChange(next))}>
      <ResponsiveDialogContent fullscreenOnMobile className={portalClass} data-testid="ai-setup">
        <ResponsiveDialogHeader className="text-start">
          {step === 'done' ? (
            <PartyPopper aria-hidden className="h-8 w-8 text-amber-600" />
          ) : (
            <Sparkles aria-hidden className="h-7 w-7 text-amber-600" />
          )}
          <ResponsiveDialogTitle className="text-2xl font-bold">
            {step === 'done'
              ? t('screens.commerceportal.aiSetup.doneTitle')
              : step === 'review' || step === 'saving'
                ? t('screens.commerceportal.aiSetup.reviewTitle')
                : t('screens.commerceportal.aiSetup.title')}
          </ResponsiveDialogTitle>
          {org && step !== 'done' && <BusinessContext org={org} orgs={orgs} onSelectOrg={onSelectOrg} />}
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4 md:mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {(step === 'website' || step === 'reading') && (
            <div className="space-y-1.5">
              <p className="text-base text-foreground">{t('screens.commerceportal.aiSetup.lead')}</p>
              <Label htmlFor="ai-website" className="block pt-4">
                {t('screens.commerceportal.aiSetup.websiteLabel')}
              </Label>
              <Input
                id="ai-website"
                type="url"
                inputMode="url"
                dir="ltr"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void read()}
                placeholder={t('screens.commerceportal.aiSetup.websitePlaceholder')}
                autoComplete="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                disabled={step === 'reading'}
                className={fieldClass}
                data-testid="ai-website"
              />
              <p className="text-xs text-muted-foreground">{t('screens.commerceportal.aiSetup.websiteHint')}</p>
              {step === 'reading' && (
                <p className="flex items-center gap-2 pt-2 text-sm text-foreground" role="status">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                  {t('screens.commerceportal.aiSetup.reading')}
                </p>
              )}
            </div>
          )}

          {(step === 'review' || step === 'saving') && draft && review && (
            <>
              {!org && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-name">{t('screens.commerceportal.orgOnboarding.orgName')}</Label>
                    <Input
                      id="ai-name"
                      value={review.displayName}
                      onChange={(e) => patch({ displayName: e.target.value })}
                      className={fieldClass}
                      data-testid="ai-name"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ai-category">{t('screens.commerceportal.aiSetup.category')}</Label>
                      <select
                        id="ai-category"
                        value={review.category}
                        onChange={(e) => patch({ category: e.target.value as BusinessCategory })}
                        className={selectClass}
                      >
                        {COMMERCE_CATEGORIES.map((c) => (
                          <option key={c.key} value={c.key}>
                            {t(c.labelKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ai-country">{t('screens.commerceportal.orgOnboarding.country')}</Label>
                      <select
                        id="ai-country"
                        value={review.country}
                        onChange={(e) => patch({ country: e.target.value })}
                        className={selectClass}
                        data-testid="ai-country"
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
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {review.products.length > 0
                    ? t('screens.commerceportal.aiSetup.productsFound', { count: review.products.length })
                    : t('screens.commerceportal.aiSetup.noProducts')}
                </p>
                <ul className="space-y-2" data-testid="ai-products">
                  {review.products.map((p, i) => (
                    <li
                      key={`${p.title}-${i}`}
                      className={`rounded-xl border p-3 ${p.include ? 'border-border' : 'border-dashed border-border opacity-60'}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={p.include}
                          onChange={(e) => patchProduct(i, { include: e.target.checked })}
                          aria-label={t('screens.commerceportal.aiSetup.includeProduct', { title: p.title })}
                          className="mt-3 h-5 w-5 shrink-0 accent-amber-700"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Input
                            value={p.title}
                            onChange={(e) => patchProduct(i, { title: e.target.value })}
                            aria-label={t('screens.commerceportal.aiSetup.productTitle')}
                            className="h-11 text-base"
                            disabled={!p.include}
                          />
                          <div className="flex items-center gap-2">
                            <Input
                              value={p.priceText}
                              onChange={(e) => patchProduct(i, { priceText: e.target.value })}
                              inputMode="decimal"
                              dir="ltr"
                              placeholder="0.00"
                              aria-label={t('screens.commerceportal.aiSetup.price')}
                              aria-invalid={p.include && !p.priceText.trim()}
                              className="h-11 w-32 text-base"
                              disabled={!p.include}
                            />
                            <span className="text-sm text-muted-foreground" dir="ltr">
                              {p.currency ?? draft.business.currency ?? 'EUR'}
                            </span>
                            {p.include && !p.priceText.trim() && (
                              <span className="text-xs text-destructive">{t('screens.commerceportal.aiSetup.priceMissing')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {draft.notes.length > 0 && (
                  <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
                    {draft.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">{t('screens.commerceportal.aiSetup.draftsHint')}</p>
              </div>
            </>
          )}

          {step === 'done' && outcome && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4" data-testid="ai-done">
              <p className="text-lg font-semibold text-foreground">{outcome.organization.display_name}</p>
              <p className="mt-1 text-base text-foreground">
                {t('screens.commerceportal.aiSetup.doneBody', { count: outcome.products_added + outcome.products_replayed })}
              </p>
            </div>
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="flex-col gap-2 md:mt-4">
          {(step === 'website' || step === 'reading') && (
            <Button type="button" className={primaryClass} onClick={() => void read()} disabled={!websiteOk || step === 'reading'} data-testid="ai-read">
              {t('screens.commerceportal.aiSetup.readCta')}
            </Button>
          )}
          {(step === 'review' || step === 'saving') && (
            <Button type="button" className={primaryClass} onClick={() => void create()} disabled={!!problem || step === 'saving'} data-testid="ai-create">
              {step === 'saving' && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {org
                ? t('screens.commerceportal.aiSetup.addCta', { count: included })
                : t('screens.commerceportal.aiSetup.createCta')}
            </Button>
          )}
          {step === 'done' && (
            <Button type="button" className={primaryClass} onClick={() => onOpenChange(false)} data-testid="ai-continue">
              {t('screens.commerceportal.orgOnboarding.successCta')}
            </Button>
          )}
          {step !== 'done' && step !== 'saving' && (
            <button
              type="button"
              onClick={preferManual}
              className="min-h-11 text-sm font-medium text-amber-800 hover:underline"
              data-testid="ai-prefer-manual"
            >
              {t('screens.commerceportal.aiSetup.preferManual')}
            </button>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
