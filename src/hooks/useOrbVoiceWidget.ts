import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";

/** Check whether the external ORB widget is actually alive in the DOM */
function isOrbAlive(): boolean {
  return !!(
    document.querySelector('.vtorb-fab') ||
    document.querySelector('[class^="vtorb-fab"]') ||
    document.querySelector('.vitana-orb') ||
    document.getElementById('vitana-orb-fab')
  );
}

export function useOrbVoiceWidget() {
  const initialized = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const { user, session, loading } = useAuth();

  // Main init effect — waits for auth to resolve, then inits widget
  useEffect(() => {
    if (loading) return;

    function tryInit() {
      const orb = (window as any).VitanaOrb;
      if (!orb) return false;

      // If we think we're initialized but the widget was destroyed externally, reset
      if (initialized.current && !isOrbAlive()) {
        console.log("[ORB] Widget was destroyed externally, resetting state");
        initialized.current = false;
      }

      if (!initialized.current) {
        // Temporarily hide Supabase persistence key so the widget can't auto-detect a stale session
        const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        let sbValue: string | null = null;
        if (sbKey) {
          sbValue = localStorage.getItem(sbKey);
          localStorage.removeItem(sbKey);
        }

        console.log("[ORB] Initializing widget in anonymous mode");
        orb.init({ showFab: true });
        initialized.current = true;

        // Restore Supabase key
        if (sbKey && sbValue !== null) {
          localStorage.setItem(sbKey, sbValue);
        }

        console.log("[ORB] Widget initialized");

        // If user is already authenticated, immediately set auth
        if (user && session) {
          console.log("[ORB] Setting auth for user", user.id);
          orb.setAuth(session.access_token);
          localStorage.setItem('vitana.authToken', session.access_token);
          localStorage.setItem('vitana.userId', user.id);
        }
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

  // Sync auth state when user changes (login/logout/switch)
  useEffect(() => {
    if (loading || !initialized.current) return;

    const orb = (window as any).VitanaOrb;
    if (!orb) return;

    const currentUserId = user?.id ?? null;
    const previousUserId = lastUserId.current;

    if (currentUserId !== previousUserId) {
      if (currentUserId && session) {
        // User logged in or switched
        console.log("[ORB] setAuth for user", currentUserId);
        orb.setAuth(session.access_token);
        localStorage.setItem('vitana.authToken', session.access_token);
        localStorage.setItem('vitana.userId', currentUserId);
      } else if (!currentUserId && previousUserId) {
        // User logged out — destroy and re-init anonymous
        console.log("[ORB] User logged out, destroy + re-init anonymous");
        localStorage.removeItem('vitana.authToken');
        localStorage.removeItem('vitana.userId');

        orb.destroy();
        initialized.current = false;

        // Re-init anonymous immediately
        const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        let sbValue: string | null = null;
        if (sbKey) {
          sbValue = localStorage.getItem(sbKey);
          localStorage.removeItem(sbKey);
        }

        orb.init({ showFab: true });
        initialized.current = true;

        if (sbKey && sbValue !== null) {
          localStorage.setItem(sbKey, sbValue);
        }

        orb.setAuth('');
        console.log("[ORB] Anonymous re-init complete");
      }
    }

    lastUserId.current = currentUserId;
  }, [loading, user?.id, session?.access_token]);

  // Cleanup on unmount
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
