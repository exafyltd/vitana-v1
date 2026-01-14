import { useLanguage } from '@/contexts/LanguageContext';
import en from '@/i18n/en.json';
import de from '@/i18n/de.json';

// Use a flexible record type to handle different translation structures
type TranslationObject = Record<string, any>;

const translations: Record<string, TranslationObject> = {
  'en-US': en,
  'de-DE': de,
};

export function useTranslation() {
  const { selectedLanguage } = useLanguage();
  
  // Get translation object for current language (fallback to German)
  const t: TranslationObject = translations[selectedLanguage] || translations['de-DE'];
  
  // Helper function for nested keys: translate('sidebar.home')
  const translate = (key: string, fallback?: string): string => {
    const keys = key.split('.');
    let result: any = t;
    
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        return fallback || key;
      }
    }
    
    return typeof result === 'string' ? result : fallback || key;
  };
  
  return {
    t,              // Direct object access: t.sidebar.home
    translate,      // Dot notation: translate('sidebar.home')
    language: selectedLanguage,
    isGerman: selectedLanguage === 'de-DE',
  };
}
