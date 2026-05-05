import { useLanguage } from '@/contexts/LanguageContext';
import { catalogs } from '@/i18n';

// Use a flexible record type to handle different translation structures
type TranslationObject = Record<string, any>;

const translations: Record<string, TranslationObject> = catalogs;

// Track missing keys in development to catch untranslated strings
const missingKeys = new Set<string>();

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
        // DEV: Log missing key for debugging (only once per key)
        if (import.meta.env.DEV && !missingKeys.has(key)) {
          missingKeys.add(key);
          console.warn(`[i18n] Missing key: "${key}" in ${selectedLanguage}`);
        }
        // Return visual indicator in dev, fallback in production
        if (import.meta.env.DEV && !fallback) {
          return `[[missing:${key}]]`;
        }
        return fallback || key;
      }
    }
    
    return typeof result === 'string' ? result : fallback || key;
  };

  // Helper to get all missing keys (useful for debugging)
  const getMissingKeys = () => Array.from(missingKeys);
  
  return {
    t,              // Direct object access: t.sidebar.home
    translate,      // Dot notation: translate('sidebar.home')
    language: selectedLanguage,
    isGerman: selectedLanguage === 'de-DE',
    getMissingKeys, // Debug helper
  };
}
