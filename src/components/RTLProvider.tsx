import { createContext, useContext, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * BOOTSTRAP-AR-ZH-EXPANSION — direction now follows the SELECTED LANGUAGE.
 *
 * WHAT WAS WRONG
 *
 * This provider held `isRTL` as `useState(false)` and changed it only through
 * a `toggleRTL()` that **nothing in the codebase ever called**. So `isRTL` was
 * permanently `false`: `document.documentElement.dir` stayed `"ltr"` forever,
 * and every `dir={isRTL ? 'rtl' : 'ltr'}` call site across the UI resolved to
 * `ltr` no matter what language the user picked.
 *
 * The whole RTL system was inert — mounted, provided, consumed, and incapable
 * of ever being true. Arabic could not render right-to-left under any
 * circumstance. `languageOptions` recorded this as the reason AR was deferred
 * past the 18 Aug release ("RTLProvider is not wired to the selected
 * language"), and that note was exactly right.
 *
 * This is the shape worth recognising: not a missing feature, but a complete
 * feature wired to a value that could never change — indistinguishable from
 * working code in review, and silent at runtime.
 *
 * WHAT IT DOES NOW
 *
 * `isRTL` is DERIVED from `useLanguage().selectedLanguage`. There is no local
 * state and no setter, so direction cannot drift out of sync with language —
 * the two cannot disagree because there is only one value.
 *
 * `toggleRTL` is gone rather than kept as a no-op. Nothing called it, and a
 * manual override sitting beside a derived value is precisely how the two
 * would come to disagree later.
 *
 * ORDERING: this provider is mounted inside `App.tsx`, which renders beneath
 * `LanguageProvider` in `main.tsx`, so `useLanguage()` is available here. If
 * either mount point moves, this breaks loudly at render (the hook throws
 * outside its provider) rather than silently returning LTR — which is the
 * failure mode being fixed, so it must not be reintroduced by a defensive
 * try/catch.
 */

/**
 * Right-to-left scripts among the shipped and draft locales.
 *
 * Keyed on the BASE language tag, so `ar-XA`, `ar-SA` and a bare `ar` all
 * resolve identically — the app stores `ar-XA` in `languageOptions` but
 * `stt_language`/stored preferences have carried other regional forms.
 *
 * Deliberately a small explicit set rather than `Intl.Locale().textInfo`:
 * that API is not available in every browser this app supports, and a silent
 * `undefined` there would fall back to LTR — reproducing this exact bug with
 * a more modern-looking implementation.
 */
const RTL_BASE_LANGUAGES: ReadonlySet<string> = new Set(['ar', 'he', 'fa', 'ur']);

export function isRtlLanguage(language: string | null | undefined): boolean {
  const base = (language || '').toLowerCase().split(/[-_]/)[0];
  return RTL_BASE_LANGUAGES.has(base);
}

interface RTLContextValue {
  isRTL: boolean;
}

const RTLContext = createContext<RTLContextValue | undefined>(undefined);

export function RTLProvider({ children }: { children: React.ReactNode }) {
  const { selectedLanguage } = useLanguage();
  const isRTL = isRtlLanguage(selectedLanguage);

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";

    // Class kept for stylesheets that hook `.rtl` directly. Prefer logical
    // properties (ms-*/me-*, start/end) in new work — see CLAUDE.md — but a
    // number of existing rules key off this class.
    if (isRTL) {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [isRTL]);

  // Memoised so consumers do not re-render on every provider render. The
  // value changes only when direction actually flips.
  const value = useMemo(() => ({ isRTL }), [isRTL]);

  return <RTLContext.Provider value={value}>{children}</RTLContext.Provider>;
}

export function useRTL() {
  const context = useContext(RTLContext);
  if (context === undefined) {
    throw new Error("useRTL must be used within an RTLProvider");
  }
  return context;
}
