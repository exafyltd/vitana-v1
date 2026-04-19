import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { LifeCompassPopup } from "@/components/memory/LifeCompassPopup";

interface LifeCompassPopupContextValue {
  open: boolean;
  openPopup: () => void;
  closePopup: () => void;
  setOpen: (open: boolean) => void;
}

const LifeCompassPopupContext = createContext<LifeCompassPopupContextValue | undefined>(undefined);

export const LIFE_COMPASS_OPEN_EVENT = "vitana:open-life-compass";
const HISTORY_MARKER = "life-compass-popup";

interface LifeCompassPopupProviderProps {
  children: ReactNode;
}

export function LifeCompassPopupProvider({ children }: LifeCompassPopupProviderProps) {
  const [open, setOpen] = useState(false);
  // Tracks whether we pushed a history state for the current open lifecycle so
  // back-button close doesn't leave a stray entry in the stack and a
  // controlled close doesn't trigger another popstate.
  const pushedHistoryRef = useRef(false);

  const openPopup = useCallback(() => setOpen(true), []);
  const closePopup = useCallback(() => setOpen(false), []);

  // Listen for global requests to open the popup (e.g. voice commands).
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(LIFE_COMPASS_OPEN_EVENT, handler);
    return () => window.removeEventListener(LIFE_COMPASS_OPEN_EVENT, handler);
  }, []);

  // Android hardware back button (and browser back) should close the popup
  // instead of leaving the current screen. We do this by pushing a lightweight
  // history marker when the popup opens and listening for popstate.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (open) {
      window.history.pushState({ [HISTORY_MARKER]: true }, "");
      pushedHistoryRef.current = true;

      const onPopState = () => {
        pushedHistoryRef.current = false;
        setOpen(false);
      };
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }

    // Popup was closed programmatically (tap X, tap backdrop, select a goal).
    // If we still own a history entry, pop it so the stack stays clean.
    if (pushedHistoryRef.current) {
      pushedHistoryRef.current = false;
      const state = window.history.state;
      if (state && typeof state === "object" && (state as Record<string, unknown>)[HISTORY_MARKER]) {
        window.history.back();
      }
    }
  }, [open]);

  return (
    <LifeCompassPopupContext.Provider value={{ open, openPopup, closePopup, setOpen }}>
      {children}
      {/* Mount the popup only when open so the underlying life_compass query
          doesn't fire on every page load for users who never interact with it. */}
      {open && <LifeCompassPopup open={open} onOpenChange={setOpen} />}
    </LifeCompassPopupContext.Provider>
  );
}

export function useLifeCompassPopup() {
  const ctx = useContext(LifeCompassPopupContext);
  if (!ctx) {
    throw new Error("useLifeCompassPopup must be used within LifeCompassPopupProvider");
  }
  return ctx;
}

/**
 * Fire-and-forget global opener. Safe to call from non-React code
 * (e.g. voice intent handlers, global event listeners, window bridges).
 */
export function requestOpenLifeCompass() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LIFE_COMPASS_OPEN_EVENT));
  }
}
