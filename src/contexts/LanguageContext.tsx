import { createContext, useContext, ReactNode, useState, useEffect, useRef, useMemo, useCallback, Children, cloneElement, isValidElement } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/context/AuthProvider';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';
import { setI18nLocale, notifyI18nLocaleChanged } from '@/lib/i18n-toast';
import { ensureCatalog, onCatalogLoaded } from '@/i18n';

interface LanguageContextType {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  languageOptions: Array<{ label: string; value: string }>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// `status` controls visibility in the user-facing language picker.
// Only `ga` languages appear by default; `beta`/`draft` are dev-only
// (override via `?i18n-preview=1` in the URL).
//
// VTID-03509 — a `ga` entry here is a PROMISE, not a switch. Before flipping a
// locale to `ga`, all three of these must be true, or users get a half-German
// UI with no way back:
//   1. src/i18n/<locale>/ exists and is at parity with de (npm run i18n:audit)
//   2. the locale is registered in BOTH maps in src/i18n/index.ts — an
//      unregistered locale silently renders 100% German (see the note there)
//   3. the gateway catalog knows it (services/gateway/src/i18n/catalog.ts),
//      or push notifications and emails arrive in German
export const languageOptions: Array<{ label: string; value: string; status: 'ga' | 'beta' | 'draft' }> = [
  { label: "German (DE)", value: "de-DE", status: 'ga' },     // primary / source of truth
  { label: "English (EN)", value: "en-US", status: 'ga' },    // mirror
  // 18 Aug 2026 market release. A locale is flipped to 'ga' only once its
  // catalog is genuinely complete: `npm run i18n:audit` FAILS a 'ga' locale
  // below 100% of DE, so this is gated on measured coverage, not on intent.
  // ES/SR meet all five GA conditions, each independently verified — coverage
  // alone was never enough, and claimed 100% while three of these were broken:
  //   1. 14,163/14,163 keys                    (npm run i18n:audit)
  //   2. 0 keys flagged _pending_review
  //   3. 0 placeholder mismatches vs DE        (audit; catches "{usado}" etc.)
  //   4. 0 drift vs their EN source            (npm run i18n:stale)
  //   5. 0 formal-register values in SR        (544 informal, 0 Vi/Vaš)
  { label: "Spanish (ES)", value: "es-ES", status: 'ga' },
  { label: "Serbian (SR)", value: "sr-RS", status: 'ga' },
  { label: "French (FR)", value: "fr-FR", status: 'ga' },
  { label: "Portuguese (BR)", value: "pt-BR", status: 'ga' },
  { label: "Russian (RU)", value: "ru-RU", status: 'ga' },
  { label: "Polish (PL)", value: "pl-PL", status: 'ga' },
  // VTID-03701 — the two blockers noted here as of 18 Aug are both closed:
  // RTLProvider now derives direction from selectedLanguage (was a dead
  // local toggle nothing ever called), and the CJK font stack landed
  // separately (VTID-03569, tailwind.config.ts). Bumped draft -> beta once
  // i18n-parity-gate.mjs reported all 5 file-based surfaces PASS; the sixth
  // (db-content — nav_catalog_i18n has 0 rows for both) is what still holds
  // these at beta rather than ga. Flip to 'ga' once that seed lands AND
  // this comment is updated to say so — do not flip on file-surfaces alone,
  // that is the exact mistake the gate's own db-content warning describes.
  { label: "Arabic (AR)", value: "ar-XA", status: 'beta' },
  { label: "Chinese (ZH)", value: "zh-CN", status: 'beta' },
  // VTID-03701 — 11th language, full parity build-out. 'draft' until the same
  // six-surface gate the AR/ZH note above describes reports a real PASS:
  // catalog coverage/parity vs DE, 0 _pending_review, 0 placeholder mismatches,
  // 0 stale-vs-source drift, 0 siz-form register violations, and non-zero
  // nav_catalog_i18n/journey_checklist_translations rows — plus native-speaker
  // review. None of that exists yet; this entry only makes the locale
  // selectable behind `?i18n-preview=1` so the pipeline below has somewhere
  // to write to.
  { label: "Turkish (TR)", value: "tr-TR", status: 'draft' },
];

// User-facing list: only GA, unless ?i18n-preview=1 is set.
export function getVisibleLanguageOptions() {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('i18n-preview')) {
    return languageOptions;
  }
  return languageOptions.filter((o) => o.status === 'ga');
}

