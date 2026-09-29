/**
 * Commerce Partner Onboarding (VTID-03936, frontend Phase 2) — the landing
 * page for an org invite link (`/commerce/invites/:token/accept`).
 *
 * Sits behind `AuthGuard`: a signed-out visitor is bounced to
 * `/commerce/join?redirectTo=<this path>` (AuthGuard's existing convention
 * for any `/commerce/*` deep link) and lands back here once signed in
 * (CommerceJoin now honors `redirectTo` for exactly this — VTID-03936).
 * Calls `POST /api/v1/partner-orgs/invites/:token/accept` on mount, then
 * redirects to `/commerce` on success, or shows an error state (already
 * accepted / expired / not found) in the same amber-banner visual language
 * `ConnectionWorkbench.tsx` uses for its "awaiting platform approval" state.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ORGS_API } from '@/lib/commerce-host';
import { CommerceShell } from '@/components/commerce/CommerceShell';
import { businessHomeFor, setActiveOrgId } from '@/lib/business-mode';
import { t } from '@/lib/i18n-toast';

type State = 'pending' | 'success' | 'already' | 'expired' | 'notFound' | 'wrongEmail' | 'failed';

export default function CommerceAcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<State>('pending');

  useEffect(() => {
    if (!token) {
      setState('notFound');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${PARTNER_ORGS_API}/invites/${token}/accept`, { method: 'POST' });
        if (cancelled) return;
        setState('success');
        // VTID-03999: land in the business you just joined, on that role's
        // home — the orders for staff/professional, the team for an admin.
        const orgId: string | undefined = res?.partner_organization_id;
        if (orgId) setActiveOrgId(orgId);
        navigate(orgId ? businessHomeFor(res?.role ?? 'staff') : '/commerce', { replace: true });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        // VTID-04337: the gateway now binds an invite to the address it was
        // sent to and answers 403 INVITE_EMAIL_MISMATCH / _UNVERIFIED.
        if (/INVITE_EMAIL_(MISMATCH|UNVERIFIED)/.test(message)) setState('wrongEmail');
        else if (/already accepted/i.test(message)) setState('already');
        else if (/expired/i.test(message)) setState('expired');
        else if (/not found/i.test(message)) setState('notFound');
        else setState('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  if (state === 'pending' || state === 'success') {
    return (
      <CommerceShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('screens.commerceportal.orgOnboarding.acceptPending')}</p>
        </div>
      </CommerceShell>
    );
  }

  const copy: Record<Exclude<State, 'pending' | 'success'>, { icon: typeof XCircle; text: string }> = {
    already: { icon: Clock, text: t('screens.commerceportal.orgOnboarding.acceptAlready') },
    expired: { icon: Clock, text: t('screens.commerceportal.orgOnboarding.acceptExpired') },
    notFound: { icon: XCircle, text: t('screens.commerceportal.orgOnboarding.acceptNotFound') },
    wrongEmail: { icon: XCircle, text: t('screens.commerceportal.orgOnboarding.acceptWrongEmail') },
    failed: { icon: XCircle, text: t('screens.commerceportal.orgOnboarding.acceptFailed') },
  };
  const { icon: Icon, text } = copy[state];

  return (
    <CommerceShell>
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="max-w-sm rounded-3xl border border-amber-500/25 bg-card p-6">
        <Icon className="mx-auto h-8 w-8 text-amber-500 dark:text-amber-400" />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
        <Button
          onClick={() => navigate('/commerce')}
          className="mt-4 bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
        >
          <CheckCircle2 className="me-2 h-4 w-4" />
          {t('screens.commerceportal.orgOnboarding.goToPortal')}
        </Button>
      </div>
    </div>
    </CommerceShell>
  );
}
