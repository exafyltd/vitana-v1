/**
 * VTID-04793 — "Get ready to sell": one place that shows a registered
 * business how far it is from going live, and what to do next.
 *
 * Every status here is read from the server, never assumed:
 *   - Business profile   — the business has a country
 *                          (GET /partner-onboarding/:orgId → organization)
 *   - Products/services  — at least one product (GET /:orgId/catalogue)
 *   - Verification       — VTID-05136: the checklist's own verification step
 *                          (done / failed / reviewer note / in review); the
 *                          lifecycle_state is only the fallback when no
 *                          checklist came back
 *   - Sales setup        — the business's shop record exists (catalogue.merchant)
 *   - Review & publish   — lifecycle_state live
 *   - Partner terms     — VTID-04895: GET /:orgId/terms; its own row below the
 *                          steps (accept / re-accept in PartnerTermsSheet)
 *   - Data processing   — VTID-05091: only when the onboarding checklist's
 *     agreement (AVV)     `dpa` step is required for this business; GET
 *                          /:orgId/dpa for version and date; its own row
 *                          below the terms row (sign / re-sign in
 *                          PartnerDpaSheet, "being prepared" while no
 *                          version is published)
 * Both endpoints already exist and already require org_admin, so the hub is
 * only shown to a business's admins. Nothing is written from here except the
 * profile sheet, which saves through PATCH /:orgId/company (the endpoint the
 * onboarding API already has for exactly these facts), and — VTID-05136 — the
 * Submit / Resubmit button, which calls POST /:orgId/submit once, after the
 * supplier confirms. The server decides the outcome; the hub only shows it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, Circle, Clock, FileSignature, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
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
import { NO_SUGGESTIONS, fetchCompanySuggestions, suggestionSourceKey, type CompanySuggestions } from '@/lib/commerce-suggestions';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import { t, notifyError, getI18nLocale } from '@/lib/i18n-toast';
import { fetchPartnerTerms, type TermsStatus } from '@/lib/commerce-terms';
import { PartnerTermsSheet } from '@/components/commerce/PartnerTermsSheet';
import { deriveDpaRow, dpaStepOf, fetchPartnerDpa, type DpaChecklistStep, type DpaRowState, type DpaStatus } from '@/lib/commerce-dpa';
import { PartnerDpaSheet } from '@/components/commerce/PartnerDpaSheet';
import { fmtDate } from '@/lib/locale-format';

export type StepState = 'done' | 'in_progress' | 'attention' | 'todo';

/** VTID-05136: one step of the server's onboarding checklist. */
export interface ChecklistStepFact {
  key: string;
  required: boolean;
  status: string;
  missing: string[];
  detail: Record<string, unknown> | null;
}

/** VTID-05136: the part of GET /partner-onboarding/:orgId → checklist the hub uses. */
export interface ChecklistFacts {
  steps: ChecklistStepFact[];
  submitReady: boolean;
}

export interface HubFacts {
  country: string | null;
  website: string | null;
  lifecycleState: string | null;
  productCount: number;
  hasMerchant: boolean;
  /** Absent when the server sent no checklist (e.g. a business without a type). */
  checklist?: ChecklistFacts | null;
}

/** Reads the checklist from a server response; null when it is missing or malformed. */
export function parseChecklist(raw: unknown): ChecklistFacts | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (!Array.isArray(c.steps)) return null;
  const steps: ChecklistStepFact[] = [];
  for (const s of c.steps as unknown[]) {
    if (!s || typeof s !== 'object') continue;
    const r = s as Record<string, unknown>;
    if (typeof r.key !== 'string' || typeof r.status !== 'string') continue;
    steps.push({
      key: r.key,
      required: r.required === true,
      status: r.status,
      missing: Array.isArray(r.missing) ? r.missing.filter((m): m is string => typeof m === 'string') : [],
      detail: r.detail && typeof r.detail === 'object' ? (r.detail as Record<string, unknown>) : null,
    });
  }
  return { steps, submitReady: c.submit_ready === true };
}

