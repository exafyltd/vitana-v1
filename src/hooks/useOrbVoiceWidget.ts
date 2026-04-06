import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useAIConsent } from "./useAIConsent";

const ORB_SCRIPT_URL = "https://gateway-q74ibpv6ia-uc.a.run.app/command-hub/orb-widget.js";
const ORB_SCRIPT_ID = "vtorb-script";
const PENDING_OPEN_KEY = "vitana_orb_pending_open";

/** Dynamically inject the ORB widget script tag */
function loadOrbScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(ORB_SCRIPT_ID)) {
      if ((window as any).VitanaOrb) { resolve(); return; }
      const check = setInterval(() => {
        if ((window as any).VitanaOrb) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error("ORB script timeout")); }, 10000);
      return;
    }
    const script = document.createElement("script");
    script.id = ORB_SCRIPT_ID;
    script.src = ORB_SCRIPT_URL;
    script.defer = true;
    script.onload = () => {
      const check = setInterval(() => {
        if ((window as any).VitanaOrb) { clearInterval(check); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(check); reject(new Error("ORB script timeout")); }, 5000);
    };
    script.onerror = () => reject(new Error("Failed to load ORB widget script"));
    document.head.appendChild(script);
  });
}

/** Remove the ORB widget script tag from DOM */
function removeOrbScript() {
  const script = document.getElementById(ORB_SCRIPT_ID);
  if (script) script.parentNode?.removeChild(script);
}

export function useOrbVoiceWidget() {
  const initialized = useRef(false);
  const { user, session, loading } = useAuth();
  const { hasConsent, isLoading: consentLoading } = useAIConsent();

  // Main effect — only load and init when consent is granted
  useEffect(() => {
    if (loading || consentLoading) return;

    // No consent → destroy widget and remove script
    if (!hasConsent) {
      const orb = (window as any).VitanaOrb;
      if (orb && initialized.current) {
        orb.destroy();
        initialized.current = false;
        console.log("[ORB] Widget destroyed — AI consent revoked");
      }
      removeOrbScript();
      return;
    }

    // Check if user just granted consent and wants the overlay to open
    let pendingOpen = false;
    try {
      pendingOpen = sessionStorage.getItem(PENDING_OPEN_KEY) === 'true';
      if (pendingOpen) sessionStorage.removeItem(PENDING_OPEN_KEY);
    } catch {}

    // Consent granted → load script and init widget
    let cancelled = false;

    loadOrbScript()
      .then(() => {
        if (cancelled) return;
        const orb = (window as any).VitanaOrb;
        if (!orb) return;

        if (!initialized.current) {
          if (user && session) {
            orb.init({ showFab: true, authToken: session.access_token });
          } else {
            orb.init({ showFab: true });
          }
          initialized.current = true;
          console.log("[ORB] Widget initialized (consent granted)");
        }

        // If user just consented via the placeholder, open overlay automatically
        if (pendingOpen) {
          console.log("[ORB] Pending open — launching overlay");
          const o = (window as any).VitanaOrb;
          if (o && typeof o.show === 'function') o.show();
        }
      })
      .catch((err) => {
        if (!cancelled) console.warn("[ORB] Failed to load widget:", err);
      });

    return () => { cancelled = true; };
  }, [loading, consentLoading, hasConsent, user?.id, session?.access_token]);

  // Watch for auth changes — reinit widget when user logs in or out
  useEffect(() => {
    if (loading || consentLoading || !hasConsent) return;
    const orb = (window as any).VitanaOrb;
    if (!orb || !initialized.current) return;

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
