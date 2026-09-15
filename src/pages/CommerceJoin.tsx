/**
 * Supplier registration — the first thing a supplier ever sees (VTID-03894).
 *
 * This is the shareable link. Everything else in the Commerce Portal sits
 * behind AuthGuard, so until this existed the link a supplier was handed
 * bounced them to the COMMUNITY login: a sign-in for a different product,
 * with no way onward to the portal they were invited to.
 *
 * Maxina only, deliberately. `vitanaland.com` maps to `maxina`
 * (`config/domain-tenant-mapping.ts`) and `PUBLIC_BASE_URL` is that same host,
 * so the tenant is not a runtime choice here — hardcoding it matches reality
 * rather than inventing a selector nobody can use yet.
 *
 * `preferred_role` stays `community`: there is no supplier role and none is
 * needed. AuthGuard gates on a session, not a role, and supplier identity
 * comes from OWNING a merchant/partner_tenant row, not from a claim on a JWT.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, Loader2, ShoppingBag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SEO from '@/components/SEO';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { CONFIRMATION_PATHS, getEmailRedirectUrl } from '@/utils/redirectUrls';
import { t } from '@/lib/i18n-toast';

const fieldClass =
  'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500';

/**
 * Neither signUp nor signInWithPassword carries a timeout of its own, so a
 * dead network leaves the button spinning forever. Same bounded deadline the
 * tenant portals adopted for exactly this (VTID-03652).
 */
const AUTH_DEADLINE_MS = 15_000;

function withDeadline<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), AUTH_DEADLINE_MS)),
  ]);
}

export default function CommerceJoin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduce = useReducedMotion();

  const [mode, setMode] = useState<'register' | 'signin'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  // Someone already signed in does not need to register; send them on.
  // VTID-03936: honor `?redirectTo=` (AuthGuard's own convention for a
  // /commerce/* deep link, e.g. an org invite) instead of always landing on
  // the generic portal — restricted to a /commerce path, never an open redirect.
  useEffect(() => {
    if (authLoading || !user) return;
    const redirectTo = searchParams.get('redirectTo');
    navigate(redirectTo && redirectTo.startsWith('/commerce') ? redirectTo : '/commerce', { replace: true });
  }, [user, authLoading, navigate, searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') {
        const { error: err } = await withDeadline(
          supabase.auth.signInWithPassword({ email, password }),
        );
        if (err) setError(err.message);
        // Success falls through to the effect above once `user` settles.
        return;
      }

      const { error: err } = await withDeadline(
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getEmailRedirectUrl(CONFIRMATION_PATHS.commerce),
            data: { full_name: fullName, tenant_slug: 'maxina', preferred_role: 'community' },
          },
        }),
      );
      if (err) setError(err.message);
      else setSentTo(email);
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'timeout'
          ? t('screens.commerceportal.join.timeout')
          : t('screens.commerceportal.join.failed'),
      );
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
      </div>
    );
  }

  const registering = mode === 'register';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SEO
        title={t('screens.commerceportal.join.seoTitle')}
        description={t('screens.commerceportal.join.seoDescription')}
        canonical={window.location.href}
      />

      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 inset-x-0 mx-auto h-[32rem] w-[32rem] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, ease: 'easeOut' as const } })}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 shrink-0 text-amber-400" />
            <span className="text-sm font-bold tracking-[0.2em] text-amber-400">VITANALAND</span>
            <span aria-hidden className="h-4 w-px bg-amber-500/25" />
            <span className="truncate text-xs text-slate-400">
              {t('screens.commerceportal.portalEyebrow')}
            </span>
          </div>

          {sentTo ? (
            // Registration does not end at "submitted" — it ends at a
            // confirmed mailbox, so say so plainly instead of dropping them
            // on a screen that looks like nothing happened.
            <div className="mt-8 rounded-3xl border border-amber-500/25 bg-slate-900/70 p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-amber-400" />
              <h1 className="mt-3 text-xl font-semibold text-slate-50">
                {t('screens.commerceportal.join.checkInboxTitle')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {t('screens.commerceportal.join.checkInboxBody', { email: sentTo })}
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSentTo('');
                  setMode('signin');
                }}
                className="mt-4 text-amber-400 hover:bg-transparent hover:text-amber-300"
              >
                {t('screens.commerceportal.join.alreadyConfirmed')}
              </Button>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-3xl font-semibold leading-tight text-slate-50">
                {t('screens.commerceportal.heroTitle')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {registering
                  ? t('screens.commerceportal.join.registerLead')
                  : t('screens.commerceportal.join.signinLead')}
              </p>

              <form onSubmit={submit} className="mt-6 space-y-3">
                {error && (
                  <Alert variant="destructive" className="border-red-900 bg-red-950/50 text-red-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {registering && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cj-name" className="text-slate-300">
                      {t('screens.commerceportal.join.yourName')}
                    </Label>
                    <Input
                      id="cj-name"
                      className={fieldClass}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={busy}
                      autoComplete="name"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="cj-email" className="text-slate-300">
                    {t('screens.portals.email')}
                  </Label>
                  <Input
                    id="cj-email"
                    type="email"
                    dir="ltr"
                    className={fieldClass}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={busy}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cj-password" className="text-slate-300">
                    {t('screens.portals.password')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="cj-password"
                      type={showPassword ? 'text' : 'password'}
                      className={`${fieldClass} pe-10`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={busy}
                      autoComplete={registering ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={t('screens.commerceportal.join.togglePassword')}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-xl bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
                >
                  {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {registering
                    ? t('screens.commerceportal.join.registerCta')
                    : t('screens.commerceportal.join.signinCta')}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMode(registering ? 'signin' : 'register');
                  setError('');
                }}
                className="mt-4 w-full text-center text-sm text-slate-400 underline-offset-4 transition-colors hover:text-amber-300 hover:underline"
              >
                {registering
                  ? t('screens.commerceportal.join.haveAccount')
                  : t('screens.commerceportal.join.noAccount')}
              </button>
            </>
          )}

          <p className="mt-8 text-center text-xs text-slate-600">
            {t('screens.commerceportal.footNote')}
          </p>
          <p className="mt-2 text-center text-xs">
            <Link to="/commerce-login" className="text-slate-600 underline-offset-4 hover:text-slate-400 hover:underline">
              {t('screens.commerceportal.join.otherSignin')}
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