/** The reviewer's request-changes note on the verification step, if any. */
export function reviewNote(checklist: ChecklistFacts | null | undefined): string | null {
  const v = checklist?.steps.find((s) => s.key === 'verification');
  const note = v?.detail?.review_note;
  if (!note || typeof note !== 'object') return null;
  const reason = (note as Record<string, unknown>).reason;
  return typeof reason === 'string' && reason.trim() ? reason.trim() : null;
}

/** What is still open, in plain words: required steps the server reports as todo or failed. */
export type OpenItem = { key: string; label: string };

export function openSteps(checklist: ChecklistFacts | null | undefined): OpenItem[] {
  if (!checklist) return [];
  return checklist.steps
    .filter((s) => s.required && (s.status === 'todo' || s.status === 'failed'))
    .map((s) => {
      const label =
        s.key === 'mapping' && s.missing.includes('complete_offering')
          ? 'screens.commerceportal.setupHub.openCompleteOffering'
          : (OPEN_STEP_LABEL[s.key] ?? 'screens.commerceportal.setupHub.openOther');
      return { key: s.key, label };
    });
}

const OPEN_STEP_LABEL: Record<string, string> = {
  account: 'screens.commerceportal.setupHub.openAccount',
  company: 'screens.commerceportal.setupHub.openCompany',
  verification: 'screens.commerceportal.setupHub.openVerification',
  catalogue: 'screens.commerceportal.setupHub.openCatalogue',
  mapping: 'screens.commerceportal.setupHub.openShopLink',
  tracking_test: 'screens.commerceportal.setupHub.openTrackingTest',
  results_channel: 'screens.commerceportal.setupHub.openResultsChannel',
  terms: 'screens.commerceportal.setupHub.openTerms',
  dpa: 'screens.commerceportal.setupHub.openDpa',
  billing_mandate: 'screens.commerceportal.setupHub.openBillingMandate',
  team: 'screens.commerceportal.setupHub.openTeam',
};

/** Submit (draft) or Resubmit (needs_action), only when the server says it is ready. */
export function submitMode(f: HubFacts): 'submit' | 'resubmit' | null {
  if (!f.checklist?.submitReady) return null;
  if (f.lifecycleState === 'draft') return 'submit';
  if (f.lifecycleState === 'needs_action') return 'resubmit';
  return null;
}

export interface HubStep {
  id: 'profile' | 'products' | 'verification' | 'sales' | 'publish';
  state: StepState;
}

/** The checklist, derived only from server facts. Exported for tests. */
export function deriveSetupSteps(f: HubFacts): HubStep[] {
  const live = f.lifecycleState === 'live';
  const verification = f.checklist ? verificationFromChecklist(f) : verificationFromLifecycle(f.lifecycleState);
  return [
    { id: 'profile', state: f.country ? 'done' : 'todo' },
    { id: 'products', state: f.productCount > 0 ? 'done' : 'todo' },
    { id: 'verification', state: verification },
    { id: 'sales', state: f.hasMerchant ? 'done' : 'todo' },
    { id: 'publish', state: live ? 'done' : 'todo' },
  ];
}

/**
 * VTID-05136: the verification row follows the checklist's verification step,
 * so an admin-approved business that is waiting on OTHER steps no longer reads
 * "verification needs your attention". First match wins.
 */
function verificationFromChecklist(f: HubFacts): StepState {
  const v = f.checklist?.steps.find((s) => s.key === 'verification');
  if (v?.status === 'done') return 'done';
  if (v?.status === 'failed') return 'attention';
  if (v?.status === 'todo' && reviewNote(f.checklist)) return 'attention';
  if (v?.status === 'in_progress') return 'in_progress';
  if (f.lifecycleState === 'submitted' || f.lifecycleState === 'verifying') return 'in_progress';
  if (f.lifecycleState === 'rejected') return 'attention';
  return 'todo';
}

