import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "https://gateway-q74ibpv6ia-uc.a.run.app";
const ORB_SCRIPT_ID = "vitana-orb-widget";

export function useOrbVoiceWidget() {
  const { session } = useAuth();
  const initialized = useRef(false);

  // ── Load script + init (once) ──────────────────────────────
  useEffect(() => {
    function tryInit() {
      const orb = (window as any).VitanaOrb;
      if (orb && !initialized.current) {
        orb.init({
          gatewayUrl: GATEWAY_URL,
          authToken: session?.access_token || "",
          lang: "de",
          showFab: true,
        });
        initialized.current = true;
        console.log("[ORB] Widget loaded and initialized");
      }
    }

    // If script already exists, just init
    if (document.getElementById(ORB_SCRIPT_ID)) {
      tryInit();
      return;
    }

    // Inject script
    const script = document.createElement("script");
    script.id = ORB_SCRIPT_ID;
    script.src = `${GATEWAY_URL}/command-hub/orb-widget.js?v=20260329`;
    script.onload = () => tryInit();
    script.onerror = () => console.warn("[ORB] Failed to load orb-widget.js");
    document.head.appendChild(script);

    return () => {
      (window as any).VitanaOrb?.destroy();
      const el = document.getElementById(ORB_SCRIPT_ID);
      if (el) el.remove();
      initialized.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update auth token when session refreshes ───────────────
  useEffect(() => {
    if (session?.access_token && initialized.current) {
      (window as any).VitanaOrb?.setAuth(session.access_token);
    }
  }, [session?.access_token]);
}
