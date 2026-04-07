import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useAIConsent } from "./useAIConsent";

const PENDING_OPEN_KEY = "vitana_orb_pending_open";

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
  const { user, session, loading } = useAuth();
  const { hasConsent, isLoading: consentLoading } = useAIConsent();

  // Init the widget — always show FAB, pass auth token when available
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
        if (user && session) {
          orb.init({ showFab: true, authToken: session.access_token });
          console.log("[ORB] Widget initialized (authenticated)");
        } else {
          orb.init({ showFab: true });
          console.log("[ORB] Widget initialized (anonymous)");
        }
        initialized.current = true;
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

  // Watch for auth changes — reinit widget when user logs in or out
  useEffect(() => {
    if (loading) return;
    const orb = (window as any).VitanaOrb;
    if (!orb || !initialized.current) return;

    // Auth state changed — destroy and reinit with correct mode
    orb.destroy();
    initialized.current = false;

    if (user && session) {
      orb.init({ showFab: true, authToken: session.access_token });
    } else {
      orb.init({ showFab: true });
    }
    initialized.current = true;
    console.log("[ORB] Reinitialized for auth change:", user ? "authenticated" : "anonymous");
  }, [user?.id]);

  // After consent is freshly granted (via placeholder), auto-open the overlay
  useEffect(() => {
    if (consentLoading || !hasConsent) return;
    let pendingOpen = false;
    try {
      pendingOpen = sessionStorage.getItem(PENDING_OPEN_KEY) === 'true';
      if (pendingOpen) sessionStorage.removeItem(PENDING_OPEN_KEY);
    } catch {}

    if (pendingOpen) {
      console.log("[ORB] Consent just granted — auto-opening overlay");
      const orb = (window as any).VitanaOrb;
      if (orb && typeof orb.show === 'function') orb.show();
    }
  }, [consentLoading, hasConsent]);

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

  return { hasConsent, consentLoading };
}