const ALLOWED_LANGUAGES = languageOptions.map(opt => opt.value);
const LANGUAGE_STORAGE_KEY = 'selected_language';

// Get initial language: localStorage > de-DE (German default for primary user base)
function getInitialLanguage(): string {
  const stored = getLocalStorageItem('global', 'language', LANGUAGE_STORAGE_KEY);
  if (stored && ALLOWED_LANGUAGES.includes(stored)) {
    return stored;
  }
  return 'de-DE'; // German as default for new users
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  
  const [selectedLanguage, setLocalLanguage] = useState<string>(() => {
    const initial = getInitialLanguage();
    setI18nLocale(initial); // sync the i18n-toast singleton at boot
    // Set <html lang> at boot so browser hyphenation rules (CSS hyphens: auto)
    // pick the right syllable dictionary for the user's language. Without this
    // German compound words like "Datenschutz-Einstellungen" don't break on
    // mobile viewports because the browser uses English hyphenation rules.
    if (typeof document !== 'undefined') {
      document.documentElement.lang = initial.split('-')[0] || 'de';
    }
    return initial;
  });

  // Bumped when a lazily-loaded locale catalog finishes loading, so consumers
  // re-read the now-populated catalog. Only the default (de) is bundled; every
  // other locale arrives asynchronously.
  //
  // VTID-03660 — the value used to be DISCARDED (`const [, setCatalogVersion]`)
  // and left out of the contextValue useMemo below. Re-rendering the provider
  // is not enough: the memo returned the SAME object, so React bailed out of
  // re-rendering every context consumer and `useTranslation` never looked at
  // the catalog again. `catalogs[locale]` is filled IN PLACE, so the data was
  // sitting right there, correct and complete, behind a tree that had stopped
  // asking. Measured in a real browser: switching to Spanish rendered the
  // hardcoded English fallback and stayed there indefinitely, while switching
  // to German and back to Spanish rendered Spanish immediately — proof the
  // catalog had loaded and only the re-render was missing.
  //
  // This must stay in the memo deps. It is the ONLY signal that a catalog
  // arrived; `selectedLanguage` already changed before the fetch resolved.
  const [catalogVersion, setCatalogVersion] = useState(0);
  useEffect(() => {
    const unsubscribe = onCatalogLoaded(() => setCatalogVersion((v) => v + 1));
    return unsubscribe;
  }, []);

  // VTID-03662 — this MUST happen during render, not in an effect.
  //
  // `lookup()` / `t()` from i18n-toast are plain function calls made DURING
  // render, and they read this module-level locale. An effect runs AFTER the
  // render it belongs to, so every lookup in the render that a language change
  // triggers resolved against the PREVIOUS locale — and nothing re-rendered
  // afterwards to correct it, because setI18nLocale writes a module variable
  // and schedules nothing.
  //
  // The bug hid behind VTID-03660's catalog event: the FIRST visit to a locale
  // fires onCatalogLoaded, which forces exactly one extra render, in which the
  // module locale is finally current. Every subsequent visit to an
  // already-loaded locale has no such event, so those strings stayed one
  // language behind. Measured: es -> de -> es rendered Spanish, Spanish,
  // German; adding French in between made a later es render FRENCH. A user
  // browsing more than two languages sees a page in two languages at once.
  //
  // Writing during render is correct here rather than a shortcut: this is a
  // cache mirroring React state that is READ during render, so it has to be
  // WRITTEN during render to agree with the output. It is idempotent and
  // derives only from state, so a double invoke or a discarded render is
  // harmless.
  setI18nLocale(selectedLanguage);

  // These two ARE side effects and stay in an effect: one touches the DOM
  // outside React's tree, the other starts a fetch.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = selectedLanguage.split('-')[0] || 'de';
    }
    void ensureCatalog(selectedLanguage);
  }, [selectedLanguage]);

  // Tracks a pending language change until server confirms it
  const pendingLanguageRef = useRef<string | null>(null);
  
  // Track if we've already synced from server to avoid overriding local changes
  const [hasInitializedFromServer, setHasInitializedFromServer] = useState(false);

  // Sync from server preferences ONLY on initial load
  useEffect(() => {
    if (!hasInitializedFromServer && preferences?.stt_language) {
      const localStored = getLocalStorageItem('global', 'language', LANGUAGE_STORAGE_KEY);
      
      if (localStored && localStored !== preferences.stt_language) {
        console.log('[LANG] Local override:', localStored, '(server had:', preferences.stt_language, ')');
        setLocalLanguage(localStored);
        pendingLanguageRef.current = localStored;
        if (user) {
          updatePreferences({ stt_language: localStored });
        }
      } else {
        console.log('[LANG] Initial sync from server:', preferences.stt_language);
        setLocalLanguage(preferences.stt_language);
        // VTID-03670: the ORB voice widget (command-hub/orb-widget.js) reads
        // the raw `vitana.lang` localStorage key directly — it has no access
        // to this Context, so it never sees `selectedLanguage` corrections.
        // Without this write, a browser/device that never went through
        // setSelectedLanguage() (a fresh profile, cleared storage, a second
        // device) leaves `vitana.lang` unset even after this effect
        // correctly resolves the React app's own language from the server —
        // and the widget falls back to navigator.language instead of the
        // user's actual saved preference. Every other consumer here reads
        // React state or the namespaced key; only the widget reads this one.
        localStorage.setItem('vitana.lang', preferences.stt_language);
      }

      setHasInitializedFromServer(true);
    }
  }, [preferences?.stt_language, hasInitializedFromServer]);

  // Keep runtime language in sync when preferences are changed outside LanguageContext
  useEffect(() => {
    if (!user) return;
    if (!hasInitializedFromServer || !preferences?.stt_language) return;

    // If there's a pending change, only clear it once server confirms
    if (pendingLanguageRef.current !== null) {
      if (preferences.stt_language === pendingLanguageRef.current) {
        console.log('[LANG] Server confirmed pending language:', pendingLanguageRef.current);
        pendingLanguageRef.current = null;
      } else {
        // Server hasn't confirmed yet — don't revert
        return;
      }
    }

    if (preferences.stt_language !== selectedLanguage) {
      // Don't override if localStorage explicitly has the current selection
      const localStored = getLocalStorageItem('global', 'language', LANGUAGE_STORAGE_KEY);
      if (localStored && localStored === selectedLanguage) {
        console.log('[LANG] Keeping localStorage selection:', localStored, '(server has:', preferences.stt_language, ')');
        pendingLanguageRef.current = localStored;
        if (user) {
          updatePreferences({ stt_language: localStored });
        }
        return;
      }
      console.log('[LANG] Syncing runtime language from preferences:', preferences.stt_language);
      setLocalLanguage(preferences.stt_language);
      setLocalStorageItem('global', 'language', LANGUAGE_STORAGE_KEY, preferences.stt_language);
      // VTID-03670: see the matching write in the initial-sync effect above —
      // the ORB widget reads this raw key directly and never sees a
      // React-state-only correction.
      localStorage.setItem('vitana.lang', preferences.stt_language);
    }
  }, [user, hasInitializedFromServer, preferences?.stt_language, selectedLanguage]);

  const setSelectedLanguage = useCallback((language: string) => {
    if (!ALLOWED_LANGUAGES.includes(language)) {
      console.error('[LANG] Invalid language:', language, '- fallback to de-DE');
      language = "de-DE";
    }
    
    console.log('[LANG] Rule-based change:', language, new Date().toISOString());
    
    setLocalLanguage(language);
    pendingLanguageRef.current = language;
    
    setLocalStorageItem('global', 'language', LANGUAGE_STORAGE_KEY, language);
    localStorage.setItem('vitana.lang', language);
    
    if (!user) {
      console.log('[LANG] User not authenticated, skipping server sync');
      // Keep pendingLanguageRef set — auth may resolve shortly after,
      // and Effect 2 would otherwise revert the selection
      return;
    }
    
    // VTID-03671 — clear the voice OVERRIDE when it no longer matches the
    // chosen language. Do not write a replacement.
    //
    // This block used to map each language to a hardcoded Google Chirp3-HD id
    // ('de-DE-Chirp3-HD-Achernar', 'pt-BR-Chirp3-HD-Zephyr', …), so every
    // language change persisted a GOOGLE voice against the user's profile —
    // while the platform was moving voice to Polly and Nova on AWS.
    //
    // `tts_voice` is only an override. useTextToSpeech already derives a voice
    // from `stt_language` when it is absent, and reads it with optional
    // chaining throughout, so null is a supported state rather than a hole:
    //   - de/en/es/fr/pt/ru/pl → the Gemini map
    //   - sr                   → the Google Speech map (Polly has NO Serbian
    //                            voice in any engine, so Serbian stays on
    //                            Google by standing decision)
    //
    // So today's audible behaviour is unchanged — the derived default resolves
    // to the same voice the old code wrote. What changes is that it is no
    // longer WRITTEN. Persisting a provider-specific id is exactly what turns a
    // future provider switch into a per-user data migration instead of a
    // config change (CLAUDE.md §2c), and this stops that pile growing.
    //
    // Clearing rather than writing a Polly id on purpose: the frontend still
    // calls the Google edge functions directly, so a Polly voice name here
    // would name a voice nothing can currently play.
    const currentVoice = preferences?.tts_voice;
    const voiceMatchesLanguage = !!currentVoice && currentVoice.startsWith(language);

    if (currentVoice && !voiceMatchesLanguage) {
      console.log('[LANG] Clearing stale voice override:', currentVoice, '→ derive from', language);
      updatePreferences({ stt_language: language, tts_voice: null });
    } else {
      updatePreferences({ stt_language: language });
    }
  }, [user, preferences?.tts_voice, updatePreferences]);

  // Memoized so this root-level provider doesn't hand every consumer a fresh
  // object (and thus a re-render) each time the provider itself re-renders.
  //
  // `catalogVersion` is a dependency even though it appears in none of the
  // fields (VTID-03660). That reads like a mistake and is the opposite: the
  // catalogs are mutated IN PLACE, so nothing in this object can ever change
  // when one arrives. Without the dep the memo is stable, React bails out, and
  // the freshly-loaded language never reaches the screen. Removing it looks
  // like removing an unused variable and silently restores that bug.
  const contextValue = useMemo(
    () => ({
      selectedLanguage,
      setSelectedLanguage,
      languageOptions,
      isLoading,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion is
    // deliberately a dep without being a field; see the comment above.
    [selectedLanguage, setSelectedLanguage, isLoading, catalogVersion]
  );

  // VTID-03663 — cascade the language change into the whole subtree.
  //
  // `lookup()` / `t()` from i18n-toast are plain function calls, not hooks, so a
  // component that renders them without also calling useTranslation/useLanguage
  // subscribes to nothing. 614 of the 701 components that render catalog
  // strings are in exactly that shape. React only re-renders CONSUMERS when a
  // context value changes, so those 614 kept the outgoing language until
  // something unrelated re-rendered them — a page in two languages at once.
  //
  // The children element is created once in main.tsx and handed in as a prop,
  // so on a provider re-render `oldProps.children === newProps.children` and
  // React bails out of the entire subtree before reaching any of them. Cloning
  // with a prop that changes gives the child new props, which defeats that
  // bailout; the child's own render then produces fresh elements for ITS
  // children, and the re-render cascades down naturally.
  //
  // Cloning is NOT a remount: same element type and key, so React reuses the
  // fibers and every component keeps its state, scroll position and in-progress
  // form input. Keying the subtree on the locale would have been the one-line
  // version and would have destroyed all three.
  //
  // The tick includes catalogVersion so a lazily-arriving catalog cascades too,
  // not just an explicit language switch.
  //
  // Cost is one full re-render per language change or catalog arrival — a rare,
  // deliberate user action, and precisely the work that has to happen for the
  // new language to appear.
  //
  // What this does NOT reach: a component behind React.memo, which bails on
  // shallow-equal props regardless of what its parent does. Those must call
  // useI18nLocale() from i18n-toast to subscribe directly.
  // scripts/check-i18n-subscriptions.mjs fails CI if one forgets.
  const localeTick = `${selectedLanguage}:${catalogVersion}`;
  const cascadingChildren = useMemo(
    () =>
      Children.map(children, (child) =>
        isValidElement(child)
          ? cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              'data-locale-tick': localeTick,
            })
          : child,
      ),
    [children, localeTick],
  );

  // Wake the components the cascade cannot reach (memo'd subscribers). This
  // runs in an EFFECT on purpose: notifying sets state in other components, and
  // doing that during render — where setI18nLocale is deliberately called — is
  // exactly the "cannot update a component while rendering a different
  // component" error. By the time this fires, subscribers re-reading the module
  // locale already see the new value.
  useEffect(() => {
    notifyI18nLocaleChanged();
  }, [localeTick]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {cascadingChildren}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
