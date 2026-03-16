import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "https://vitana-gateway-86804897789.us-central1.run.app";

export function useOrbVoiceWidget() {
  const { session } = useAuth();
  const initialized = useRef(false);

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
      // Keep token fresh on session refresh
      orb.setAuth(session?.access_token || "");
    }
  }, [session?.access_token]);

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
