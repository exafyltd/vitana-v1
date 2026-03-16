import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "https://gateway-q74ibpv6ia-uc.a.run.app";
const WIDGET_SRC = GATEWAY_URL + "/command-hub/orb-widget.js";

export function useOrbVoiceWidget() {
  const { session } = useAuth();
  const initialized = useRef(false);
  const scriptLoaded = useRef(false);

  // Load the widget script dynamically
  useEffect(() => {
    if (scriptLoaded.current) return;
    if (document.querySelector('script[src*="orb-widget"]')) {
      scriptLoaded.current = true;
      return;
    }
    const s = document.createElement("script");
    s.src = WIDGET_SRC;
    s.async = true;
    s.onload = () => { scriptLoaded.current = true; };
    document.body.appendChild(s);
  }, []);

  // Initialize once script is loaded and session is available
  useEffect(() => {
    const orb = (window as any).VitanaOrb;
    if (!orb) return;

    if (!initialized.current) {
      orb.init({
        gatewayUrl: GATEWAY_URL,
        authToken: session?.access_token || "",
        lang: "de"
      });
      initialized.current = true;
    } else {
      orb.setAuth(session?.access_token || "");
    }
  }, [session?.access_token]);

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
