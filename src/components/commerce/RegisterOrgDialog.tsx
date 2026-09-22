/**
 * Commerce Partner Onboarding (VTID-03936, frontend Phase 2) — self-service
 * "register your business" form.
 *
 * VTID follow-up: rebuilt as a 3-step wizard (owner feedback: "the popup
 * screens should be in steps, e.g. 1 of 5 steps, so the user always knows
 * exactly where they are"). Three steps match the actual fields — padding
 * to a round number would be artificial:
 *   1. Category (drives `commerce_vertical` automatically, see
 *      `src/lib/commerce-categories.ts` — no backend change, `org_type`
 *      was already free text)
 *   2. Business details (name + the auto-derived, editable short name)
 *   3. Review & confirm
 * The step TITLE is always the largest text in the sheet, per the owner's
 * explicit ask, so what's being filled in never outweighs where you are.
 *
 * VTID-03989: renders as a bottom sheet on phones (`ResponsiveDialog`).
 */
import { useState } from 'react';
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
import { Check, ChevronLeft, Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ORGS_API, slugifyOrgKey } from '@/lib/commerce-host';
import { COMMERCE_CATEGORIES, commerceVerticalForCategory } from '@/lib/commerce-categories';
import { useCommerceSkin } from '@/components/commerce/CommerceShell';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import { t, notifyError } from '@/lib/i18n-toast';

const EMPTY_FORM = { category: '', org_key: '', display_name: '' };
const TOTAL_STEPS = 3;

// VTID-03999: inputs use the theme's own field styles; the amber focus ring is kept.
const fieldClass = 'focus-visible:ring-amber-500';

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
  const [form, setForm] = useState(EMPTY_FORM);
  // Once the owner edits the key by hand, stop deriving it from the name.
  const [keyTouched, setKeyTouched] = useState(false);

  const reset = () => {
    setForm(EMPTY_FORM);
    setKeyTouched(false);
    setStep(0);
  };

  const create = async () => {
    setCreating(true);
    try {
      const res = await adminFetch(`${PARTNER_ORGS_API}/register`, {
        method: 'POST',
        body: JSON.stringify({
          org_key: form.org_key.trim(),
          display_name: form.display_name.trim(),
          org_type: form.category,
          commerce_vertical: commerceVerticalForCategory(form.category),
        }),
      });
      onOpenChange(false);
      reset();
      const org = res?.organization ?? null;
      await onCreated(org ? { ...org, role: 'org_admin' } : null);
    } catch (err) {
      if (err instanceof Error && /already taken/i.test(err.message)) {
        notifyError('screens.commerceportal.orgOnboarding.orgKeyTaken');
      } else {
        notifyError('screens.commerceportal.orgOnboarding.createFailed');
      }
    } finally {
      setCreating(false);
    }
  };

  const stepValid = [!!form.category, !!form.display_name.trim() && !!form.org_key.trim(), true][step];
  const selectedCategory = COMMERCE_CATEGORIES.find((c) => c.key === form.category);

  const stepTitleKey = [
    'screens.commerceportal.orgOnboarding.wizardStep1Title',
    'screens.commerceportal.orgOnboarding.wizardStep2Title',
    'screens.commerceportal.orgOnboarding.wizardStep3Title',
  ][step];

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <ResponsiveDialogContent className={portalClass}>
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
                  onClick={() => setForm((f) => ({ ...f, category: cat.key }))}
                  aria-pressed={form.category === cat.key}
                  className={`flex items-center justify-between rounded-xl border p-3 text-start text-sm font-medium transition-colors ${
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
              <Input
                value={form.display_name}
                onChange={(e) => {
                  const display_name = e.target.value;
                  setForm((f) => ({ ...f, display_name, org_key: keyTouched ? f.org_key : slugifyOrgKey(display_name) }));
                }}
                placeholder={t('screens.commerceportal.orgOnboarding.orgName')}
                aria-label={t('screens.commerceportal.orgOnboarding.orgName')}
                autoComplete="organization"
                autoFocus
                className={fieldClass}
              />
              <div>
                <Input
                  value={form.org_key}
                  onChange={(e) => {
                    setKeyTouched(true);
                    setForm((f) => ({ ...f, org_key: e.target.value.toLowerCase() }));
                  }}
                  placeholder={t('screens.commerceportal.orgOnboarding.orgKey')}
                  aria-label={t('screens.commerceportal.orgOnboarding.orgKey')}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`font-mono ${fieldClass}`}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('screens.commerceportal.orgOnboarding.orgKeyAuto')}</p>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">{t('screens.commerceportal.orgOnboarding.wizardReviewCategory')}</span>
                <span className="text-sm font-semibold text-foreground">{selectedCategory ? t(selectedCategory.labelKey) : ''}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">{t('screens.commerceportal.orgOnboarding.wizardReviewName')}</span>
                <span className="text-sm font-semibold text-foreground">{form.display_name}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">{t('screens.commerceportal.orgOnboarding.wizardReviewKey')}</span>
                <span className="font-mono text-sm font-semibold text-foreground">{form.org_key}</span>
              </div>
            </div>
          )}
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="flex-row gap-2 md:mt-4">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={creating}
              className="shrink-0"
            >
              <ChevronLeft className="me-1 h-4 w-4" />
              {t('screens.commerceportal.orgOnboarding.wizardBack')}
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button
              type="button"
              className="flex-1 bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
              onClick={() => setStep((s) => s + 1)}
              disabled={!stepValid}
            >
              {t('screens.commerceportal.orgOnboarding.wizardNext')}
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
              onClick={() => void create()}
              disabled={creating}
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
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
