/**
 * VTID-05521 — `?tab=voice` (the default tab), the native twin of
 * `src/components/assistant/VoiceSettingsPanel.tsx`: the voice **settings**
 * form, not the live ORB session (requirements R0.3).
 *
 *  - Language: the web's ten options; a change goes through the member's
 *    language (`LanguageProvider.setLanguage`, the web `setSelectedLanguage`),
 *    which writes `stt_language` and clears a `tts_voice` of another language.
 *  - Voice: the web lists the BROWSER's speech-synthesis voices for that
 *    language (cloud voices are deliberately empty since the GCP shutdown).
 *    The app has no browser voice list, so the select shows the web's own
 *    "no voices available" item and hint — the state the web shows on a
 *    browser without voices; "Refresh browser voices" re-reads that (empty)
 *    list, so it changes nothing.
 *  - Speed / pitch / volume: N2 `Slider`s with the web's ranges and steps.
 *  - Preview: with AI-data consent the phrase goes through the gateway's
 *    Polly-first `POST /orb/tts` (same route as real speech) and plays; the
 *    phrase is a catalog entry in the chosen language, never a sentence in
 *    code (CLAUDE.md rules 41-42). Without consent, or for a language the
 *    gateway cannot serve, the web falls back to browser speech, which the
 *    app does not have: a toast says the preview is unavailable.
 */
import { useCallback, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider, Text, notify, useUITheme } from '../../../ports/ui';
import { Label } from '../../../ports/assistant';
import { localeFromLanguage, useI18n } from '../../../i18n/I18nProvider';
import { translate } from '../../../i18n';
import { useLanguage } from '../../../identity/LanguageProvider';
import { baseLang } from '../data/requests';
import { useGatewaySpeech } from '../data/hooks';
import { Between, ButtonGlyph, Field, Hint, PanelCard } from '../components';
import type { PanelProps } from './types';

const LANGUAGES = [
  ['en-US', 'screens.assistant.englishUs'],
  ['de-DE', 'screens.assistant.germanDe'],
  ['sr-RS', 'screens.assistant.serbianRs'],
  ['es-ES', 'screens.assistant.spanishEs'],
  ['ar-XA', 'screens.assistant.arabicXa'],
  ['ru-RU', 'screens.assistant.russianRu'],
  ['zh-CN', 'screens.assistant.chineseCn'],
  ['fr-FR', 'screens.assistant.frenchFr'],
  ['pt-BR', 'screens.assistant.portuguesePt'],
  ['pl-PL', 'screens.assistant.polishPl'],
] as const;

/** The device's speech-synthesis voices. The app has no such list (web `window.speechSynthesis.getVoices()`). */
const deviceVoices = (): Array<{ name: string; lang: string }> => [];

