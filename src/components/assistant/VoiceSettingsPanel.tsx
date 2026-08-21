import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from '@/lib/i18n-toast';
// BOOTSTRAP-FRONTEND-TTS-POLLY: preview goes through the gateway's Polly-first
// route, same path the real `speak()` uses, so a preview cannot claim a voice
// the user will not actually hear.
import { synthesizeViaGateway } from '@/lib/gateway-tts';

interface VoiceSettingsPanelProps {
  preferences: any;
  isUpdating: boolean;
  updatePreferences: (updates: any) => void;
}

export default function VoiceSettingsPanel({ preferences, isUpdating, updatePreferences }: VoiceSettingsPanelProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { setSelectedLanguage } = useLanguage();

  const baseLang = useCallback((l: string) => (l || '').toLowerCase().replace('_', '-').split('-')[0], []);

  const pickPreferredVoice = useCallback((voices: SpeechSynthesisVoice[]) => {
    if (voices.length === 0) return null;

    // Filter out Microsoft voices immediately
    const nonMicrosoftVoices = voices.filter(v => !v.name.toLowerCase().includes('microsoft'));
    if (nonMicrosoftVoices.length === 0) return voices[0]; // Fallback if only Microsoft exists

    const isFemaleVoice = (voice: SpeechSynthesisVoice) => {
      const name = voice.name.toLowerCase();
      return name.includes('female') || name.includes('woman') || name.includes('zira') ||
        name.includes('samantha') || name.includes('victoria') || name.includes('kate') ||
        name.includes('helena') || name.includes('steffi') || name.includes('laura') ||
        name.includes('amelie') || name.includes('anna');
    };

    const femaleVoices = nonMicrosoftVoices.filter(isFemaleVoice);
    if (femaleVoices.length > 0) {
      const googleFemale = femaleVoices.find(v => v.name.toLowerCase().includes('google'));
      if (googleFemale) return googleFemale;
      const appleFemale = femaleVoices.find(v => v.name.toLowerCase().includes('apple'));
      if (appleFemale) return appleFemale;
      return femaleVoices[0];
    }

    const google = nonMicrosoftVoices.find(v => v.name.toLowerCase().includes('google'));
    if (google) return google;
    const apple = nonMicrosoftVoices.find(v => v.name.toLowerCase().includes('apple'));
    if (apple) return apple;
    return nonMicrosoftVoices[0];
  }, []);

  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setAvailableVoices(voices);
    }
  }, []);

  useEffect(() => {
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    let pollCount = 0;
    const pollInterval = setInterval(() => {
      loadVoices();
      pollCount++;
      if (pollCount > 20 || window.speechSynthesis.getVoices().length > 0) {
        clearInterval(pollInterval);
      }
    }, 100);
    return () => clearInterval(pollInterval);
  }, [loadVoices]);

  useEffect(() => {
    if (!preferences || availableVoices.length === 0) return;
    
    const currentVoice = preferences.tts_voice;

    // BOOTSTRAP-FRONTEND-TTS-POLLY — the "don't auto-switch away from a cloud
    // voice" guard that used to sit here is gone, and removing it is a fix
    // rather than a simplification.
    //
    // It protected a selection that no longer exists: cloud voices are not
    // selectable any more (see `cloudVoices` below), and any Chirp3-HD /
    // -Standard- / -Wavenet- id still on a profile names a Google voice
    // nothing can play. Keeping the guard meant such an id would block
    // assignment of a real browser voice FOREVER — which matters precisely
    // where it hurts most, because the browser is the only remaining path for
    // Serbian, and it would have been left with no voice selected.
    //
    // A stale id now simply fails the `find` below and gets replaced.
    const currentBrowserVoice = availableVoices.find(v => v.name === currentVoice);
    const currentVoiceLangCode = currentBrowserVoice ? baseLang(currentBrowserVoice.lang) : undefined;
    const selectedLangCode = baseLang(preferences.stt_language);
    
    if (!currentBrowserVoice || currentVoiceLangCode !== selectedLangCode) {
      const candidates = availableVoices.filter(v => baseLang(v.lang) === selectedLangCode);
      const preferred = pickPreferredVoice(candidates);
      if (preferred && preferred.name !== currentVoice) {
        updatePreferences({ tts_voice: preferred.name });
      }
    }
  }, [availableVoices, preferences, baseLang, pickPreferredVoice, updatePreferences]);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    if (!preferences) return;
    const newBase = baseLang(newLanguage);
    const candidates = availableVoices.filter(v => baseLang(v.lang) === newBase);
    const preferred = pickPreferredVoice(candidates);
    // Keep LanguageContext + localStorage in sync with settings change
    setSelectedLanguage(newLanguage);

    // Preserve best matching voice for this language
    if (preferred?.name) {
      updatePreferences({ tts_voice: preferred.name });
    }
  }, [availableVoices, baseLang, pickPreferredVoice, updatePreferences, preferences, setSelectedLanguage]);

  // BOOTSTRAP-FRONTEND-TTS-POLLY — deliberately EMPTY, not deleted.
  //
  // This used to list ~30 selectable Google voices: Gemini Chirp 3 HD per
  // language, plus 'sr-RS-Standard-B' for Serbian. Every one of them named a
  // Google Cloud voice, and GCP was decommissioned 2026-08-16 — so the picker
  // was offering the user choices that could not produce a single second of
  // audio, and selecting one persisted a dead id onto their profile.
  //
  // Cloud speech is now the gateway's Polly-first route, which resolves the
  // voice from the LANGUAGE and exposes no voice parameter (CLAUDE.md §2c pins
  // one voice per language on purpose). So there is no per-voice choice to
  // offer: the picker lists browser voices, and "no browser voice selected"
  // means the user gets Polly.
  //
  // Kept as an empty map rather than ripped out because the render below
  // already handles length===0 correctly, and because this is the seam where
  // selectable cloud voices would return if the gateway ever exposes them.
  // Populating it again requires the route to accept a voice id first.
  const cloudVoices: Record<string, Array<{ name: string; label: string }>> = {};

  const filteredVoices = availableVoices.filter(voice => {
    const langCode = baseLang(preferences.stt_language);
    const voiceLang = baseLang(voice.lang);
    return voiceLang === langCode;
  });

  const currentCloudVoices = cloudVoices[preferences.stt_language] || [];

  const getTestPhrase = (language: string): string => {
    const phrases: Record<string, string> = {
      'en-US': 'Hello, this is a preview of your selected voice settings.',
      'de-DE': 'Hallo, dies ist eine Vorschau Ihrer ausgewählten Spracheinstellungen.',
      'sr-RS': 'Zdravo, ovo je pregled izabranih postavki glasa.',
      'es-ES': 'Hola, esta es una vista previa de la configuración de voz seleccionada.',
      'ar-XA': 'مرحبا، هذه معاينة لإعدادات الصوت المحددة.',
      'ru-RU': 'Привет, это предварительный просмотр выбранных настроек голоса.',
      'zh-CN': '您好，这是您所选语音设置的预览。',
      'fr-FR': 'Bonjour, ceci est un aperçu de vos paramètres vocaux sélectionnés.',
      'pt-BR': 'Olá, esta é uma prévia das configurações de voz selecionadas.',
      'pl-PL': 'Cześć, to jest podgląd wybranych ustawień głosu.',
    };
    return phrases[language] || phrases['en-US'];
  };

  const handlePreviewVoice = async () => {
    const testPhrase = getTestPhrase(preferences.stt_language || 'en-US');
    const voiceName = preferences.tts_voice;
    setIsTesting(true);

    // BOOTSTRAP-FRONTEND-TTS-POLLY — the branch condition changed meaning.
    //
    // It used to ask "does the stored voice id LOOK like a Google voice?"
    // (Chirp3-HD / -Standard- / -Wavenet-) and, if so, call one of two Google
    // edge functions. Those reach GCP, decommissioned 2026-08-16, so that
    // branch has produced nothing but errors since — and VTID-03671 stopped
    // writing Google ids anyway, so it is increasingly never taken either.
    //
    // A PREVIEW MUST MATCH REALITY, so this follows the hook's rule exactly:
    // try the gateway first, always, and fall back to browser speech only when
    // it cannot serve the language.
    //
    // Gating this on "did the user pick a browser voice?" was tempting and
    // wrong. The effect above AUTO-ASSIGNS a browser voice name to `tts_voice`
    // whenever it does not match the chosen language, so most profiles carry
    // one — and `useTextToSpeech` ignores `tts_voice` entirely and plays Polly.
    // Previewing the browser voice would therefore have demonstrated a voice
    // the user never actually hears.
    //
    // `tts_voice` still matters: it selects WHICH browser voice the fallback
    // uses, in both this preview and the hook.
    try {
      {
        const cloud = await synthesizeViaGateway(
          testPhrase,
          preferences.stt_language || 'en-US',
        );
        if (cloud) {
          // MIME from the response, not hardcoded — same reasoning as the hook.
          const audio = new Audio(`data:${cloud.mime};base64,${cloud.audioB64}`);
          audio.volume = preferences.tts_volume / 100;
          audio.onended = () => setIsTesting(false);
          audio.onerror = () => setIsTesting(false);
          await audio.play();
          return;
        }
        // Fell through: the gateway cannot serve this language (Serbian has no
        // Polly voice in any engine). Preview the browser voice instead, which
        // is exactly what the user will get in real use.
        console.log(
          `[VOICE-PREVIEW] gateway cannot serve ${preferences.stt_language} — previewing browser speech`,
        );
      }

      {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(testPhrase);
        utterance.rate = preferences.tts_speed;
        utterance.pitch = preferences.tts_pitch;
        utterance.volume = preferences.tts_volume / 100;
        let selectedVoice = filteredVoices.find(v => v.name === voiceName);
        if (!selectedVoice && filteredVoices.length > 0) {
          selectedVoice = pickPreferredVoice(filteredVoices);
        }
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        } else {
          utterance.lang = preferences.stt_language || 'en-US';
        }
        utterance.onstart = () => setIsTesting(true);
        utterance.onend = () => setIsTesting(false);
        utterance.onerror = () => setIsTesting(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Preview error:', error);
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('screens.assistant.voiceOutputSettings')}</CardTitle>
        <CardDescription>{t('screens.assistant.configureHowAiSpeaksYou')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t('screens.assistant.language')}</Label>
          <Select
            value={preferences.stt_language}
            onValueChange={handleLanguageChange}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-US">{t('screens.assistant.englishUs')}</SelectItem>
              <SelectItem value="de-DE">{t('screens.assistant.germanDe')}</SelectItem>
              <SelectItem value="sr-RS">{t('screens.assistant.serbianRs')}</SelectItem>
              <SelectItem value="es-ES">{t('screens.assistant.spanishEs')}</SelectItem>
              <SelectItem value="ar-XA">{t('screens.assistant.arabicXa')}</SelectItem>
              <SelectItem value="ru-RU">{t('screens.assistant.russianRu')}</SelectItem>
              <SelectItem value="zh-CN">{t('screens.assistant.chineseCn')}</SelectItem>
              <SelectItem value="fr-FR">{t('screens.assistant.frenchFr')}</SelectItem>
              <SelectItem value="pt-BR">{t('screens.assistant.portuguesePt')}</SelectItem>
              <SelectItem value="pl-PL">{t('screens.assistant.polishPl')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('screens.assistant.voice')}</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadVoices}
              disabled={isUpdating}
              className="h-7 text-xs"
            >
              {t('screens.assistant.refreshBrowserVoices')}
            </Button>
          </div>
          {/* `?? undefined` (VTID-03671): tts_voice is nullable — null means "no
              override, derive from the language". Radix treats null as a
              controlled empty value and would pin the trigger blank; undefined
              leaves it uncontrolled so the placeholder renders instead. */}
          <Select
            value={preferences.tts_voice ?? undefined}
            onValueChange={(value) => updatePreferences({ tts_voice: value })}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('screens.assistant.selectVoice')} />
            </SelectTrigger>
            <SelectContent>
              {currentCloudVoices.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {preferences.stt_language === 'sr-RS' 
                      ? 'Google Speech API (High Quality)' 
                      : 'Google Gemini Chirp 3 HD (Premium)'}
                  </div>
                  {currentCloudVoices.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </>
              )}
              {filteredVoices.filter(v => !v.name.toLowerCase().includes('microsoft')).length > 0 && (
                <>
                  {currentCloudVoices.length > 0 && (
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2 pt-2">
                      {t('screens.assistant.browserVoices')}
                    </div>
                  )}
                  {filteredVoices
                    .filter(voice => !voice.name.toLowerCase().includes('microsoft'))
                    .map((voice) => (
                      <SelectItem key={voice.name} value={voice.name}>
                        {voice.name}
                      </SelectItem>
                    ))}
                </>
              )}
              {filteredVoices.filter(v => !v.name.toLowerCase().includes('microsoft')).length === 0 && 
               currentCloudVoices.length === 0 && (
                <SelectItem value="" disabled>
                  {t('screens.assistant.noVoicesAvailable')}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {currentCloudVoices.length > 0
              ? preferences.stt_language === 'sr-RS'
                ? t('screens.assistant.voiceProviderHint_googleSpeech')
                : t('screens.assistant.voiceProviderHint_geminiChirp')
              : filteredVoices.length === 0
              ? t('screens.assistant.voiceProviderHint_noVoicesAvailable', { lang: baseLang(preferences.stt_language).toUpperCase() })
              : t('screens.assistant.voiceProviderHint_browserVoices')
            }
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>{t('screens.assistant.speed')}</Label>
            <span className="text-sm text-muted-foreground">{preferences.tts_speed.toFixed(1)}x</span>
          </div>
          <Slider
            value={[preferences.tts_speed]}
            onValueChange={([value]) => updatePreferences({ tts_speed: value })}
            min={0.5}
            max={2.0}
            step={0.1}
            disabled={isUpdating}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>{t('screens.assistant.pitch')}</Label>
            <span className="text-sm text-muted-foreground">{preferences.tts_pitch.toFixed(1)}</span>
          </div>
          <Slider
            value={[preferences.tts_pitch]}
            onValueChange={([value]) => updatePreferences({ tts_pitch: value })}
            min={0.5}
            max={2.0}
            step={0.1}
            disabled={isUpdating}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>{t('screens.assistant.volume')}</Label>
            <span className="text-sm text-muted-foreground">{preferences.tts_volume}%</span>
          </div>
          <Slider
            value={[preferences.tts_volume]}
            onValueChange={([value]) => updatePreferences({ tts_volume: value })}
            min={0}
            max={100}
            step={5}
            disabled={isUpdating}
          />
        </div>

        <div className="pt-6 border-t">
          <Button
            onClick={handlePreviewVoice}
            disabled={isTesting || isUpdating}
            className="w-full"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            {isTesting ? "Playing..." : "Preview Voice"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
