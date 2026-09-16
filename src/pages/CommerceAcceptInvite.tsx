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
import { t } from '@/lib/i18n-toast';

type State = 'pending' | 'success' | 'already' | 'expired' | 'notFound' | 'failed';

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
        await adminFetch(`${PARTNER_ORGS_API}/invites/${token}/accept`, { method: 'POST' });
        if (cancelled) return;
        setState('success');
        navigate('/commerce', { replace: true });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        if (/already accepted/i.test(message)) setState('already');
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-100">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        <p className="text-sm text-slate-400">{t('screens.commerceportal.orgOnboarding.acceptPending')}</p>
      </div>
    );
  }

  const copy: Record<Exclude<State, 'pending' | 'success'>, { icon: typeof XCircle; text: string }> = {
    already: { icon: Clock, text: t('screens.commerceportal.orgOnboarding.acceptAlready') },
    expired: { icon: Clock, text: t('screens.commerceportal.orgOnboarding.acceptExpired') },
    notFound: { icon: XCircle, text: t('screens.commerceportal.orgOnboarding.acceptNotFound') },
    failed: { icon: XCircle, text: t('screens.commerceportal.orgOnboarding.acceptFailed') },
  };
  const { icon: Icon, text } = copy[state];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-slate-100">
      <div className="max-w-sm rounded-3xl border border-amber-500/25 bg-slate-900/70 p-6">
        <Icon className="mx-auto h-8 w-8 text-amber-400" />
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{text}</p>
        <Button
          onClick={() => navigate('/commerce')}
          className="mt-4 bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
        >
          <CheckCircle2 className="me-2 h-4 w-4" />
          {t('screens.commerceportal.orgOnboarding.goToPortal')}
        </Button>
      </div>
    </div>
  );
}
