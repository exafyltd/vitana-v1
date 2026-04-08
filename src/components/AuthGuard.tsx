import { ReactElement, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ArrowLeft } from "lucide-react";

interface AuthGuardProps {
  children: ReactElement;
}

/**
 * AuthGuard — thin loading gate.
 *
 * OAuth callback recovery is handled exclusively by AuthProvider,
 * which keeps `loading = true` until recovery completes (or times out).
 * AuthGuard simply renders a spinner while loading, a recovery UI on
 * failure, and the protected children when authenticated.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showRecovery, setShowRecovery] = useState(false);

  // Determine the login route for this tenant
  const getLoginRoute = useCallback(() => {
    const slug = localStorage.getItem('tenant_slug');
    if (slug === 'maxina') return '/maxina';
    if (slug === 'alkalma') return '/alkalma';
    if (slug === 'earthlinks') return '/earthlinks';
    return '/auth';
  }, []);

  // Safety timeout: if loading stays true for 20s, show recovery UI
  useEffect(() => {
    if (!loading) {
      setShowRecovery(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!user) {
        console.warn('[AuthGuard] Loading timed out after 20s — showing recovery UI');
        setShowRecovery(true);
      }
    }, 20000);

    return () => clearTimeout(timer);
  }, [loading, user]);

  // When loading finishes with no user and no callback, redirect to login
  useEffect(() => {
    if (loading || user) return;

    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        console.debug('[AuthGuard] No session found, redirecting to login');
        navigate(getLoginRoute());
      }
    });

    return () => { cancelled = true; };
  }, [user, loading, navigate, getLoginRoute]);

  // --- Render ---

  // Loading spinner (AuthProvider is handling recovery)
  if (loading && !showRecovery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm animate-pulse">Signing you in…</p>
      </div>
    );
  }

  // Recovery UI — loading timed out or auth failed
  if (showRecovery || (!loading && !user)) {
    const savedProvider = localStorage.getItem('oauth_provider') as 'apple' | 'google' | null;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-center space-y-2">
          <p className="text-foreground text-lg font-medium">Sign-in is taking longer than expected</p>
          <p className="text-muted-foreground text-sm">This can happen on some devices. Please try again.</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={async () => {
              setShowRecovery(false);

              // Check if session exists now (may have recovered in background)
              const { data: { session } } = await supabase.auth.getSession();
              if (session) return;

              // Re-initiate OAuth with the original provider
              const provider = savedProvider || 'apple';
              try {
                localStorage.setItem('oauth_provider', provider);
                await supabase.auth.signInWithOAuth({
                  provider,
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
            Try Sign-In again
          </Button>
          <Button
            onClick={() => {
              setShowRecovery(false);
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

  return children;
}
