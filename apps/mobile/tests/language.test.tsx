/** VTID-05186 (N3, plan change 12) — the language row's writes (LanguageContext.tsx:250-311). */
import './helpers/no-network';
import './helpers/mocks';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { createSupabaseDouble, fakeSession } from './helpers/supabase-double';
import { makeWrapper } from './helpers/providers';
import { useLanguage, languageUpdate, GA_LANGUAGES } from '../src/identity/LanguageProvider';
import { useI18n } from '../src/i18n/I18nProvider';
import { __setSupabaseForTests } from '../src/auth/client';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn() }, usePathname: () => '/home' }));

const useBoth = () => ({ lang: useLanguage(), i18n: useI18n() });

afterAll(() => __setSupabaseForTests(null));
beforeEach(async () => {
  await AsyncStorage.clear();
});

function signedIn(ttsVoice: string | null, stt = 'de-DE') {
  return createSupabaseDouble({
    session: fakeSession('u-1'),
    tables: { user_preferences: [{ user_id: 'u-1', stt_language: stt, tts_voice: ttsVoice }] },
  });
}

describe('language writes', () => {
  it('a change with a matching tts_voice writes only stt_language', async () => {
    const d = signedIn('en-US-Standard', 'de-DE');
    const { result } = renderHook(useBoth, { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(result.current.lang.language).toBe('de-DE'));
    await act(async () => {
      await result.current.lang.setLanguage('en-US');
    });
    expect(d.writes).toEqual([{ table: 'user_preferences', values: { stt_language: 'en-US' }, filters: [['user_id', 'u-1']] }]);
    expect(await AsyncStorage.getItem('vitana.lang')).toBe('en-US');
    expect(result.current.i18n.locale).toBe('en');
  });

  it('a non-matching tts_voice is cleared in the same update', async () => {
    const d = signedIn('de-DE-Chirp3-HD-Achernar');
    const { result } = renderHook(useBoth, { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(d.calls.some((c) => c.fn === 'from.user_preferences.select')).toBe(true));
    await act(async () => {
      await result.current.lang.setLanguage('fr-FR');
    });
    expect(d.writes).toHaveLength(1);
    expect(d.writes[0].values).toEqual({ stt_language: 'fr-FR', tts_voice: null });
    expect(languageUpdate('fr-FR', null)).toEqual({ stt_language: 'fr-FR' });
  });

  it('signed out writes nothing remote, only the device value', async () => {
    const d = createSupabaseDouble();
    const { result } = renderHook(useBoth, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    await act(async () => {
      await result.current.lang.setLanguage('ar-XA');
    });
    expect(d.writes).toEqual([]);
    expect(await AsyncStorage.getItem('vitana.lang')).toBe('ar-XA');
    expect(result.current.i18n.rtl).toBe(true);
    expect(I18nManager.forceRTL).toBeDefined();
  });

  it('the initial value comes from user_preferences.stt_language', async () => {
    const d = signedIn(null, 'sr-RS');
    const { result } = renderHook(useBoth, { wrapper: makeWrapper({ client: d.client, language: 'de-DE' }) });
    await waitFor(() => expect(result.current.lang.language).toBe('sr-RS'));
    expect(result.current.i18n.locale).toBe('sr');
    expect(d.writes).toEqual([]);
  });

  it('offers exactly the 11 GA languages', () => {
    expect(GA_LANGUAGES.map((o) => o.value)).toEqual(['de-DE', 'en-US', 'es-ES', 'sr-RS', 'fr-FR', 'pt-BR', 'ru-RU', 'pl-PL', 'ar-XA', 'zh-CN', 'tr-TR']);
  });
});
