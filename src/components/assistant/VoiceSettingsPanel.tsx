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

  // ElevenLabs voices mapped by language (curated sets per language)
  const languageVoiceMap: Record<string, Array<{ name: string; label: string; gender: 'male' | 'female' }>> = {
    'en-US': [
      { name: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (Female)', gender: 'female' },
      { name: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte (Female)', gender: 'female' },
      { name: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice (Female)', gender: 'female' },
      { name: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam (Male)', gender: 'male' },
      { name: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Male)', gender: 'male' },
      { name: 'nPczCjzI2devNBz1zQrb', label: 'Brian (Male)', gender: 'male' },
    ],
    'de-DE': [
      { name: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura (Female)', gender: 'female' },
      { name: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica (Female)', gender: 'female' },
      { name: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda (Female)', gender: 'female' },
      { name: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger (Male)', gender: 'male' },
      { name: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (Male)', gender: 'male' },
      { name: 'bIHbv24MWmeRgasZH58o', label: 'Will (Male)', gender: 'male' },
    ],
    'sr-RS': [
      { name: '9BWtsMINqrJLrRacOk9x', label: 'Aria (Female)', gender: 'female' },
      { name: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (Female)', gender: 'female' },
      { name: 'iP95p4xoKVk53GoZ742B', label: 'Chris (Male)', gender: 'male' },
      { name: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum (Male)', gender: 'male' },
    ],
    'es-ES': [
      { name: '9BWtsMINqrJLrRacOk9x', label: 'Aria (Female)', gender: 'female' },
      { name: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (Female)', gender: 'female' },
      { name: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Male)', gender: 'male' },
      { name: 'bIHbv24MWmeRgasZH58o', label: 'Will (Male)', gender: 'male' },
    ],
    'ar-XA': [
      { name: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (Female)', gender: 'female' },
      { name: '9BWtsMINqrJLrRacOk9x', label: 'Aria (Female)', gender: 'female' },
      { name: 'nPczCjzI2devNBz1zQrb', label: 'Brian (Male)', gender: 'male' },
      { name: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (Male)', gender: 'male' },
    ],
    'ru-RU': [
      { name: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica (Female)', gender: 'female' },
      { name: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda (Female)', gender: 'female' },
      { name: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Male)', gender: 'male' },
      { name: 'iP95p4xoKVk53GoZ742B', label: 'Chris (Male)', gender: 'male' },
    ],
    'zh-CN': [
      { name: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice (Female)', gender: 'female' },
      { name: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte (Female)', gender: 'female' },
      { name: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam (Male)', gender: 'male' },
      { name: 'nPczCjzI2devNBz1zQrb', label: 'Brian (Male)', gender: 'male' },
    ],
    'fr-FR': [
      { name: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura (Female)', gender: 'female' },
      { name: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily (Female)', gender: 'female' },
      { name: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger (Male)', gender: 'male' },
      { name: 'JBFqnCBsd6RMkjVDRZzb', label: 'George (Male)', gender: 'male' },
    ],
    'pt-PT': [
      { name: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (Female)', gender: 'female' },
      { name: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura (Female)', gender: 'female' },
      { name: 'bIHbv24MWmeRgasZH58o', label: 'Will (Male)', gender: 'male' },
      { name: 'iP95p4xoKVk53GoZ742B', label: 'Chris (Male)', gender: 'male' },
    ],
    'pl-PL': [
      { name: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica (Female)', gender: 'female' },
      { name: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda (Female)', gender: 'female' },
      { name: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel (Male)', gender: 'male' },
      { name: 'nPczCjzI2devNBz1zQrb', label: 'Brian (Male)', gender: 'male' },
    ],
  };

  // Get voices for current language
  const availableVoicesForLanguage = languageVoiceMap[preferences.stt_language] || languageVoiceMap['en-US'];
  
  // Get default female voice for the language
  const getDefaultVoiceForLanguage = useCallback((language: string): string => {
    const voices = languageVoiceMap[language] || languageVoiceMap['en-US'];
    const femaleVoice = voices.find(v => v.gender === 'female');
    return femaleVoice?.name || voices[0]?.name || 'EXAVITQu4vr4xnSDxMaL';
  }, []);

  // Auto-select appropriate voice when language changes
  useEffect(() => {
    if (!preferences) return;
    
    const currentLanguage = preferences.stt_language || 'en-US';
    const currentVoice = preferences.tts_voice;
    const voicesForLang = languageVoiceMap[currentLanguage] || languageVoiceMap['en-US'];
    
    // Check if current voice is valid for the selected language
    const isVoiceValidForLanguage = voicesForLang.some(v => v.name === currentVoice);
    
    if (!isVoiceValidForLanguage) {
      // Select default voice for this language (prefer female)
      const defaultVoice = getDefaultVoiceForLanguage(currentLanguage);
      updatePreferences({ tts_voice: defaultVoice });
    }
  }, [preferences?.stt_language, preferences?.tts_voice, updatePreferences, getDefaultVoiceForLanguage]);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    if (!preferences) return;
    
    // Get default voice for the new language
    const defaultVoice = getDefaultVoiceForLanguage(newLanguage);
    
    updatePreferences({
      stt_language: newLanguage,
      tts_voice: defaultVoice
    });
  }, [preferences, getDefaultVoiceForLanguage, updatePreferences]);
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
    const voiceName = preferences.tts_voice || 'EXAVITQu4vr4xnSDxMaL';
    setIsTesting(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const body = {
        text: testPhrase,
        voiceId: voiceName,
        modelId: 'eleven_turbo_v2_5',
      };

      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', { body });
      
      if (error) {
        console.error('ElevenLabs TTS error:', error);
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
      
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
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
            value={preferences.tts_voice || getDefaultVoiceForLanguage(preferences.stt_language)}
            onValueChange={(value) => updatePreferences({ tts_voice: value })}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Voices for {preferences.stt_language}
              </div>
              {availableVoicesForLanguage.map((voice) => (
                <SelectItem key={voice.name} value={voice.name}>
                  {voice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Using ElevenLabs multilingual voices for high-quality speech
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
