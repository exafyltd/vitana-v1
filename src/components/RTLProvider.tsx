import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface RTLContextValue {
  isRTL: boolean;
  toggleRTL: () => void;
}

const RTLContext = createContext<RTLContextValue | undefined>(undefined);

// VTID-03701. Base language codes that read right-to-left. Arabic is the
// only one shipped today; this is a set (not a single check) so a future
// RTL locale (Hebrew, Farsi, Urdu) is one entry, not a second code path.
const RTL_BASE_LANGUAGES = new Set(['ar']);

export function RTLProvider({ children }: { children: React.ReactNode }) {
  const { selectedLanguage } = useLanguage();
  const languageIsRTL = useMemo(
    () => RTL_BASE_LANGUAGES.has((selectedLanguage || '').split('-')[0]),
    [selectedLanguage],
  );

  // The selected language drives direction automatically. `toggleRTL` stays
  // as a manual override on top of that — e.g. for a dev-only "preview RTL"
  // control — rather than the only mechanism, which is what left every
  // Arabic session rendering LTR (VTID-03701): nothing ever called it.
  const [override, setOverride] = useState<boolean | null>(null);
  const isRTL = override ?? languageIsRTL;

  // Any language switch clears a manual override — keyed on the language
  // itself, not on `languageIsRTL`, so switching between two LTR languages
  // (e.g. de -> en) also clears a stale override instead of only clearing
  // it when RTL-ness actually flips.
  useEffect(() => {
    setOverride(null);
  }, [selectedLanguage]);

  const toggleRTL = () => {
    setOverride(!isRTL);
  };

  useEffect(() => {
    // Apply RTL direction to document
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    
    // Add RTL class for additional styling if needed
    if (isRTL) {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [isRTL]);

  return (
    <RTLContext.Provider value={{ isRTL, toggleRTL }}>
      {children}
    </RTLContext.Provider>
  );
}

export function useRTL() {
  const context = useContext(RTLContext);
  if (context === undefined) {
    throw new Error("useRTL must be used within an RTLProvider");
  }
  return context;
}