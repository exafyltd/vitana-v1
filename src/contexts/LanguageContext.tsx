import { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/context/AuthProvider';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';
import { setI18nLocale } from '@/lib/i18n-toast';
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
  { label: "Portuguese (PT)", value: "pt-PT", status: 'beta' },
  { label: "Russian (RU)", value: "ru-RU", status: 'beta' },
  { label: "Polish (PL)", value: "pl-PL", status: 'beta' },
  // Deferred past 18 Aug. AR needs RTL layout work (RTLProvider is not wired
  // to the selected language); ZH needs a CJK font stack + line-break audit.
  { label: "Arabic (AR)", value: "ar-XA", status: 'draft' },
  { label: "Chinese (ZH)", value: "zh-CN", status: 'draft' },
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

  // Bumped when a lazily-loaded locale catalog (en/ar) finishes loading, to
  // re-render the tree so consumers re-read the now-populated catalog. Only the
  // default (de) is bundled; non-default locales arrive asynchronously.
  const [, setCatalogVersion] = useState(0);
  useEffect(() => {
    const unsubscribe = onCatalogLoaded(() => setCatalogVersion((v) => v + 1));
    return unsubscribe;
  }, []);

  // Keep i18n-toast singleton + <html lang> in sync with React state, and make
  // sure the selected locale's catalog is loaded (no-op for de / draft locales).
  useEffect(() => {
    setI18nLocale(selectedLanguage);
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
    }
  }, [user, hasInitializedFromServer, preferences?.stt_language, selectedLanguage]);

  const setSelectedLanguage = (language: string) => {
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
    
    // Auto-update TTS voice when language changes
    const currentVoice = preferences?.tts_voice;
    const shouldUpdateVoice = !currentVoice || !currentVoice.startsWith(language);
    
    if (shouldUpdateVoice) {
      const defaultVoices: Record<string, string> = {
        'de-DE': 'de-DE-Chirp3-HD-Achernar',
        'en-US': 'en-US-Chirp3-HD-Leda',
        'sr-RS': 'sr-RS-Standard-B',
        'ar-XA': 'ar-XA-Chirp3-HD-Aoede',
        'es-ES': 'es-ES-Chirp3-HD-Gacrux',
        'ru-RU': 'ru-RU-Chirp3-HD-Kore',
        'zh-CN': 'cmn-CN-Chirp3-HD-Leda',
        'fr-FR': 'fr-FR-Chirp3-HD-Pulcherrima',
        'pt-PT': 'pt-PT-Chirp3-HD-Zephyr',
        'pl-PL': 'pl-PL-Chirp3-HD-Despina',
      };
      
      const newVoice = defaultVoices[language] || `${language}-Standard-A`;
      console.log('[LANG] Auto-updating TTS voice:', currentVoice, '->', newVoice);
      
      updatePreferences({ 
        stt_language: language,
        tts_voice: newVoice
      });
    } else {
      console.log('[LANG] Keeping existing voice:', currentVoice);
      updatePreferences({ stt_language: language });
    }
  };

  return (
    <LanguageContext.Provider 
      value={{ 
        selectedLanguage, 
        setSelectedLanguage, 
        languageOptions,
        isLoading,
      }}
    >
      {children}
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
