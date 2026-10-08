/**
 * VTID-04848 — the supplier approves their AI assistant.
 *
 * The assistant (Claude, ChatGPT, …) starts an OAuth 2.1 sign-in against
 * Supabase Auth; Supabase sends the supplier here with `?authorization_id=`.
 * Behind AuthGuard, so a supplier who is not signed in goes through
 * /commerce/join first and comes back. Approve / Cancel goes back to Supabase,
 * which answers with the assistant's redirect (carrying the one-time code)
 * and we follow it. An assistant approved before skips straight back.
 *
 * What the screen promises matches the gateway's Commerce MCP tools
 * (VTID-04847): set up the business and its products, read the setup state.
 * Submitting for verification is always confirmed by the supplier, and the
 * partner terms are accepted only on Vitanaland itself (owner decision
 * 2026-10-02).
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommerceShell } from '@/components/commerce/CommerceShell';
import { useAuth } from '@/context/AuthProvider';
import { t } from '@/lib/i18n-toast';
import { decideConsent, lookupConsent, redirectHostOf, type ConsentDetails } from '@/lib/commerce-mcp';

const K = 'screens.commerceconnect';
const CAN_DO = [`${K}.canDo1`, `${K}.canDo2`, `${K}.canDo3`] as const;

type View =
  | { kind: 'loading' }
  | { kind: 'consent'; details: ConsentDetails }
  | { kind: 'redirecting' }
  | { kind: 'invalid' };

export default function CommerceConnectAuthorize() {
  const [searchParams] = useSearchParams();
  const authorizationId = searchParams.get('authorization_id') ?? '';
  const { user } = useAuth();
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!authorizationId) {
      setView({ kind: 'invalid' });
      return;
    }
    let cancelled = false;
    void lookupConsent(authorizationId).then((r) => {
      if (cancelled) return;
      if (r.kind === 'redirect') {
        setView({ kind: 'redirecting' });
        window.location.assign(r.url);
      } else if (r.kind === 'consent') setView({ kind: 'consent', details: r.details });
      else setView({ kind: 'invalid' });
    });
    return () => {
      cancelled = true;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setWorking(true);
    setFailed(false);
    try {
      const next = await decideConsent(authorizationId, approve);
      if (!next) throw new Error('no_redirect');
      setView({ kind: 'redirecting' });
      window.location.assign(next);
    } catch {
      setFailed(true);
    } finally {
      setWorking(false);
    }
  };

  const client = view.kind === 'consent' && view.details.clientName ? view.details.clientName : t(`${K}.unknownClient`);
  const redirectHost = view.kind === 'consent' ? redirectHostOf(view.details.redirectUri) : null;

  return (
    <CommerceShell>
      <div className="mx-auto max-w-md py-10">
        <div className="rounded-3xl border border-amber-200 bg-card p-6 shadow-xl shadow-amber-900/5" data-testid="connect-authorize">
          {view.kind === 'loading' || view.kind === 'redirecting' ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-700" />
              <p className="text-sm text-muted-foreground">
                {view.kind === 'redirecting' ? t(`${K}.redirecting`) : t(`${K}.loading`)}
              </p>
            </div>
          ) : view.kind === 'invalid' ? (
            <p className="py-6 text-center text-sm text-muted-foreground" data-testid="connect-invalid">
              {t(`${K}.invalid`)}
            </p>
          ) : (
            <>
              <ShieldCheck className="h-8 w-8 text-amber-700" aria-hidden />
              <h1 className="mt-3 text-xl font-semibold text-foreground">{t(`${K}.title`, { client })}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`${K}.lead`, { client })}</p>
              {user?.email && (
                <p className="mt-2 text-xs text-muted-foreground">{t(`${K}.signedInAs`, { email: user.email })}</p>
              )}

              <p className="mt-5 text-sm font-medium text-foreground">{t(`${K}.canDoTitle`)}</p>
              <ul className="mt-2 space-y-2">
                {CAN_DO.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    {t(key)}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">{t(`${K}.youConfirm`)}</p>
              {redirectHost && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs leading-relaxed text-foreground" data-testid="connect-redirect-host">
                  {t(`${K}.redirectsTo`, { host: redirectHost })}
                </p>
              )}

              {failed && <p className="mt-4 text-sm text-destructive">{t(`${K}.failed`)}</p>}

              <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  disabled={working}
                  onClick={() => void decide(true)}
                  data-testid="connect-approve"
                  className="h-12 flex-1 rounded-xl bg-amber-700 font-semibold text-white hover:bg-amber-800"
                >
                  {working ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                  {t(`${K}.approve`)}
                </Button>
                <Button
                  variant="outline"
                  disabled={working}
                  onClick={() => void decide(false)}
                  className="h-12 flex-1 rounded-xl border-amber-300 font-semibold text-amber-800 hover:bg-amber-50"
                >
                  {t(`${K}.deny`)}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </CommerceShell>
  );
}
