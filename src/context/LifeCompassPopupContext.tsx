import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { LifeCompassPopup } from "@/components/memory/LifeCompassPopup";

interface LifeCompassPopupContextValue {
  open: boolean;
  openPopup: () => void;
  closePopup: () => void;
  setOpen: (open: boolean) => void;
}

const LifeCompassPopupContext = createContext<LifeCompassPopupContextValue | undefined>(undefined);

export const LIFE_COMPASS_OPEN_EVENT = "vitana:open-life-compass";

interface LifeCompassPopupProviderProps {
  children: ReactNode;
}

export function LifeCompassPopupProvider({ children }: LifeCompassPopupProviderProps) {
  const [open, setOpen] = useState(false);

  const openPopup = useCallback(() => setOpen(true), []);
  const closePopup = useCallback(() => setOpen(false), []);

  // Listen for global requests to open the popup (e.g. voice commands dispatched
  // from the ORB session handler running outside React tree).
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(LIFE_COMPASS_OPEN_EVENT, handler);
    return () => window.removeEventListener(LIFE_COMPASS_OPEN_EVENT, handler);
  }, []);

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
