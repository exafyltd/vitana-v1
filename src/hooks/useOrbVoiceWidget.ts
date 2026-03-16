import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  "https://vitana-gateway-86804897789.us-central1.run.app";

const ORB_INIT_RETRY_MS = 150;
const ORB_INIT_MAX_RETRIES = 80;

export function useOrbVoiceWidget() {
  const { session } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    let retries = 0;
    let retryTimer: number | undefined;

    const initOrRefreshOrb = () => {
      const orb = (window as any).VitanaOrb;

      if (!orb) {
        if (retries < ORB_INIT_MAX_RETRIES) {
          retries += 1;
          retryTimer = window.setTimeout(initOrRefreshOrb, ORB_INIT_RETRY_MS);
        }
        return;
      }

      if (!initialized.current) {
        orb.init({
          gatewayUrl: GATEWAY_URL,
          authToken: session?.access_token || "",
          lang: "de",
        });
        initialized.current = true;
        return;
      }

      if (typeof orb.setAuth === "function") {
        orb.setAuth(session?.access_token || "");
      }
    };

    initOrRefreshOrb();

    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
    };
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
