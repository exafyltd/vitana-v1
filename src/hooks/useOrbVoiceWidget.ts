import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useAIConsent } from "./useAIConsent";

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

  // Main init effect — waits for auth + consent to resolve, then inits widget
  useEffect(() => {
    if (loading || consentLoading) return;

    // If no AI consent, destroy the widget if it was previously initialized
    if (!hasConsent) {
      const orb = (window as any).VitanaOrb;
      if (orb && initialized.current) {
        orb.destroy();
        initialized.current = false;
        console.log("[ORB] Widget destroyed — AI consent revoked");
      }
      return;
    }

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
          console.log("[ORB] Widget initialized (authenticated, consent granted)");
        } else {
          orb.init({ showFab: true });
          console.log("[ORB] Widget initialized (anonymous, consent granted)");
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
  }, [loading, consentLoading, hasConsent, user?.id, session?.access_token]);

  // Watch for auth changes — reinit widget when user logs in or out
  useEffect(() => {
    if (loading || consentLoading || !hasConsent) return;
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
