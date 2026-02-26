import { ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface AuthGuardProps {
  children: ReactElement;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [hydrationChecked, setHydrationChecked] = useState(false);

  const isProcessingOAuth = window.location.hash.includes('access_token');

  // One-shot hydration check: when auth settles with no user, verify via getSession
  useEffect(() => {
    if (loading || user || isProcessingOAuth) {
      setHydrationChecked(false);
      return;
    }

    // Auth settled with no user — do a single server check before redirecting
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        console.debug('[AuthGuard] No session found, redirecting to /auth');
        navigate('/auth');
      }
      // If session exists, AuthProvider will catch up via onAuthStateChange
      setHydrationChecked(true);
    });

    return () => { cancelled = true; };
  }, [user, loading, navigate, isProcessingOAuth]);

  if (loading || isProcessingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}