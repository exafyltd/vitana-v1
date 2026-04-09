import { ReactElement, useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ArrowLeft } from "lucide-react";

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

  // Determine the login route for this tenant
  const getLoginRoute = useCallback(() => {
    const slug = localStorage.getItem('tenant_slug');
    if (slug === 'maxina') return '/maxina';
    if (slug === 'alkalma') return '/alkalma';
    if (slug === 'earthlinks') return '/earthlinks';
    return '/auth';
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
        navigate(getLoginRoute());
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
        <p className="text-muted-foreground text-sm animate-pulse">Signing you in…</p>
      </div>
    );
  }

  // OAuth timed out — recovery UI
  if (oauthState === 'timedOut') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-center space-y-2">
          <p className="text-foreground text-lg font-medium">Sign-in is taking longer than expected</p>
          <p className="text-muted-foreground text-sm">This can happen on some devices. Please try again.</p>
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
            Try Apple Sign-In again
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
            Back to login
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
