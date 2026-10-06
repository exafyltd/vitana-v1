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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Mail, ShoppingBag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SEO from '@/components/SEO';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseOAuthSignIn, type SupportedOAuthProvider } from '@/hooks/useSupabaseOAuthSignIn';
import { CONFIRMATION_PATHS, getEmailRedirectUrl } from '@/utils/redirectUrls';
import { t } from '@/lib/i18n-toast';
import { oauthReturnUrl, rememberCommerceOAuth } from '@/lib/oauth-return';

const fieldClass = 'border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-amber-500';
const optionClass =
  'h-12 w-full justify-center gap-2.5 rounded-xl border-border bg-card text-base font-medium text-foreground hover:bg-amber-50 hover:text-foreground';

const GoogleIcon = () => (
  <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AppleIcon = () => (
  <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
  </svg>
);

/**
 * VTID-04791: the sign-in providers offered first, fastest option on top.
 * Only providers the rest of the app already uses (Maxina, Alkalma,
 * Earthlinks, Exafy admin portals) are listed — Google and Apple. Microsoft
 * is `azure` in useSupabaseOAuthSignIn and slots in here as one more entry
 * once it is enabled in the Supabase auth settings; it is deliberately not
 * shown before then, because a button that cannot work is worse than none.
 */
export const COMMERCE_OAUTH_PROVIDERS: ReadonlyArray<{
  id: SupportedOAuthProvider;
  label: string;
  Icon: () => JSX.Element;
}> = [
  { id: 'google', label: 'screens.commerceportal.join.continueWithGoogle', Icon: GoogleIcon },
  { id: 'apple', label: 'screens.commerceportal.join.continueWithApple', Icon: AppleIcon },
];

const PROVIDER_NAME: Record<SupportedOAuthProvider, string> = {
  google: 'Google',
  apple: 'Apple',
  azure: 'Microsoft',
  facebook: 'Facebook',
};

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
  // VTID-04791: the provider buttons come first; the email form only opens
  // when asked for. Password stays the email method — no magic link.
  const [method, setMethod] = useState<'choose' | 'email'>('choose');
  const oauth = useSupabaseOAuthSignIn();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  // VTID-04832: a provider round-trip that failed or expired comes back here
  // (see src/lib/oauth-return.ts) with a retry message instead of the intro.
  const [error, setError] = useState(() => {
    const kind = searchParams.get('oauth_error');
    if (kind === 'expired') return t('screens.commerceportal.join.oauthExpired');
    if (kind === 'cancelled' || kind === 'failed') return t('screens.commerceportal.join.oauthRetry');
    return '';
  });
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


  const targetPath = () => {
    const redirectTo = searchParams.get('redirectTo');
    return redirectTo && redirectTo.startsWith('/commerce') ? redirectTo : '/commerce';
  };

  // Same OAuth path the tenant portals use (WebView-aware hook). Lands back
  // on the Commerce Portal, where AuthGuard hydrates the callback; the
  // tenant is maxina, as for the email sign-up below.
  const continueWith = async (provider: SupportedOAuthProvider) => {
    setError('');
    localStorage.setItem('tenant_slug', 'maxina');
    rememberCommerceOAuth();
    try {
      await oauth.mutateAsync({
        provider,
        // VTID-04832: back to the host this started on (staging stays on staging).
        redirectTo: oauthReturnUrl(targetPath()),
        queryParams: { tenant_slug: 'maxina' },
      });
    } catch {
      setError(t('screens.commerceportal.join.oauthFailed', { provider: PROVIDER_NAME[provider] }));
    }
  };

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const registering = mode === 'register';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={t('screens.commerceportal.join.seoTitle')}
        description={t('screens.commerceportal.join.seoDescription')}
        canonical={window.location.href}
      />

      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 inset-x-0 mx-auto h-[32rem] w-[32rem] rounded-full bg-amber-100/40 blur-[120px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, ease: 'easeOut' as const } })}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 shrink-0 text-amber-700" />
            <span className="text-sm font-bold tracking-[0.2em] text-amber-700">VITANALAND</span>
            <span aria-hidden className="h-4 w-px bg-amber-300" />
            <span className="truncate text-xs text-muted-foreground">
              {t('screens.commerceportal.portalEyebrow')}
            </span>
          </div>

          {sentTo ? (
            // Registration does not end at "submitted" — it ends at a
            // confirmed mailbox, so say so plainly instead of dropping them
            // on a screen that looks like nothing happened.
            <div className="mt-8 rounded-3xl border border-amber-300 bg-card p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-amber-600" />
              <h1 className="mt-3 text-xl font-semibold text-foreground">
                {t('screens.commerceportal.join.checkInboxTitle')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('screens.commerceportal.join.checkInboxBody', { email: sentTo })}
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSentTo('');
                  setMode('signin');
                }}
                className="mt-4 text-amber-700 hover:bg-transparent hover:text-amber-800"
              >
                {t('screens.commerceportal.join.alreadyConfirmed')}
              </Button>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-3xl font-semibold leading-tight text-foreground">
                {registering
                  ? t('screens.commerceportal.join.title')
                  : t('screens.commerceportal.join.signinTitle')}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {registering
                  ? t('screens.commerceportal.join.registerLead')
                  : t('screens.commerceportal.join.signinLead')}
              </p>

              {error && (
                <Alert variant="destructive" className="mt-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {method === 'choose' ? (
                <div className="mt-6 space-y-3">
                  {COMMERCE_OAUTH_PROVIDERS.map(({ id, label, Icon }) => (
                    <Button
                      key={id}
                      type="button"
                      variant="outline"
                      disabled={oauth.isPending}
                      onClick={() => continueWith(id)}
                      data-testid={`join-option-${id}`}
                      className={optionClass}
                    >
                      <Icon />
                      {t(label)}
                    </Button>
                  ))}
                  <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
                    <span aria-hidden className="h-px flex-1 bg-border" />
                    {t('screens.commerceportal.join.or')}
                    <span aria-hidden className="h-px flex-1 bg-border" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMethod('email');
                      setError('');
                    }}
                    data-testid="join-option-email"
                    className={optionClass}
                  >
                    <Mail className="h-5 w-5 text-amber-700" />
                    {t('screens.commerceportal.join.continueWithEmail')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-6 space-y-3">
                  {registering && (
                    <div className="space-y-1.5">
                      <Label htmlFor="cj-name" className="text-foreground">
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
                    <Label htmlFor="cj-email" className="text-foreground">
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
                    <Label htmlFor="cj-password" className="text-foreground">
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
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={busy}
                    className="h-11 w-full rounded-xl bg-amber-700 font-semibold text-white hover:bg-amber-800"
                  >
                    {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {registering
                      ? t('screens.commerceportal.join.registerCta')
                      : t('screens.commerceportal.join.signinCta')}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('choose');
                      setError('');
                    }}
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-amber-700"
                  >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {t('screens.commerceportal.join.allOptions')}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setMode(registering ? 'signin' : 'register');
                  setError('');
                }}
                className="mt-4 min-h-11 w-full text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-amber-700 hover:underline"
              >
                {registering
                  ? t('screens.commerceportal.join.haveAccount')
                  : t('screens.commerceportal.join.noAccount')}
              </button>
            </>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            {t('screens.commerceportal.footNote')}
          </p>
        </motion.div>
      </main>
    </div>
  );
}
