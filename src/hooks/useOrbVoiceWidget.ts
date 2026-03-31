import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";

export function useOrbVoiceWidget() {
  const initialized = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const { user, session, loading } = useAuth();

  // Main init effect — waits for auth to resolve, then inits widget anonymously
  useEffect(() => {
    if (loading) return;

    function tryInit() {
      const orb = (window as any).VitanaOrb;
      if (!orb) return false;

      if (!initialized.current) {
        // Always init anonymous — no auth token passed
        console.log("[ORB] Initializing widget in anonymous mode");
        orb.init({ showFab: true });
        initialized.current = true;
        console.log("[ORB] Widget initialized");

        // If user is already authenticated, immediately set auth
        if (user && session) {
          console.log("[ORB] Setting auth for user", user.id);
          orb.setAuth(session.access_token);
          localStorage.setItem('vitana.authToken', session.access_token);
          localStorage.setItem('vitana.userId', user.id);
        }
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

  // Sync auth state when user changes (login/logout/switch)
  useEffect(() => {
    if (loading || !initialized.current) return;

    const orb = (window as any).VitanaOrb;
    if (!orb) return;

    const currentUserId = user?.id ?? null;
    const previousUserId = lastUserId.current;

    if (currentUserId !== previousUserId) {
      if (currentUserId && session) {
        // User logged in or switched
        console.log("[ORB] setAuth for user", currentUserId);
        orb.setAuth(session.access_token);
        localStorage.setItem('vitana.authToken', session.access_token);
        localStorage.setItem('vitana.userId', currentUserId);
      } else {
        // User logged out
        console.log("[ORB] setAuth('') — back to anonymous");
        orb.setAuth('');
        localStorage.removeItem('vitana.authToken');
        localStorage.removeItem('vitana.userId');
      }
    }

    lastUserId.current = currentUserId;
  }, [loading, user?.id, session?.access_token]);

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
