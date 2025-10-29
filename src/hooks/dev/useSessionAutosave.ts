import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSessionRestore } from "./useSessionRestore";

interface SessionAutosaveOptions {
  tab: string;
  subtab?: string;
  context?: string;
  vtid?: string;
  filters?: Record<string, any>;
}

/**
 * Hook to automatically save sessions on navigation, modal interactions, and page exit
 * Also checks for restored sessions on mount
 */
export function useSessionAutosave(options: SessionAutosaveOptions) {
  const location = useLocation();
  const { saveSession } = useSessionRestore();
  const sessionStartTime = useRef<number>(Date.now());
  const lastSavedState = useRef<string>("");

  // Check for restored session on mount
  useEffect(() => {
    const restoredSession = sessionStorage.getItem("restored_session");
    if (restoredSession) {
      try {
        const session = JSON.parse(restoredSession);
        console.log("Restored session detected:", session);
        
        // Clear the restored session marker after reading
        sessionStorage.removeItem("restored_session");
        
        // You can emit a custom event here if components need to react to restored state
        window.dispatchEvent(new CustomEvent("session-restored", { detail: session }));
      } catch (e) {
        console.error("Failed to parse restored session:", e);
      }
    }
  }, []);

  // Calculate session duration in minutes
  const getSessionDuration = () => {
    return Math.floor((Date.now() - sessionStartTime.current) / 60000);
  };

  // Create a unique state signature to detect changes
  const createStateSignature = () => {
    return JSON.stringify({
      tab: options.tab,
      subtab: options.subtab,
      context: options.context,
      vtid: options.vtid,
      path: location.pathname,
    });
  };

  // Save session with current state
  const saveCurrentSession = () => {
    const stateSignature = createStateSignature();
    
    // Only save if state has actually changed
    if (stateSignature === lastSavedState.current) {
      return;
    }

    const duration = getSessionDuration();
    
    // Don't save sessions shorter than 10 seconds
    if (duration < 1 && lastSavedState.current !== "") {
      return;
    }

    saveSession({
      tab: options.tab,
      subtab: options.subtab,
      context: options.context,
      vtid: options.vtid,
      filters: options.filters,
      duration,
      path: location.pathname,
      scrollPosition: window.scrollY,
    });

    lastSavedState.current = stateSignature;
    sessionStartTime.current = Date.now(); // Reset timer for next session
  };

  // Save on tab/subtab changes
  useEffect(() => {
    const stateSignature = createStateSignature();
    
    // Save previous state before switching
    if (lastSavedState.current && lastSavedState.current !== stateSignature) {
      saveCurrentSession();
    }
    
    lastSavedState.current = stateSignature;
  }, [options.tab, options.subtab, options.context, options.vtid, location.pathname]);

  // Save on page exit/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentSession();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Save when component unmounts (navigation away)
      saveCurrentSession();
    };
  }, [options.tab, options.subtab, options.context, options.vtid]);

  // Return function to manually trigger save (for modal interactions)
  return {
    saveCurrentSession,
  };
}