export function VoiceSettingsPanel({ preferences, isUpdating, updatePreferences }: PanelProps): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { setLanguage } = useLanguage();
  const [voices, setVoices] = useState(deviceVoices);
  const [isTesting, setIsTesting] = useState(false);
  const { speak } = useGatewaySpeech(preferences);

  const lang = preferences.stt_language || 'en-US';
  const filteredVoices = voices.filter((v) => baseLang(v.lang) === baseLang(lang) && !v.name.toLowerCase().includes('microsoft'));

  const handleLanguageChange = useCallback((next: string) => void setLanguage(next), [setLanguage]);

  const handlePreviewVoice = async () => {
    setIsTesting(true);
    try {
      const phrase = translate(localeFromLanguage(lang), 'aiAssistantsNative.voice.previewPhrase');
      const played = await speak(phrase);
      if (!played) notify('aiAssistantsNative.voice.previewUnavailable');
    } finally {
      setIsTesting(false);
    }
  };

  const speed = Number(preferences.tts_speed ?? 1);
  const pitch = Number(preferences.tts_pitch ?? 1);
  const volume = Number(preferences.tts_volume ?? 100);

  return (
    <PanelCard title={t('screens.assistant.voiceOutputSettings')} description={t('screens.assistant.configureHowAiSpeaksYou')} gap={24} testID="assistant-panel-voice">
      <Field label={t('screens.assistant.language')}>
        <Select value={lang} onValueChange={handleLanguageChange} disabled={isUpdating}>
          <SelectTrigger testID="assistant-voice-language-trigger" accessibilityLabel={t('screens.assistant.language')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent testID="assistant-voice-language">
            {LANGUAGES.map(([value, key]) => (
              <SelectItem key={value} value={value} testID={`assistant-voice-language-${value}`}>
                {t(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <Between>
          <Label>{t('screens.assistant.voice')}</Label>
          <Button variant="ghost" size="sm" onPress={() => setVoices(deviceVoices())} disabled={isUpdating} testID="assistant-voice-refresh">
            {t('screens.assistant.refreshBrowserVoices')}
          </Button>
        </Between>
        <Select value={preferences.tts_voice ?? undefined} onValueChange={(value) => updatePreferences({ tts_voice: value })} disabled={isUpdating}>
          <SelectTrigger testID="assistant-voice-trigger" accessibilityLabel={t('screens.assistant.voice')}>
            <SelectValue placeholder={t('screens.assistant.selectVoice')} />
          </SelectTrigger>
          <SelectContent testID="assistant-voice-list">
            {filteredVoices.length > 0 ? (
              filteredVoices.map((v) => (
                <SelectItem key={v.name} value={v.name}>
                  {v.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="" disabled testID="assistant-voice-none">
                {t('screens.assistant.noVoicesAvailable')}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Hint testID="assistant-voice-hint">
          {filteredVoices.length === 0
            ? t('screens.assistant.voiceProviderHint_noVoicesAvailable', { lang: baseLang(lang).toUpperCase() })
            : t('screens.assistant.voiceProviderHint_browserVoices')}
        </Hint>
      </Field>

      <Field>
        <Between>
          <Label>{t('screens.assistant.speed')}</Label>
          <Text size="sm" muted>
            {t('aiAssistantsNative.voice.speedValue', { value: speed.toFixed(1) })}
          </Text>
        </Between>
        <Slider testID="assistant-voice-speed" accessibilityLabel={t('screens.assistant.speed')} value={[speed]} onValueChange={([v]) => updatePreferences({ tts_speed: v })} min={0.5} max={2} step={0.1} disabled={isUpdating} />
      </Field>

      <Field>
        <Between>
          <Label>{t('screens.assistant.pitch')}</Label>
          <Text size="sm" muted>
            {pitch.toFixed(1)}
          </Text>
        </Between>
        <Slider testID="assistant-voice-pitch" accessibilityLabel={t('screens.assistant.pitch')} value={[pitch]} onValueChange={([v]) => updatePreferences({ tts_pitch: v })} min={0.5} max={2} step={0.1} disabled={isUpdating} />
      </Field>

      <Field>
        <Between>
          <Label>{t('screens.assistant.volume')}</Label>
          <Text size="sm" muted>
            {t('aiAssistantsNative.voice.volumeValue', { value: volume })}
          </Text>
        </Between>
        <Slider testID="assistant-voice-volume" accessibilityLabel={t('screens.assistant.volume')} value={[volume]} onValueChange={([v]) => updatePreferences({ tts_volume: v })} min={0} max={100} step={5} disabled={isUpdating} />
      </Field>

      <View style={[styles.previewWrap, { borderTopColor: colors.border }]}>
        <Button onPress={() => void handlePreviewVoice()} disabled={isTesting || isUpdating} style={styles.full} testID="assistant-voice-preview">
          <ButtonGlyph name="Volume2" />
          {isTesting ? t('aiAssistantsNative.voice.playing') : t('aiAssistantsNative.voice.preview')}
        </Button>
      </View>
    </PanelCard>
  );
}

const styles = StyleSheet.create({
  previewWrap: { paddingTop: 24, borderTopWidth: StyleSheet.hairlineWidth },
  full: { alignSelf: 'stretch' },
});
