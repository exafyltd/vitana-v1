import { toast as rawToast } from "@/hooks/use-toast";

type TranslateFn = (key: string, fallback?: string) => string;

/**
 * Creates type-safe i18n toast helpers that use translation keys instead of raw strings.
 * All toast calls should use these helpers to ensure full internationalization.
 */
export function createI18nToast(translate: TranslateFn) {
  return {
    success: (titleKey: string, descKey?: string, replacements?: Record<string, string>) => {
      let title = translate(titleKey, titleKey);
      let description = descKey ? translate(descKey, descKey) : undefined;
      
      // Apply dynamic replacements like {name}, {count}
      if (replacements) {
        Object.entries(replacements).forEach(([key, value]) => {
          title = title.replace(`{${key}}`, value);
          if (description) description = description.replace(`{${key}}`, value);
        });
      }
      
      rawToast({ title, description });
    },
    
    error: (titleKey: string, descKey?: string, replacements?: Record<string, string>) => {
      let title = translate(titleKey, titleKey);
      let description = descKey ? translate(descKey, descKey) : undefined;
      
      if (replacements) {
        Object.entries(replacements).forEach(([key, value]) => {
          title = title.replace(`{${key}}`, value);
          if (description) description = description.replace(`{${key}}`, value);
        });
      }
      
      rawToast({ title, description, variant: "destructive" });
    },
    
    info: (titleKey: string, descKey?: string, replacements?: Record<string, string>) => {
      let title = translate(titleKey, titleKey);
      let description = descKey ? translate(descKey, descKey) : undefined;
      
      if (replacements) {
        Object.entries(replacements).forEach(([key, value]) => {
          title = title.replace(`{${key}}`, value);
          if (description) description = description.replace(`{${key}}`, value);
        });
      }
      
      rawToast({ title, description });
    },

    warning: (titleKey: string, descKey?: string, replacements?: Record<string, string>) => {
      let title = translate(titleKey, titleKey);
      let description = descKey ? translate(descKey, descKey) : undefined;
      
      if (replacements) {
        Object.entries(replacements).forEach(([key, value]) => {
          title = title.replace(`{${key}}`, value);
          if (description) description = description.replace(`{${key}}`, value);
        });
      }
      
      rawToast({ title, description });
    }
  };
}

/**
 * Creates a translated window.confirm wrapper.
 * Use this instead of raw window.confirm() for full i18n support.
 */
export function createI18nConfirm(translate: TranslateFn) {
  return (messageKey: string, fallback?: string): boolean => {
    return window.confirm(translate(messageKey, fallback));
  };
}

/**
 * Apply replacements to a translated string.
 * Example: applyReplacements("Hello {name}", { name: "World" }) => "Hello World"
 */
export function applyReplacements(text: string, replacements?: Record<string, string | number>): string {
  if (!replacements) return text;
  
  let result = text;
  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  });
  return result;
}
