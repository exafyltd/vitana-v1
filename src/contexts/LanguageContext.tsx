import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface LanguageContextType {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  languageOptions: Array<{ label: string; value: string }>;
  isLoading: boolean;
  lastLanguageChangeAt: number;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const languageOptions = [
  { label: "English (EN)", value: "en-US" },
  { label: "Serbian (SR)", value: "sr-RS" },
  { label: "German (DE)", value: "de-DE" },
  { label: "Arabic (AR)", value: "ar-XA" },
  { label: "Spanish (ES)", value: "es-ES" },
  { label: "Russian (RU)", value: "ru-RU" },
  { label: "Chinese (ZH)", value: "zh-CN" },
  { label: "French (FR)", value: "fr-FR" },
  { label: "Portuguese (PT)", value: "pt-PT" },
  { label: "Polish (PL)", value: "pl-PL" },
];

const ALLOWED_LANGUAGES = languageOptions.map(opt => opt.value);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  
  // RULE 1: Immediate local state for instant UI effect
  const [selectedLanguage, setLocalLanguage] = useState<string>(
    preferences?.stt_language || "en-US"
  );
  const [lastLanguageChangeAt, setLastLanguageChangeAt] = useState<number>(0);

  // Sync from server preferences on load/change
  useEffect(() => {
    if (preferences?.stt_language && preferences.stt_language !== selectedLanguage) {
      console.log('[LANG] Syncing from server:', preferences.stt_language);
      setLocalLanguage(preferences.stt_language);
    }
  }, [preferences?.stt_language]);

  const setSelectedLanguage = (language: string) => {
    // RULE 2: Validate against allowed set
    if (!ALLOWED_LANGUAGES.includes(language)) {
      console.error('[LANG] Invalid language:', language, '- fallback to en-US');
      language = "en-US";
    }
    
    console.log('[LANG] Rule-based change:', language, new Date().toISOString());
    
    // RULE 3: Immediate UI update (no waiting)
    setLocalLanguage(language);
    setLastLanguageChangeAt(Date.now());
    
    // Background persistence (non-blocking)
    updatePreferences({ stt_language: language });
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
