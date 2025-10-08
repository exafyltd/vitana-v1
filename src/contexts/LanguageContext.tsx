import { createContext, useContext, useState, ReactNode } from 'react';

interface LanguageContextType {
  selectedLanguage: string | undefined;
  setSelectedLanguage: (language: string | undefined) => void;
  languageOptions: Array<{ label: string; value: string | undefined }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const languageOptions = [
  { label: "Auto", value: undefined },
  { label: "Serbian (SR)", value: "sr-RS" },
  { label: "German (DE)", value: "de-DE" },
  { label: "English (EN)", value: "en-US" },
  { label: "Arabic (AR)", value: "ar-XA" },
  { label: "Spanish (ES)", value: "es-ES" },
  { label: "Russian (RU)", value: "ru-RU" },
  { label: "Chinese (ZH)", value: "zh-CN" },
];

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined);

  return (
    <LanguageContext.Provider 
      value={{ 
        selectedLanguage, 
        setSelectedLanguage, 
        languageOptions 
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
