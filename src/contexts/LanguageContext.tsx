import { createContext, useContext, ReactNode } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface LanguageContextType {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  languageOptions: Array<{ label: string; value: string }>;
  isLoading: boolean;
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
];

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();

  const selectedLanguage = preferences?.stt_language || "en-US";

  const setSelectedLanguage = (language: string) => {
    console.log('[LANG-TIMING] 2️⃣ Context received:', new Date().toISOString(), language);
    updatePreferences({ stt_language: language });
  };

  return (
    <LanguageContext.Provider 
      value={{ 
        selectedLanguage, 
        setSelectedLanguage, 
        languageOptions,
        isLoading
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
