import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";

export function useOrbVoiceWidget() {
  const initialized = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    function tryInit() {
      const orb = (window as any).VitanaOrb;
      if (!orb) return false;

      if (!initialized.current) {
        orb.init({ showFab: true });
        initialized.current = true;
        console.log("[ORB] Widget initialized");
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
  }, []);

  // Re-initialize the widget when the authenticated user changes
  // This prevents stale identity from a previous account
  useEffect(() => {
    const currentUserId = user?.id ?? null;

    // Detect user switch (including sign-out → sign-in as different user)
    if (lastUserId.current !== null && currentUserId !== null && lastUserId.current !== currentUserId) {
      console.log("[ORB] User changed, resetting widget", lastUserId.current, "→", currentUserId);
      const orb = (window as any).VitanaOrb;
      if (orb && initialized.current) {
        // Destroy and re-init to clear any cached identity/session
        orb.destroy();
        initialized.current = false;

        // Re-initialize after a short delay
        setTimeout(() => {
          const freshOrb = (window as any).VitanaOrb;
          if (freshOrb) {
            freshOrb.init({ showFab: true });
            initialized.current = true;
            console.log("[ORB] Widget re-initialized for new user");
          }
        }, 300);
      }
    }

    lastUserId.current = currentUserId;
  }, [user?.id]);

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
