import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SplitBarContent } from '@/components/ui/split-bar';
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseOAuthSignIn } from '@/hooks/useSupabaseOAuthSignIn';
import { unlockIOSAudioPlayback } from '@/lib/iosAudioUnlock';
import { getEmailRedirectUrl } from '@/utils/redirectUrls';
import { t } from '@/lib/i18n-toast';
import type { TenantEntry } from '@/lib/tenant-registry';

/**
 * VTID-05151 — sign-in / sign-up for one tenant's portal (TenantPortal).
 *
 * Sign-up is offered only when the tenant has `open_signup`; a closed tenant
 * shows the invite-only notice instead. OAuth buttons only when the tenant's
 * landing data says `oauth: true` (a new tenant's OAuth sign-up would land in
 * the default tenant until handle_new_user honours the tenant — lane A).
 *
 * Panes are SplitBarContent: the tabs themselves are rendered by ScreenFrame.
 * No string is hardcoded; nothing here is spoken.
 */
export type TenantAuthMode = 'signin' | 'signup';

interface TenantAuthCardProps {
  entry: TenantEntry;
  brand: string;
  /** Called after a successful password sign-in, before the session reaches the auth context. */
  onSignedIn: () => void;
}

export function TenantAuthCard({ entry, brand, onSignedIn }: TenantAuthCardProps) {
  const slug = entry.slug;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const oauthSignIn = useSupabaseOAuthSignIn();
  const confirmRedirect = getEmailRedirectUrl(`/${slug}?confirmed=true`);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    // Unlock iOS audio inside the submit gesture so the ORB greeting can play.
    unlockIOSAudioPlayback();
    setBusy(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(t('tenantPortal.errors.signInFailed'));
        return;
      }
      onSignedIn();
    } catch {
      setError(t('tenantPortal.errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.open_signup) return;
    setBusy(true);
    setError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: confirmRedirect,
          data: { full_name: fullName, tenant_slug: slug },
        },
      });
      if (signUpError) {
        setError(
          /already registered/i.test(signUpError.message)
            ? t('tenantPortal.errors.alreadyRegistered')
            : t('tenantPortal.errors.generic'),
        );
        return;
      }
      setSignupEmail(email);
    } catch {
      setError(t('tenantPortal.errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    try {
      await oauthSignIn.mutateAsync({
        provider,
        redirectTo: getEmailRedirectUrl('/home'),
        queryParams: { tenant_slug: slug },
      });
    } catch {
      setError(t('tenantPortal.errors.generic'));
    }
  };

  const errorLine = error ? (
    <p role="alert" aria-live="assertive" className="text-sm text-destructive" data-tenant-auth-error="">
      {error}
    </p>
  ) : null;

  const oauth =
    entry.landing.oauth === true ? (
      <div className="flex flex-col gap-2" data-tenant-auth-oauth="">
        <p className="text-center text-xs text-muted-foreground">{t('screens.portals.continueWith')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => handleOAuth('google')} disabled={oauthSignIn.isPending}>
            {t('screens.portals.google')}
          </Button>
          <Button type="button" variant="outline" onClick={() => handleOAuth('apple')} disabled={oauthSignIn.isPending}>
            {t('screens.portals.apple')}
          </Button>
        </div>
      </div>
    ) : null;

  return (
    <>
      <SplitBarContent value="signin" data-tenant-auth="signin">
        <form onSubmit={handleSignIn} className="flex flex-col gap-4" aria-label={t('tenantPortal.signInTitle', { brand })}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-signin-email">{t('screens.portals.email')}</Label>
            <Input
              id="tenant-signin-email"
              type="email"
              autoComplete="email"
              placeholder={t('screens.portals.yourEmailCom')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-signin-password">{t('screens.portals.password')}</Label>
            <Input
              id="tenant-signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {errorLine}
          <Button type="submit" disabled={busy}>
            {busy ? t('screens.portals.signing') : t('tenantPortal.signInButton')}
          </Button>
          {oauth}
        </form>
      </SplitBarContent>

      <SplitBarContent value="signup" data-tenant-auth="signup">
        {!entry.open_signup ? (
          <p className="text-sm text-muted-foreground" data-tenant-invite-only="">
            {t('tenantPortal.inviteOnly', { brand })}
          </p>
        ) : signupEmail ? (
          <div className="flex flex-col gap-3" role="status" aria-live="polite" data-tenant-signup-sent="">
            <p className="font-semibold">{t('screens.portals.checkYourEmail')}</p>
            <p className="text-sm text-muted-foreground">{t('tenantPortal.checkEmail', { email: signupEmail })}</p>
            <ResendConfirmationButton email={signupEmail} redirectUrl={confirmRedirect} />
            <Button type="button" variant="ghost" onClick={() => setSignupEmail(null)}>
              {t('screens.portals.useDifferentEmail')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSignUp} className="flex flex-col gap-4" aria-label={t('tenantPortal.signUpTitle', { brand })}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tenant-signup-name">{t('screens.portals.fullName')}</Label>
              <Input
                id="tenant-signup-name"
                autoComplete="name"
                placeholder={t('screens.portals.yourFullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tenant-signup-email">{t('screens.portals.email')}</Label>
              <Input
                id="tenant-signup-email"
                type="email"
                autoComplete="email"
                placeholder={t('screens.portals.yourEmailCom')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tenant-signup-password">{t('screens.portals.password')}</Label>
              <Input
                id="tenant-signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {errorLine}
            <Button type="submit" disabled={busy}>
              {busy ? t('screens.portals.creatingAccount') : t('tenantPortal.signUpButton')}
            </Button>
            {oauth}
          </form>
        )}
      </SplitBarContent>
    </>
  );
}
