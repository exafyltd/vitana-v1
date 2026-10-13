/**
 * VTID-05186 (N3, plan change 12) — the member's language, as
 * LanguageContext.tsx:250-311 does it:
 *   - local first (AsyncStorage `vitana.lang`), then, when signed in,
 *     `user_preferences.stt_language`; when the stored `tts_voice` does not
 *     start with the new language, `tts_voice: null` in the SAME update;
 *   - initial value: `user_preferences.stt_language`, else the stored value,
 *     else the device locale, else `de`;
 *   - only `status: 'ga'` options are offered (all 11 today).
 * Direction: `rtl` flips the shell root's `direction` at once (no remount);
 * `I18nManager.forceRTL` is applied for the next cold start (system UI).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { I18nManager } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isRtlLanguage, languageOptions } from '../ports/core';
import { I18nProvider, languageFromLocale } from '../i18n/I18nProvider';
import { localeFromDevice } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { getSupabase } from '../auth/client';
import { deviceStorage, STORAGE_KEYS } from './device-storage';

export const GA_LANGUAGES = languageOptions.filter((o) => o.status === 'ga');
const ALLOWED = new Set(languageOptions.map((o) => o.value));
const isAllowed = (v: unknown): v is string => typeof v === 'string' && ALLOWED.has(v);

type Prefs = { stt_language: string | null; tts_voice: string | null } | null;

type LanguageValue = {
  language: string;
  rtl: boolean;
  options: typeof GA_LANGUAGES;
  setLanguage: (language: string) => Promise<void>;
};

const LanguageContext = createContext<LanguageValue | null>(null);

/** The user_preferences update for a language change (LanguageContext.tsx:303-311). */
export function languageUpdate(language: string, currentVoice: string | null | undefined): { stt_language: string; tts_voice?: null } {
  const matches = !!currentVoice && currentVoice.startsWith(language);
  return currentVoice && !matches ? { stt_language: language, tts_voice: null } : { stt_language: language };
}

export function LanguageProvider({ children, initialLanguage }: { children: ReactNode; initialLanguage?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [language, setLang] = useState<string>(() => (isAllowed(initialLanguage) ? initialLanguage : languageFromLocale(localeFromDevice())));
  const chosen = useRef(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve(deviceStorage.getItem(STORAGE_KEYS.language)).then((v) => {
      if (active && !chosen.current && isAllowed(v)) setLang(v);
    });
    return () => {
      active = false;
    };
  }, []);

  const prefs = useQuery({
    queryKey: ['user_preferences', user?.id ?? null],
    queryFn: async (): Promise<Prefs> => {
      const { data, error } = await getSupabase().from('user_preferences').select('stt_language, tts_voice').eq('user_id', user?.id).maybeSingle();
      if (error) throw error;
      return (data as Prefs) ?? null;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const server = prefs.data?.stt_language;
    if (!chosen.current && isAllowed(server)) {
      setLang(server);
      void deviceStorage.setItem(STORAGE_KEYS.language, server);
    }
  }, [prefs.data?.stt_language]);

  const setLanguage = useCallback(
    async (requested: string) => {
      const next = isAllowed(requested) ? requested : 'de-DE';
      chosen.current = true;
      setLang(next);
      await deviceStorage.setItem(STORAGE_KEYS.language, next);
      if (!user?.id) return;
      const { error } = await getSupabase().from('user_preferences').update(languageUpdate(next, prefs.data?.tts_voice)).eq('user_id', user.id);
      if (!error) void queryClient.invalidateQueries({ queryKey: ['user_preferences'] });
    },
    [user?.id, prefs.data?.tts_voice, queryClient],
  );

  const rtl = isRtlLanguage(language);
  useEffect(() => {
    if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
  }, [rtl]);

  const value = useMemo(() => ({ language, rtl, options: GA_LANGUAGES, setLanguage }), [language, rtl, setLanguage]);
  return (
    <LanguageContext.Provider value={value}>
      <I18nProvider language={language}>{children}</I18nProvider>
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
