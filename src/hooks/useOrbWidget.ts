/**
 * ORB Voice Widget Loader Hook
 *
 * Dynamically loads the unified orb-widget.js from the Gateway and initializes
 * VitanaOrb on every screen. This gives community/landing/mobile screens the
 * same full-screen voice overlay that Command Hub uses.
 *
 * Lifecycle:
 * 1. Inject <script src="…/orb-widget.js"> into <head> (once)
 * 2. On load → VitanaOrb.init({ gatewayUrl, authToken, lang, showFab })
 * 3. On session change → VitanaOrb.setAuth(newToken)
 * 4. On unmount → VitanaOrb.destroy() + remove script
 */

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "";
const ORB_SCRIPT_ID = "vitana-orb-widget";

export function useOrbWidget() {
  const { session } = useAuth();
  const initialized = useRef(false);

  // ── Load script + init (once) ──────────────────────────────
  useEffect(() => {
    // Prevent double-loading
    if (document.getElementById(ORB_SCRIPT_ID)) {
      const orb = (window as any).VitanaOrb;
      if (orb && !initialized.current) {
        orb.init({
          gatewayUrl: GATEWAY_URL,
          authToken: session?.access_token || "",
          lang: navigator.language,
          showFab: true,
        });
        initialized.current = true;
      }
      return;
    }

    const script = document.createElement("script");
    script.id = ORB_SCRIPT_ID;
    script.src = `${GATEWAY_URL}/command-hub/orb-widget.js?v=20260329`;
    script.onload = () => {
      const orb = (window as any).VitanaOrb;
      if (orb && !initialized.current) {
        orb.init({
          gatewayUrl: GATEWAY_URL,
          authToken: session?.access_token || "",
          lang: navigator.language,
          showFab: true,
        });
        initialized.current = true;
        console.log("[ORB] Widget loaded and initialized");
      }
    };
    script.onerror = () => {
      console.warn("[ORB] Failed to load orb-widget.js");
    };
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
