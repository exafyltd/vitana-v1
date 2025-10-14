import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface VoiceSettingsPanelProps {
  preferences: any;
  isUpdating: boolean;
  updatePreferences: (updates: any) => void;
}

export default function VoiceSettingsPanel({ preferences, isUpdating, updatePreferences }: VoiceSettingsPanelProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const baseLang = useCallback((l: string) => (l || '').toLowerCase().replace('_', '-').split('-')[0], []);

  const pickPreferredVoice = useCallback((voices: SpeechSynthesisVoice[]) => {
    if (voices.length === 0) return null;

    const isFemaleVoice = (voice: SpeechSynthesisVoice) => {
      const name = voice.name.toLowerCase();
      return name.includes('female') || name.includes('woman') || name.includes('zira') ||
        name.includes('samantha') || name.includes('victoria') || name.includes('kate') ||
        name.includes('helena') || name.includes('steffi') || name.includes('laura') ||
        name.includes('amelie') || name.includes('anna');
    };

    const femaleVoices = voices.filter(isFemaleVoice);
    if (femaleVoices.length > 0) {
      const googleFemale = femaleVoices.find(v => v.name.toLowerCase().includes('google'));
      if (googleFemale) return googleFemale;
      const microsoftFemale = femaleVoices.find(v => v.name.toLowerCase().includes('microsoft'));
      if (microsoftFemale) return microsoftFemale;
      const appleFemale = femaleVoices.find(v => v.name.toLowerCase().includes('apple'));
      if (appleFemale) return appleFemale;
      return femaleVoices[0];
    }

    const google = voices.find(v => v.name.toLowerCase().includes('google'));
    if (google) return google;
    const microsoft = voices.find(v => v.name.toLowerCase().includes('microsoft'));
    if (microsoft) return microsoft;
    const apple = voices.find(v => v.name.toLowerCase().includes('apple'));
    if (apple) return apple;
    return voices[0];
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
    const currentVoice = availableVoices.find(v => v.name === preferences.tts_voice);
    const currentVoiceLangCode = currentVoice ? baseLang(currentVoice.lang) : undefined;
    const selectedLangCode = baseLang(preferences.stt_language);
    if (!currentVoice || currentVoiceLangCode !== selectedLangCode) {
      const candidates = availableVoices.filter(v => baseLang(v.lang) === selectedLangCode);
      const preferred = pickPreferredVoice(candidates);
      if (preferred && preferred.name !== preferences.tts_voice) {
        updatePreferences({ tts_voice: preferred.name });
      }
    }
  }, [availableVoices, preferences, baseLang, pickPreferredVoice, updatePreferences]);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    if (!preferences) return;
    const newBase = baseLang(newLanguage);
    const candidates = availableVoices.filter(v => baseLang(v.lang) === newBase);
    const preferred = pickPreferredVoice(candidates);
    updatePreferences({
      stt_language: newLanguage,
      tts_voice: preferred?.name || ''
    });
  }, [availableVoices, baseLang, pickPreferredVoice, updatePreferences, preferences]);

  // Vertex AI Gemini 2.5 Pro TTS voices (all 29 available voices)
  const vertexVoices = [
    { name: 'Achernar', label: 'Achernar (Female)' },
    { name: 'Achird', label: 'Achird (Male)' },
    { name: 'Algenib', label: 'Algenib (Male)' },
    { name: 'Algieba', label: 'Algieba (Male)' },
    { name: 'Alnilam', label: 'Alnilam (Male)' },
    { name: 'Aoede', label: 'Aoede (Female, Bright)' },
    { name: 'Autonoe', label: 'Autonoe (Female)' },
    { name: 'Callirrhoe', label: 'Callirrhoe (Female)' },
    { name: 'Charon', label: 'Charon (Male)' },
    { name: 'Despina', label: 'Despina (Female)' },
    { name: 'Enceladus', label: 'Enceladus (Male)' },
    { name: 'Erinome', label: 'Erinome (Female)' },
    { name: 'Fenrir', label: 'Fenrir (Male, Strong)' },
    { name: 'Gacrux', label: 'Gacrux (Female)' },
    { name: 'Iapetus', label: 'Iapetus (Male)' },
    { name: 'Kore', label: 'Kore (Female, Warm)' },
    { name: 'Laomedeia', label: 'Laomedeia (Female)' },
    { name: 'Leda', label: 'Leda (Female)' },
    { name: 'Orus', label: 'Orus (Male)' },
    { name: 'Pulcherrima', label: 'Pulcherrima (Female)' },
    { name: 'Puck', label: 'Puck (Male)' },
    { name: 'Rasalgethi', label: 'Rasalgethi (Male)' },
    { name: 'Sadachbia', label: 'Sadachbia (Male)' },
    { name: 'Sadaltager', label: 'Sadaltager (Male)' },
    { name: 'Schedar', label: 'Schedar (Male)' },
    { name: 'Sulafat', label: 'Sulafat (Female)' },
    { name: 'Umbriel', label: 'Umbriel (Male)' },
    { name: 'Vindemiatrix', label: 'Vindemiatrix (Female)' },
    { name: 'Zephyr', label: 'Zephyr (Female)' },
    { name: 'Zubenelgenubi', label: 'Zubenelgenubi (Male)' },
  ];


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
      'pt-PT': 'Olá, esta é uma prévia das configurações de voz selecionadas.',
      'pl-PL': 'Cześć, to jest podgląd wybranych ustawień głosu.',
    };
    return phrases[language] || phrases['en-US'];
  };

  const handlePreviewVoice = async () => {
    const testPhrase = getTestPhrase(preferences.stt_language || 'en-US');
    const voiceName = preferences.tts_voice || 'Charon';
    setIsTesting(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const body = {
        text: testPhrase,
        voiceId: voiceName,
        languageCode: preferences.stt_language || 'en-US',
        stylePrompt: 'Speak in a friendly and helpful tone.',
      };

      const { data, error } = await supabase.functions.invoke('vertex-tts', { body });
      
      if (error) {
        console.error('Vertex TTS error:', error);
        const { toast } = await import('@/hooks/use-toast');
        toast({
          title: "Voice Preview Failed",
          description: "Could not play voice preview. Please try a different voice.",
          variant: "destructive"
        });
        setIsTesting(false);
        return;
      }
      
      if (!data?.audioContent) {
        throw new Error('No audio content received');
      }
      
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audio.volume = preferences.tts_volume / 100;
      audio.onended = () => setIsTesting(false);
      audio.onerror = () => {
        console.error('Audio playback error');
        setIsTesting(false);
      };
      await audio.play();
    } catch (error) {
      console.error('Preview error:', error);
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Voice Preview Error",
        description: error instanceof Error ? error.message : "Failed to preview voice",
        variant: "destructive"
      });
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Output Settings</CardTitle>
        <CardDescription>Configure how the AI speaks to you</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={preferences.stt_language}
            onValueChange={handleLanguageChange}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en-US">English (US)</SelectItem>
              <SelectItem value="de-DE">German (DE)</SelectItem>
              <SelectItem value="sr-RS">Serbian (RS)</SelectItem>
              <SelectItem value="es-ES">Spanish (ES)</SelectItem>
              <SelectItem value="ar-XA">Arabic (XA)</SelectItem>
              <SelectItem value="ru-RU">Russian (RU)</SelectItem>
              <SelectItem value="zh-CN">Chinese (CN)</SelectItem>
              <SelectItem value="fr-FR">French (FR)</SelectItem>
              <SelectItem value="pt-PT">Portuguese (PT)</SelectItem>
              <SelectItem value="pl-PL">Polish (PL)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Voice</Label>
          <Select
            value={preferences.tts_voice || 'Charon'}
            onValueChange={(value) => updatePreferences({ tts_voice: value })}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Vertex AI Gemini 2.5 Pro TTS
              </div>
              {vertexVoices.map((voice) => (
                <SelectItem key={voice.name} value={voice.name}>
                  {voice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Using Google Gemini 2.5 Pro TTS voices for high-quality speech
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Speed</Label>
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
            <Label>Pitch</Label>
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
            <Label>Volume</Label>
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
