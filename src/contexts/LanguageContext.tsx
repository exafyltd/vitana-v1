import { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/context/AuthProvider';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';
import { setI18nLocale } from '@/lib/i18n-toast';

interface LanguageContextType {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  languageOptions: Array<{ label: string; value: string }>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const languageOptions = [
  { label: "German (DE)", value: "de-DE" },  // German first - primary language
  { label: "English (EN)", value: "en-US" },
  { label: "Serbian (SR)", value: "sr-RS" },
  { label: "Arabic (AR)", value: "ar-XA" },
  { label: "Spanish (ES)", value: "es-ES" },
  { label: "Russian (RU)", value: "ru-RU" },
  { label: "Chinese (ZH)", value: "zh-CN" },
  { label: "French (FR)", value: "fr-FR" },
  { label: "Portuguese (PT)", value: "pt-PT" },
  { label: "Polish (PL)", value: "pl-PL" },
];

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
    return initial;
  });

  // Keep i18n-toast singleton in sync with React state.
  useEffect(() => {
    setI18nLocale(selectedLanguage);
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
