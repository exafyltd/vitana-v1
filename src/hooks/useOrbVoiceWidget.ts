import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";

const GATEWAY_URL = "https://gateway-q74ibpv6ia-uc.a.run.app";

export function useOrbVoiceWidget() {
  const { session } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    function tryInit() {
      const orb = (window as any).VitanaOrb;
      if (!orb) return false;

      if (!initialized.current) {
        orb.init({
          gatewayUrl: GATEWAY_URL,
          authToken: session?.access_token || "",
          lang: "de",
          showFab: true,
        });
        initialized.current = true;
        console.log("[ORB] Widget initialized");
      } else {
        orb.setAuth(session?.access_token || "");
      }
      return true;
    }

    // Try immediately
    if (tryInit()) return;

    // Retry every 500ms for up to 10 seconds
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryInit() || attempts >= 20) {
        clearInterval(interval);
        if (attempts >= 20) console.warn("[ORB] Widget script never loaded");
      }
    }, 500);

    return () => clearInterval(interval);
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