/** The pre-VTID-05136 mapping, kept for a response without a checklist. */
function verificationFromLifecycle(lifecycleState: string | null): StepState {
  if (lifecycleState === 'live') return 'done';
  if (lifecycleState === 'needs_action' || lifecycleState === 'exception') return 'attention';
  if (lifecycleState === 'submitted' || lifecycleState === 'verifying') return 'in_progress';
  return 'todo';
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

/** VTID-05136: what the hub says after a submit, from the state the server returned. */
export type SubmitResult = 'live' | 'needs_action' | 'in_review' | 'unchanged' | 'failed';

export function submitResultFor(after: string | null, transitions: unknown): SubmitResult {
  // No transition = the server recorded the submit and changed nothing.
  if (!Array.isArray(transitions) || transitions.length === 0 || !after) return 'unchanged';
  if (after === 'live') return 'live';
  if (after === 'needs_action') return 'needs_action';
  return 'in_review';
}

const SUBMIT_RESULT_COPY: Record<SubmitResult, string> = {
  live: 'screens.commerceportal.setupHub.submitResultLive',
  needs_action: 'screens.commerceportal.setupHub.submitResultNeedsAction',
  in_review: 'screens.commerceportal.setupHub.submitResultInReview',
  unchanged: 'screens.commerceportal.setupHub.submitResultUnchanged',
  failed: 'screens.commerceportal.setupHub.submitFailed',
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
  onSalesSetup,
  refreshKey = 0,
}: {
  /** The businesses the user administers (org_admin). */
  orgs: MyOrgRow[];
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
  onAddProducts: () => void;
  /** VTID-04795: opens the business-level sales setup. */
  onSalesSetup?: () => void;
  /** Bump to reload after something elsewhere changed (e.g. a product was added). */
  refreshKey?: number;
}) {
  const org = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  const [facts, setFacts] = useState<HubFacts | null>(null);
  const [failed, setFailed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // VTID-04895: the partner terms — accepted, pending, or re-acceptance needed.
  const [terms, setTerms] = useState<TermsStatus | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  // VTID-05091: the data processing agreement — only when the checklist requires it.
  const [dpaStep, setDpaStep] = useState<DpaChecklistStep | null>(null);
  const [legalName, setLegalName] = useState<string | null>(null);
  const [dpa, setDpa] = useState<DpaStatus | null>(null);
  const [dpaOpen, setDpaOpen] = useState(false);
  // VTID-05136: submit / resubmit for verification.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const submittingRef = useRef(false);

  const loadTerms = useCallback(async () => {
    if (!org) return;
    try {
      setTerms(await fetchPartnerTerms(org.id, getI18nLocale()));
    } catch {
      setTerms(null);
    }
  }, [org]);

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
        checklist: parseChecklist(ob?.checklist),
      });
      setDpaStep(dpaStepOf(ob?.checklist));
      setLegalName(typeof ob?.organization?.legal_name === 'string' ? ob.organization.legal_name : null);
    } catch {
      setFailed(true);
    }
  }, [org]);

  useEffect(() => {
    setFacts(null);
    setDpaStep(null);
    void load();
  }, [load, refreshKey]);

  // A result belongs to the business it was shown for.
  useEffect(() => {
    setSubmitResult(null);
  }, [org?.id]);

  /** One POST, after the supplier confirmed. The server decides; the hub shows what it said. */
  const submit = async () => {
    if (!org || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const r = await adminFetch(`${PARTNER_ONBOARDING_API}/${org.id}/submit`, { method: 'POST' });
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
      // adminFetch keeps only the error code; the refreshed checklist says what is open.
      setSubmitResult('failed');
      void load();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  useEffect(() => {
    setTerms(null);
    void loadTerms();
  }, [loadTerms, refreshKey]);

  const dpaRequired = dpaStep?.required === true;
  const loadDpa = useCallback(async () => {
    if (!org) return;
    try {
      setDpa(await fetchPartnerDpa(org.id, getI18nLocale()));
    } catch {
      // The checklist step alone then decides what the row shows.
      setDpa(null);
    }
  }, [org]);

  useEffect(() => {
    setDpa(null);
    if (dpaRequired) void loadDpa();
  }, [dpaRequired, loadDpa, refreshKey]);

  const dpaRow = deriveDpaRow(dpaStep, dpa);

  const steps = useMemo(() => (facts ? deriveSetupSteps(facts) : []), [facts]);
  const open = useMemo(() => (facts && facts.lifecycleState !== 'live' ? openSteps(facts.checklist) : []), [facts]);
  const note = facts ? reviewNote(facts.checklist) : null;
  const mode = facts ? submitMode(facts) : null;
  if (!org) return null;

  const action = (id: HubStep['id'], state: StepState) => {
    // Sales settings stay editable once the shop record exists.
    if (id === 'sales' && onSalesSetup) {
      return { label: state === 'done' ? 'screens.commerceportal.setupHub.edit' : 'screens.commerceportal.setupHub.salesCta', run: onSalesSetup };
    }
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
                className="h-11 max-w-56 truncate rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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
                    {id === 'verification' && note && state !== 'done' ? (
                      <p className="mt-1 text-sm text-foreground" data-testid="setup-review-note">
                        <span className="font-semibold">{t('screens.commerceportal.setupHub.reviewNoteLabel')}</span>{' '}
                        {note}
                      </p>
                    ) : null}
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
          {terms && terms.kind !== 'not_published' && (
            <TermsRow status={terms} onOpen={() => setTermsOpen(true)} />
          )}
          {dpaRow && <DpaRow row={dpaRow} onOpen={() => setDpaOpen(true)} />}
          {open.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-3" data-testid="setup-still-needed">
              <p className="text-sm font-semibold text-foreground">{t('screens.commerceportal.setupHub.stillNeeded')}</p>
              <ul className="mt-1 list-disc space-y-0.5 ps-5 text-sm text-muted-foreground">
                {open.map((o) => (
                  <li key={o.key} data-step={o.key}>
                    {t(o.label)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {submitResult && (
            <p
              className={`mt-4 text-sm font-medium ${submitResult === 'failed' ? 'text-status-error' : 'text-foreground'}`}
              role="status"
              aria-live="polite"
              data-testid="setup-submit-result"
              data-result={submitResult}
            >
              {t(SUBMIT_RESULT_COPY[submitResult])}
            </p>
          )}
          {mode && (
            <Button
              type="button"
              className="mt-4 h-12 w-full text-base font-semibold md:w-auto"
              disabled={submitting}
              onClick={() => setConfirmOpen(true)}
              data-testid="setup-submit"
              data-mode={mode}
            >
              {t(mode === 'submit' ? 'screens.commerceportal.setupHub.submitCta' : 'screens.commerceportal.setupHub.resubmitCta')}
            </Button>
          )}
        </>
      )}

      <ResponsiveDialog open={confirmOpen} onOpenChange={(next) => (submitting ? undefined : setConfirmOpen(next))}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader className="text-start">
            <ResponsiveDialogTitle className="text-2xl font-bold">
              {t(mode === 'resubmit' ? 'screens.commerceportal.setupHub.resubmitConfirmTitle' : 'screens.commerceportal.setupHub.submitConfirmTitle')}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-start">
              {t('screens.commerceportal.setupHub.submitConfirmBody')}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter className="flex-row gap-2 md:mt-4">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 text-base"
              disabled={submitting}
              onClick={() => setConfirmOpen(false)}
              data-testid="setup-submit-cancel"
            >
              {t('screens.commerceportal.setupHub.submitCancel')}
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 text-base font-semibold"
              disabled={submitting}
              onClick={() => void submit()}
              data-testid="setup-submit-confirm"
            >
              {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('screens.commerceportal.setupHub.submitConfirm')}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <PartnerTermsSheet open={termsOpen} onOpenChange={setTermsOpen} orgId={org.id} onAccepted={() => void loadTerms()} />

      {dpaRequired && (
        <PartnerDpaSheet
          open={dpaOpen}
          onOpenChange={setDpaOpen}
          orgId={org.id}
          legalName={legalName ?? org.display_name}
          onSigned={() => {
            void load();
            void loadDpa();
          }}
        />
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

/**
 * VTID-04895: the partner terms row. Accepted → done; never accepted → read and
 * accept; accepted an earlier version that a material update replaced → a
 * banner-style row asking to accept the new version (the business stays live).
 */
function TermsRow({ status, onOpen }: { status: Exclude<TermsStatus, { kind: 'not_published' }>; onOpen: () => void }) {
  const K = 'screens.commerceportal.terms';
  if (status.kind === 'accepted') {
    return (
      <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl border border-border p-3" data-testid="setup-terms" data-state="done">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{t(`${K}.rowTitle`)}</p>
          <p className="text-sm text-muted-foreground">{t(`${K}.rowAccepted`, { version: status.terms.version })}</p>
        </div>
        <button type="button" onClick={onOpen} className="min-h-11 shrink-0 text-sm font-semibold text-amber-800">
          {t(`${K}.view`)}
        </button>
      </div>
    );
  }
  const reaccept = status.reacceptance;
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="setup-terms"
      data-state={reaccept ? 'reaccept' : 'todo'}
      className={`mt-2 flex min-h-14 w-full items-center gap-3 rounded-2xl border p-3 text-start transition-colors ${
        reaccept ? 'border-amber-400 bg-amber-50 hover:bg-amber-100' : 'border-border hover:border-amber-400 hover:bg-amber-50/50'
      }`}
    >
      {reaccept ? <TriangleAlert className="h-6 w-6 shrink-0 text-amber-700" /> : <ShieldCheck className="h-6 w-6 shrink-0 text-muted-foreground/70" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{t(reaccept ? `${K}.rowReacceptTitle` : `${K}.rowTitle`)}</p>
        <p className="text-sm text-muted-foreground">
          {t(reaccept ? `${K}.rowReacceptBody` : `${K}.rowBody`, { version: status.terms.version })}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-800">
        {t(`${K}.rowCta`)}
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </span>
    </button>
  );
}

/**
 * VTID-05091: the data processing agreement row. No version published yet →
 * "being prepared by Vitanaland", nothing to click. Signed → version and date.
 * Never signed → read and sign; signed an earlier version that a material
 * update replaced → a banner-style row asking to sign the new version.
 */
function DpaRow({ row, onOpen }: { row: DpaRowState; onOpen: () => void }) {
  const K = 'screens.commerceportal.dpa';
  if (row.kind === 'pending_legal') {
    return (
      <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl border border-border p-3" data-testid="setup-dpa" data-state="todo" data-dpa="pending_legal">
        <Clock className="h-6 w-6 shrink-0 text-muted-foreground/70" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{t(`${K}.rowTitle`)}</p>
          <p className="text-sm text-muted-foreground">{t(`${K}.rowPending`)}</p>
        </div>
      </div>
    );
  }
  if (row.kind === 'signed') {
    const date = row.signedAt && !Number.isNaN(Date.parse(row.signedAt)) ? fmtDate(new Date(row.signedAt)) : null;
    const body = row.version
      ? date
        ? t(`${K}.rowSigned`, { version: row.version, date })
        : t(`${K}.rowSignedNoDate`, { version: row.version })
      : t(`${K}.rowSignedPlain`);
    return (
      <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl border border-border p-3" data-testid="setup-dpa" data-state="done">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-status-success" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{t(`${K}.rowTitle`)}</p>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        <button type="button" onClick={onOpen} className="min-h-11 shrink-0 text-sm font-semibold text-status-warning">
          {t(`${K}.view`)}
        </button>
      </div>
    );
  }
  const resign = row.kind === 'resign';
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="setup-dpa"
      data-state={resign ? 'resign' : 'todo'}
      className={`mt-2 flex min-h-14 w-full items-center gap-3 rounded-2xl border p-3 text-start transition-colors ${
        resign ? 'border-status-warning/60 bg-status-warning-subtle hover:bg-status-warning-subtle/70' : 'border-border hover:border-status-warning/60 hover:bg-status-warning-subtle/50'
      }`}
    >
      {resign ? <TriangleAlert className="h-6 w-6 shrink-0 text-status-warning" /> : <FileSignature className="h-6 w-6 shrink-0 text-muted-foreground/70" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{t(resign ? `${K}.rowResignTitle` : `${K}.rowTitle`)}</p>
        <p className="text-sm text-muted-foreground">
          {resign
            ? t(`${K}.rowResignBody`, { version: row.version })
            : row.version
              ? t(`${K}.rowBody`, { version: row.version })
              : t(`${K}.rowBodyNoVersion`)}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-status-warning">
        {t(`${K}.rowCta`)}
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </span>
    </button>
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
  // VTID-05209: suggested values for what is still missing, and summary vs. inputs.
  const [suggestions, setSuggestions] = useState<CompanySuggestions>(NO_SUGGESTIONS);
  const [editing, setEditing] = useState(false);
  const countries = useMemo(() => (open ? countryOptions() : []), [open]);

  useEffect(() => {
    if (!open) return;
    setCountry(initialCountry);
    setWebsite(initialWebsite);
    setSuggestions(NO_SUGGESTIONS);
    setEditing(false);
    let live = true;
    void fetchCompanySuggestions(adminFetch, { orgId }).then((s) => {
      if (!live) return;
      setSuggestions(s);
      // Saved values and anything typed while the request ran always win:
      // a suggestion only fills a field that is still empty.
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
  // Both known and plausible: a short summary with one Save; the inputs only on "Change".
  const summary = !editing && !!country && !!website.trim() && isValidWebsite(website);

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
            {t(summary ? 'screens.commerceportal.setupHub.profileConfirmTitle' : 'screens.commerceportal.setupHub.profileTitle')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-3 md:mt-4">
          {summary ? (
            <div className="space-y-3 rounded-xl border border-border p-3" data-testid="profile-summary">
              <div>
                <p className="text-xs text-muted-foreground">{t('screens.commerceportal.orgOnboarding.country')}</p>
                <p className="text-base font-medium text-foreground" data-testid="profile-summary-country">{countryName}</p>
                {countrySourceKey && <p className="text-xs text-muted-foreground">{t(countrySourceKey)}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('screens.commerceportal.orgOnboarding.website')}</p>
                <p className="break-all text-base font-medium text-foreground" dir="ltr" data-testid="profile-summary-website">
                  {website}
                </p>
                {websiteSourceKey && <p className="text-xs text-muted-foreground">{t(websiteSourceKey)}</p>}
              </div>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-base"
                onClick={() => setEditing(true)}
                data-testid="profile-change"
              >
                {t('screens.commerceportal.orgOnboarding.change')}
              </Button>
            </div>
          ) : (
            <>
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
                  onChange={(e) => {
                    // Once the supplier types, the inputs stay: never flip to the summary mid-edit.
                    setEditing(true);
                    setWebsite(e.target.value);
                  }}
                  className="h-12 text-base focus-visible:ring-amber-500"
                  data-testid="profile-website"
                />
                {websiteSourceKey && <p className="text-xs text-muted-foreground">{t(websiteSourceKey)}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sh-country">{t('screens.commerceportal.orgOnboarding.country')}</Label>
                <select
                  id="sh-country"
                  value={country}
                  onChange={(e) => {
                    setEditing(true);
                    setCountry(e.target.value);
                  }}
                  data-testid="profile-country"
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
                {countrySourceKey && <p className="text-xs text-muted-foreground">{t(countrySourceKey)}</p>}
              </div>
            </>
          )}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter className="flex-row gap-2 md:mt-4">
          <Button
            type="button"
            className="h-12 flex-1 bg-amber-700 text-base font-semibold text-white hover:bg-amber-800"
            disabled={saving || !country || !isValidWebsite(website)}
            onClick={() => void save()}
            data-testid="profile-save"
          >
            {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('screens.commerceportal.setupHub.profileSave')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
