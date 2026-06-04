import { ReactElement, useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { DOMAIN_TENANT_MAP } from "@/config/domain-tenant-mapping";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface AuthGuardProps {
  children: ReactElement;
}

type OAuthState = 'idle' | 'processing' | 'timedOut';

/**
 * Detect OAuth callback params in URL hash or query string.
 */
function hasOAuthCallback(): boolean {
  const hash = window.location.hash;
  const search = window.location.search;
  return hash.includes('access_token') || 
         hash.includes('code=') ||
         search.includes('code=');
}

function clearCallbackParams() {
  window.history.replaceState(null, '', window.location.pathname);
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [oauthState, setOauthState] = useState<OAuthState>('idle');
  const recoveryAttempted = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const isCallback = hasOAuthCallback();

  // Determine the login route for this tenant/role.
  // VTID-AUTH-RESUME: Also handles exafy-admin users who don't have a
  // tenant_slug in localStorage — checks the current path and the stale
  // user's app_metadata so they redirect to /exafy-admin, not /.
  const getLoginRoute = useCallback(() => {
    // Admin users: if we're on an admin route or user was an exafy admin
    const isAdminRoute = window.location.pathname.startsWith('/admin') ||
                         window.location.pathname.startsWith('/exafy-admin');
    if (isAdminRoute) return '/exafy-admin';

    // Prefer the localStorage tenant slug (set after a previous visit), but
    // fall back to the hostname → tenant map so a fresh browser context (e.g.
    // a shared link opened from WhatsApp) doesn't bounce through `/` →
    // `/_intro/<tenant>` and lose the `?redirectTo=` deep-link target.
    const slug = localStorage.getItem('tenant_slug')
      || DOMAIN_TENANT_MAP[window.location.hostname];
    if (slug === 'maxina') return '/maxina';
    if (slug === 'alkalma') return '/alkalma';
    if (slug === 'earthlinks') return '/earthlinks';
    return '/';
  }, []);

  // Start processing when OAuth callback is detected
  useEffect(() => {
    if (!isCallback || user || loading) return;
    if (oauthState !== 'idle') return;

    setOauthState('processing');
    console.debug('[AuthGuard] OAuth callback detected, entering processing state');
  }, [isCallback, user, loading, oauthState]);

  // Active recovery + polling + timeout while processing
  useEffect(() => {
    if (oauthState !== 'processing') return;
    if (recoveryAttempted.current) return;
    recoveryAttempted.current = true;

    // One-shot active recovery attempt
    (async () => {
      try {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const code = queryParams.get('code') || hashParams.get('code');

        // Try PKCE code exchange
        if (code) {
          console.debug('[AuthGuard] Attempting PKCE code exchange');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            clearCallbackParams();
            console.debug('[AuthGuard] PKCE exchange succeeded');
            return; // onAuthStateChange will update user
          }
        }

        // Try implicit hash tokens
        if (accessToken && refreshToken) {
          console.debug('[AuthGuard] Attempting setSession with hash tokens');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data.session) {
            clearCallbackParams();
            console.debug('[AuthGuard] setSession succeeded');
            return;
          }
        }

        // Fallback: refreshSession
        await supabase.auth.refreshSession();
      } catch (err) {
        console.warn('[AuthGuard] Active recovery error:', err);
      }
    })();

    // Poll getSession every 1s
    pollRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          clearCallbackParams();
          console.debug('[AuthGuard] Session found via polling');
          // AuthProvider's onAuthStateChange should update user,
          // but ensure state exits processing
          setOauthState('idle');
        }
      } catch (err) {
        console.warn('[AuthGuard] Poll error:', err);
      }
    }, 1000);

    // 8s timeout
    timeoutRef.current = setTimeout(() => {
      console.warn('[AuthGuard] OAuth processing timed out after 8s');
      setOauthState('timedOut');
    }, 8000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [oauthState]);

  // When user arrives (from any recovery path), clean up
  useEffect(() => {
    if (user && oauthState === 'processing') {
      setOauthState('idle');
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearCallbackParams();
    }
  }, [user, oauthState]);

  // One-shot hydration check: when auth settles with no user AND no callback, redirect
  useEffect(() => {
    if (loading || user || isCallback || oauthState !== 'idle') return;

    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        console.debug('[AuthGuard] No session found, redirecting to login');
        // BOOTSTRAP-NOTIF-CATEGORIES: Preserve the deep-link target so that
        // after login the user lands on the originally requested URL (e.g.
        // tapping a chat push notification on mobile should take them to the
        // conversation, not the home page).
        const intended = window.location.pathname + window.location.search;
        const loginRoute = getLoginRoute();

        // Default-landing routes the native shell cold-starts on are plain
        // launches, not user-intended deep links — they should still see the
        // brand intro (splash → /_intro/<tenant> → sign-up). Only genuine
        // content deep links skip the intro to reach their target faster.
        const PLAIN_LAUNCH_PATHS = ['/', '/home', '/autopilot'];
        const isPlainLaunch = PLAIN_LAUNCH_PATHS.includes(window.location.pathname);
        const hasDeepLink = !isPlainLaunch
          && !!intended && intended !== '/' && !intended.startsWith(loginRoute);

        if (hasDeepLink) {
          // Genuine deep link → skip intro, preserve target (VTID-AUTH-RESUME).
          navigate(`${loginRoute}?redirectTo=${encodeURIComponent(intended)}`);
        } else {
          // Plain launch → route through the brand intro before the sign-up portal.
          const slug = loginRoute.slice(1); // 'maxina' | 'alkalma' | 'earthlinks' | 'exafy-admin' | ''
          if (slug === 'maxina' || slug === 'alkalma' || slug === 'earthlinks') {
            navigate(`/_intro/${slug}`);
          } else {
            navigate(loginRoute); // exafy-admin / unknown tenant: no intro
          }
        }
      }
    });

    return () => { cancelled = true; };
  }, [user, loading, navigate, isCallback, oauthState, getLoginRoute]);

  // --- Render ---

  // Auth loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // OAuth processing (with spinner + message)
  if (oauthState === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm animate-pulse">{t('screens.common.signingYou')}</p>
      </div>
    );
  }

  // OAuth timed out — recovery UI
  if (oauthState === 'timedOut') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-center space-y-2">
          <p className="text-foreground text-lg font-medium">{t('screens.common.signinTakingLongerThanExpected')}</p>
          <p className="text-muted-foreground text-sm">{t('screens.common.thisCanHappenSomeDevicesPlease')}</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={async () => {
              // Reset state and try again
              recoveryAttempted.current = false;
              setOauthState('idle');
              clearCallbackParams();

              // Check if session exists now
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                // Session found, AuthProvider will pick it up
                return;
              }

              // Re-initiate Apple sign-in
              try {
                localStorage.setItem('tenant_slug', localStorage.getItem('tenant_slug') || 'maxina');
                await supabase.auth.signInWithOAuth({
                  provider: 'apple',
                  options: {
                    redirectTo: window.location.origin + '/' + (localStorage.getItem('tenant_slug') || 'maxina'),
                  }
                });
              } catch (err) {
                console.error('[AuthGuard] Retry OAuth error:', err);
                navigate(getLoginRoute());
              }
            }}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('screens.common.tryAppleSigninAgain')}
          </Button>
          <Button
            onClick={() => {
              clearCallbackParams();
              recoveryAttempted.current = false;
              setOauthState('idle');
              navigate(getLoginRoute());
            }}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('screens.common.backLogin')}
          </Button>
        </div>
      </div>
    );
  }

  // No user and no callback — AuthGuard will redirect via the hydration check
  if (!user) {
    return null;
  }

  return children;
}
