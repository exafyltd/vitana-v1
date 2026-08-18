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
import { supabase } from '@/integrations/supabase/client';

interface VoiceSettingsPanelProps {
  preferences: any;
  isUpdating: boolean;
  updatePreferences: (updates: any) => void;
}

// VTID-03651: GCP billing was disabled 2026-08-16. This panel used to offer
// 3-4 named Google voices per language (Chirp 3 HD / Standard / Wavenet) and
// preview them via two Supabase edge functions calling Google Cloud APIs
// directly — both now permanently error. The gateway's Polly provider
// (services/gateway/src/services/tts/polly.ts) is ONE voice per language,
// not a multi-voice catalog, so the replacement is a single "cloud voice"
// choice per language rather than a like-for-like swap. `sr` has no Polly
// voice in any engine (documented gap, tracked in CLAUDE.md §2c) — Serbian
// users see only browser voices here, same as any language with none.
const POLLY_CLOUD_VOICE_ID = '__polly__';
const POLLY_SUPPORTED_LANGS = new Set([
  'en-US', 'de-DE', 'es-ES', 'ar-XA', 'ru-RU', 'zh-CN', 'fr-FR', 'pt-BR', 'pl-PL',
]);

const GATEWAY_URL = (
  import.meta.env.VITE_GATEWAY_BASE ||
  (import.meta.env.VITE_GATEWAY_URL || '').replace(/\/api\/v1\/?$/, '') ||
  ''
).replace(/\/+$/, '');

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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
    const isCloudVoice = currentVoice === POLLY_CLOUD_VOICE_ID;

    // Don't auto-switch if user has selected the cloud (Polly) voice
    if (isCloudVoice) return;
    
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

  const filteredVoices = availableVoices.filter(voice => {
    const langCode = baseLang(preferences.stt_language);
    const voiceLang = baseLang(voice.lang);
    return voiceLang === langCode;
  });

  const hasPollyVoice = POLLY_SUPPORTED_LANGS.has(preferences.stt_language);

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
    const isCloudVoice = voiceName === POLLY_CLOUD_VOICE_ID;
    setIsTesting(true);

    try {
      if (isCloudVoice) {
        if (!GATEWAY_URL) throw new Error('Gateway not configured');
        const resp = await fetch(`${GATEWAY_URL}/api/v1/orb/tts`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({
            text: testPhrase,
            lang: baseLang(preferences.stt_language || 'en-US'),
          }),
        });
        const data = await resp.json().catch(() => null);
        if (!resp.ok || !data?.ok || !data?.audio_b64) {
          throw new Error(data?.error || `gateway TTS failed (${resp.status})`);
        }
        const audio = new Audio(`data:${data.mime || 'audio/mp3'};base64,${data.audio_b64}`);
        audio.volume = preferences.tts_volume / 100;
        audio.onended = () => setIsTesting(false);
        audio.onerror = () => setIsTesting(false);
        await audio.play();
      } else {
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
              {hasPollyVoice && (
                <SelectItem value={POLLY_CLOUD_VOICE_ID}>
                  {t('screens.assistant.voiceProviderLabel_polly')}
                </SelectItem>
              )}
              {filteredVoices.filter(v => !v.name.toLowerCase().includes('microsoft')).length > 0 && (
                <>
                  {hasPollyVoice && (
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
               !hasPollyVoice && (
                <SelectItem value="" disabled>
                  {t('screens.assistant.noVoicesAvailable')}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {preferences.tts_voice === POLLY_CLOUD_VOICE_ID
              ? t('screens.assistant.voiceProviderHint_polly')
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
