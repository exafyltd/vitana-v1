/**
 * VTID-04793 — "Get ready to sell": one place that shows a registered
 * business how far it is from going live, and what to do next.
 *
 * Every status here is read from the server, never assumed:
 *   - Business profile   — the business has a country
 *                          (GET /partner-onboarding/:orgId → organization)
 *   - Products/services  — at least one product (GET /:orgId/catalogue)
 *   - Verification       — lifecycle_state submitted/verifying = in progress,
 *                          needs_action = needs attention, live = done
 *   - Sales setup        — the business's shop record exists (catalogue.merchant)
 *   - Review & publish   — lifecycle_state live
 * Both endpoints already exist and already require org_admin, so the hub is
 * only shown to a business's admins. Nothing is written from here except the
 * profile sheet, which saves through PATCH /:orgId/company (the endpoint the
 * onboarding API already has for exactly these facts).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Circle, Clock, Loader2, TriangleAlert } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ONBOARDING_API } from '@/lib/commerce-host';
import { countryOptions } from '@/lib/commerce-countries';
import { isValidWebsite, normalizeWebsite } from '@/lib/commerce-register';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import { t, notifyError } from '@/lib/i18n-toast';

export type StepState = 'done' | 'in_progress' | 'attention' | 'todo';

export interface HubFacts {
  country: string | null;
  website: string | null;
  lifecycleState: string | null;
  productCount: number;
  hasMerchant: boolean;
}

export interface HubStep {
  id: 'profile' | 'products' | 'verification' | 'sales' | 'publish';
  state: StepState;
}

/** The checklist, derived only from server facts. Exported for tests. */
export function deriveSetupSteps(f: HubFacts): HubStep[] {
  const live = f.lifecycleState === 'live';
  const verification: StepState = live
    ? 'done'
    : f.lifecycleState === 'needs_action' || f.lifecycleState === 'exception'
      ? 'attention'
      : f.lifecycleState === 'submitted' || f.lifecycleState === 'verifying'
        ? 'in_progress'
        : 'todo';
  return [
    { id: 'profile', state: f.country ? 'done' : 'todo' },
    { id: 'products', state: f.productCount > 0 ? 'done' : 'todo' },
    { id: 'verification', state: verification },
    { id: 'sales', state: f.hasMerchant ? 'done' : 'todo' },
    { id: 'publish', state: live ? 'done' : 'todo' },
  ];
}

export function readinessPercent(steps: HubStep[]): number {
  return Math.round((steps.filter((s) => s.state === 'done').length / steps.length) * 100);
}

const STEP_COPY: Record<HubStep['id'], { title: string; body: string }> = {
  profile: { title: 'screens.commerceportal.setupHub.profileTitle', body: 'screens.commerceportal.setupHub.profileBody' },
  products: { title: 'screens.commerceportal.setupHub.productsTitle', body: 'screens.commerceportal.setupHub.productsBody' },
  verification: { title: 'screens.commerceportal.setupHub.verificationTitle', body: 'screens.commerceportal.setupHub.verificationBody' },
  sales: { title: 'screens.commerceportal.setupHub.salesTitle', body: 'screens.commerceportal.setupHub.salesBody' },
  publish: { title: 'screens.commerceportal.setupHub.publishTitle', body: 'screens.commerceportal.setupHub.publishBody' },
};

const STATE_LABEL: Record<StepState, string> = {
  done: 'screens.commerceportal.setupHub.stateDone',
  in_progress: 'screens.commerceportal.setupHub.stateInProgress',
  attention: 'screens.commerceportal.setupHub.stateAttention',
  todo: 'screens.commerceportal.setupHub.stateTodo',
};

function StateIcon({ state }: { state: StepState }) {
  if (state === 'done') return <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />;
  if (state === 'in_progress') return <Clock className="h-6 w-6 shrink-0 text-amber-600" />;
  if (state === 'attention') return <TriangleAlert className="h-6 w-6 shrink-0 text-red-600" />;
  return <Circle className="h-6 w-6 shrink-0 text-muted-foreground/60" />;
}

