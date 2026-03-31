import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";

export function useOrbVoiceWidget() {
  const initialized = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const { user, session, loading } = useAuth();

  // Main init effect — waits for auth to resolve before initializing the widget
  useEffect(() => {
    // Don't do anything until auth state is resolved
    if (loading) return;

    function tryInit() {
      const orb = (window as any).VitanaOrb;
      if (!orb) return false;

      if (!initialized.current) {
        if (user && session) {
          // Authenticated: pass explicit token so the widget uses the correct identity
          localStorage.setItem('vitana.authToken', session.access_token);
          localStorage.setItem('vitana.userId', user.id);
          console.log("[ORB] Initializing widget for authenticated user", user.id);
          orb.init({ showFab: true, authToken: session.access_token });
        } else {
          // Anonymous: clear ALL possible auth keys the widget might auto-detect
          localStorage.removeItem('vitana.authToken');
          localStorage.removeItem('vitana.userId');

          // Temporarily hide the Supabase session key so the widget can't auto-detect it
          const supabaseKey = 'sb-inmkhvwdcuyhnxkgfvsb-auth-token';
          const savedSupabaseToken = localStorage.getItem(supabaseKey);
          if (savedSupabaseToken) {
            localStorage.removeItem(supabaseKey);
            console.log("[ORB] Temporarily cleared Supabase auth key for anonymous init");
          }

          console.log("[ORB] Initializing widget in anonymous mode");
          orb.init({ showFab: true, authToken: null });

          // Restore the Supabase session key so Supabase auth still works
          if (savedSupabaseToken) {
            localStorage.setItem(supabaseKey, savedSupabaseToken);
            console.log("[ORB] Restored Supabase auth key after init");
          }
        }
        initialized.current = true;
        console.log("[ORB] Widget initialized");
      }
      return true;
    }

    if (tryInit()) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryInit() || attempts >= 20) {
        clearInterval(interval);
        if (attempts >= 20) console.warn("[ORB] Widget script never loaded");
      }
    }, 500);

    return () => clearInterval(interval);
  }, [loading, user?.id, session?.access_token]);

  // Re-initialize the widget when the authenticated user changes
  useEffect(() => {
    const currentUserId = user?.id ?? null;

    if (lastUserId.current !== null && currentUserId !== null && lastUserId.current !== currentUserId) {
      console.log("[ORB] User changed, resetting widget", lastUserId.current, "→", currentUserId);
      const orb = (window as any).VitanaOrb;
      if (orb && initialized.current) {
        orb.destroy();
        initialized.current = false;

        // Re-initialize after a short delay with the new user's token
        setTimeout(() => {
          const freshOrb = (window as any).VitanaOrb;
          if (freshOrb && session) {
            localStorage.setItem('vitana.authToken', session.access_token);
            localStorage.setItem('vitana.userId', currentUserId);
            freshOrb.init({ showFab: true, authToken: session.access_token });
            initialized.current = true;
            console.log("[ORB] Widget re-initialized for new user");
          }
        }, 300);
      }
    }

    lastUserId.current = currentUserId;
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    return () => {
      const orb = (window as any).VitanaOrb;
      if (orb && initialized.current) {
        orb.destroy();
        initialized.current = false;
      }
    };
  }, []);
}
