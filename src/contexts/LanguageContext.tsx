import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/context/AuthProvider';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';

interface LanguageContextType {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  languageOptions: Array<{ label: string; value: string }>;
  isLoading: boolean;
  lastLanguageChangeAt: number;
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
  
  // RULE 1: Immediate local state for instant UI effect
  // Initialize from localStorage (persisted) or default to German
  const [selectedLanguage, setLocalLanguage] = useState<string>(getInitialLanguage);
  const [lastLanguageChangeAt, setLastLanguageChangeAt] = useState<number>(0);
  
  // Track if we've already synced from server to avoid overriding local changes
  const [hasInitializedFromServer, setHasInitializedFromServer] = useState(false);

  // Sync from server preferences ONLY on initial load
  // After that, local changes take priority (they get saved to server anyway)
  useEffect(() => {
    if (!hasInitializedFromServer && preferences?.stt_language) {
      const localStored = getLocalStorageItem('global', 'language', LANGUAGE_STORAGE_KEY);
      
      if (localStored && localStored !== preferences.stt_language) {
        console.log('[LANG] Local override:', localStored, '(server had:', preferences.stt_language, ')');
        setLocalLanguage(localStored);
        updatePreferences({ stt_language: localStored });
      } else {
        console.log('[LANG] Initial sync from server:', preferences.stt_language);
        setLocalLanguage(preferences.stt_language);
      }
      
      setHasInitializedFromServer(true);
    }
  }, [preferences?.stt_language, hasInitializedFromServer]);

  // Keep runtime language in sync when preferences are changed outside LanguageContext
  useEffect(() => {
    if (!user) return; // No server prefs for unauthenticated users
    if (!hasInitializedFromServer || !preferences?.stt_language) return;
    if (Date.now() - lastLanguageChangeAt < 2000) return; // Don't revert recent local changes

    if (preferences.stt_language !== selectedLanguage) {
      console.log('[LANG] Syncing runtime language from preferences:', preferences.stt_language);
      setLocalLanguage(preferences.stt_language);
      setLocalStorageItem('global', 'language', LANGUAGE_STORAGE_KEY, preferences.stt_language);
    }
  }, [user, hasInitializedFromServer, preferences?.stt_language, selectedLanguage, lastLanguageChangeAt]);

  const setSelectedLanguage = (language: string) => {
    // RULE 2: Validate against allowed set
    if (!ALLOWED_LANGUAGES.includes(language)) {
      console.error('[LANG] Invalid language:', language, '- fallback to de-DE');
      language = "de-DE";
    }
    
    console.log('[LANG] Rule-based change:', language, new Date().toISOString());
    
    // RULE 3: Immediate UI update (no waiting)
    setLocalLanguage(language);
    setLastLanguageChangeAt(Date.now());
    
    // RULE 3.5: Persist to localStorage immediately (works before auth)
    setLocalStorageItem('global', 'language', LANGUAGE_STORAGE_KEY, language);
    
    // RULE 4: Only sync to server if authenticated
    if (!user) {
      console.log('[LANG] User not authenticated, skipping server sync');
      return;
    }
    
    // RULE 5: Auto-update TTS voice when language changes
    const currentVoice = preferences?.tts_voice;
    const shouldUpdateVoice = !currentVoice || !currentVoice.startsWith(language);
    
    if (shouldUpdateVoice) {
      // Default Chirp 3 HD voices for each language
      const defaultVoices: Record<string, string> = {
        'de-DE': 'de-DE-Chirp3-HD-Achernar',  // German first
        'en-US': 'en-US-Chirp3-HD-Leda',
        'sr-RS': 'sr-RS-Standard-B',  // Serbian uses Google Speech
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
      
      // Update both STT language and TTS voice
      updatePreferences({ 
        stt_language: language,
        tts_voice: newVoice
      });
    } else {
      console.log('[LANG] Keeping existing voice:', currentVoice);
      // Only update STT language
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
        lastLanguageChangeAt
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