export function SetupHub({
  orgs,
  activeOrgId,
  onSelectOrg,
  onAddProducts,
  refreshKey = 0,
}: {
  /** The businesses the user administers (org_admin). */
  orgs: MyOrgRow[];
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
  onAddProducts: () => void;
  /** Bump to reload after something elsewhere changed (e.g. a product was added). */
  refreshKey?: number;
}) {
  const org = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  const [facts, setFacts] = useState<HubFacts | null>(null);
  const [failed, setFailed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const load = useCallback(async () => {
    if (!org) return;
    setFailed(false);
    try {
      const [ob, cat] = await Promise.all([
        adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}`),
        adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}/catalogue`),
      ]);
      setFacts({
        country: ob?.organization?.country ?? null,
        website: ob?.organization?.website ?? null,
        lifecycleState: ob?.organization?.lifecycle_state ?? org.lifecycle_state ?? null,
        productCount: Array.isArray(cat?.products) ? cat.products.length : 0,
        hasMerchant: !!cat?.merchant,
      });
    } catch {
      setFailed(true);
    }
  }, [org]);

  useEffect(() => {
    setFacts(null);
    void load();
  }, [load, refreshKey]);

  const steps = useMemo(() => (facts ? deriveSetupSteps(facts) : []), [facts]);
  if (!org) return null;

  const action = (id: HubStep['id'], state: StepState) => {
    if (state === 'done') return null;
    if (id === 'profile') return { label: 'screens.commerceportal.setupHub.profileCta', run: () => setProfileOpen(true) };
    if (id === 'products') return { label: 'screens.commerceportal.setupHub.productsCta', run: onAddProducts };
    return null;
  };

  return (
    <section className="mt-8 rounded-3xl border border-amber-200 bg-card p-5 shadow-sm md:mt-10 md:p-7" data-testid="setup-hub">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-foreground">{t('screens.commerceportal.setupHub.title')}</h2>
          {orgs.length > 1 ? (
            <label className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              {t('screens.commerceportal.setupHub.businessLabel')}
              <select
                value={org.id}
                onChange={(e) => onSelectOrg(e.target.value)}
                className="h-11 max-w-[14rem] truncate rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.display_name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mt-1 truncate text-sm text-muted-foreground">{org.display_name}</p>
          )}
        </div>
      </div>

      {failed ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {t('screens.commerceportal.setupHub.loadFailed')}
          <Button variant="outline" size="sm" onClick={() => void load()}>
            {t('screens.commerceportal.setupHub.retry')}
          </Button>
        </div>
      ) : !facts ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="mt-5">
            <p className="text-sm font-semibold text-foreground" data-testid="setup-hub-percent">
              {t('screens.commerceportal.setupHub.readiness', { percent: readinessPercent(steps) })}
            </p>
            <Progress value={readinessPercent(steps)} className="mt-2 h-2 bg-amber-100 [&>div]:bg-amber-600" />
          </div>
          <ol className="mt-5 space-y-2">
            {steps.map(({ id, state }) => {
              const a = action(id, state);
              const content = (
                <>
                  <StateIcon state={state} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{t(STEP_COPY[id].title)}</p>
                    <p className="text-sm text-muted-foreground">
                      {state === 'todo' || state === 'done' ? t(STEP_COPY[id].body) : t(STATE_LABEL[state])}
                    </p>
                  </div>
                  {a ? (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-800">
                      {t(a.label)}
                      <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                    </span>
                  ) : (
                    <span className="sr-only">{t(STATE_LABEL[state])}</span>
                  )}
                </>
              );
              return (
                <li key={id} data-testid={`setup-step-${id}`} data-state={state}>
                  {a ? (
                    <button
                      type="button"
                      onClick={a.run}
                      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border p-3 text-start transition-colors hover:border-amber-400 hover:bg-amber-50/50"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-border p-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        orgId={org.id}
        initialCountry={facts?.country ?? ''}
        initialWebsite={facts?.website ?? ''}
        onSaved={() => void load()}
      />
    </section>
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
}) {
  const [country, setCountry] = useState(initialCountry);
  const [website, setWebsite] = useState(initialWebsite);
  const [saving, setSaving] = useState(false);
  const countries = useMemo(() => (open ? countryOptions() : []), [open]);

  useEffect(() => {
    if (open) {
      setCountry(initialCountry);
      setWebsite(initialWebsite);
    }
  }, [open, initialCountry, initialWebsite]);

  const save = async () => {
    setSaving(true);
    try {
      const w = normalizeWebsite(website);
      await adminFetch(`${PARTNER_ONBOARDING_API}/${orgId}/company`, {
        method: 'PATCH',
        body: JSON.stringify({ country, ...(w ? { website: w } : {}) }),
      });
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
      <ResponsiveDialogContent fullscreenOnMobile>
        <ResponsiveDialogHeader className="text-start">
          <ResponsiveDialogTitle className="text-2xl font-bold">
            {t('screens.commerceportal.setupHub.profileTitle')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-3 md:mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="sh-website">
              {t('screens.commerceportal.orgOnboarding.website')}{' '}
              <span className="font-normal text-muted-foreground">{t('screens.commerceportal.orgOnboarding.optional')}</span>
            </Label>
            <Input
              id="sh-website"
              type="url"
              inputMode="url"
              dir="ltr"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="h-12 text-base focus-visible:ring-amber-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sh-country">{t('screens.commerceportal.orgOnboarding.country')}</Label>
            <select
              id="sh-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
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
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter className="flex-row gap-2 md:mt-4">
          <Button
            type="button"
            className="h-12 flex-1 bg-amber-700 text-base font-semibold text-white hover:bg-amber-800"
            disabled={saving || !country || !isValidWebsite(website)}
            onClick={() => void save()}
          >
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('screens.commerceportal.setupHub.profileSave')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
