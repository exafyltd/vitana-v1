import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { settingsNavigation } from "@/config/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Loader2, Volume2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from '@/lib/i18n-toast';

export default function VoiceAISettings() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();
  const { setSelectedLanguage } = useLanguage();
  const [isTesting, setIsTesting] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Normalize and extract base language code (handles sr, sr-RS, sr_RS)
  const baseLang = useCallback((l: string) => (l || '').toLowerCase().replace('_','-').split('-')[0], []);

  // Helper to pick the best voice from candidates - prefer female voices
  const pickPreferredVoice = useCallback((voices: SpeechSynthesisVoice[]) => {
    if (voices.length === 0) return null;
    
    // Helper to check if voice is female
    const isFemaleVoice = (voice: SpeechSynthesisVoice) => {
      const name = voice.name.toLowerCase();
      return name.includes('female') || 
             name.includes('woman') ||
             name.includes('zira') ||
             name.includes('samantha') ||
             name.includes('victoria') ||
             name.includes('kate') ||
             name.includes('helena') ||
             name.includes('steffi') ||
             name.includes('laura') ||
             name.includes('amelie') ||
             name.includes('anna');
    };
    
    // First try to find female voices, prioritizing by provider
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
    
    // Fallback to any voice if no female voice found
    const google = voices.find(v => v.name.toLowerCase().includes('google'));
    if (google) return google;
    
    const microsoft = voices.find(v => v.name.toLowerCase().includes('microsoft'));
    if (microsoft) return microsoft;
    
    const apple = voices.find(v => v.name.toLowerCase().includes('apple'));
    if (apple) return apple;
    
    return voices[0];
  }, []);

  // Load available voices with polling for reliability
  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      console.log('🔊 All available voices:', voices.map(v => ({ name: v.name, lang: v.lang })));
      console.log('🔊 Serbian voices:', voices.filter(v => v.lang.toLowerCase().includes('sr')).map(v => ({ name: v.name, lang: v.lang })));
      setAvailableVoices(voices);
    }
  }, []);

  useEffect(() => {
    loadVoices();
    
    // Set up voice change listener
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Polling fallback for browsers that don't fire onvoiceschanged reliably
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

  // Self-healing: if selected voice doesn't match language, auto-correct
  useEffect(() => {
    if (!preferences || availableVoices.length === 0) return;
    
    const currentVoice = availableVoices.find(v => v.name === preferences.tts_voice);
    const currentVoiceLangCode = currentVoice ? baseLang(currentVoice.lang) : undefined;
    const selectedLangCode = baseLang(preferences.stt_language);
    
    // If voice doesn't match language or no voice selected
    if (!currentVoice || currentVoiceLangCode !== selectedLangCode) {
      const candidates = availableVoices.filter(v => baseLang(v.lang) === selectedLangCode);
      
      const preferred = pickPreferredVoice(candidates);
      if (preferred && preferred.name !== preferences.tts_voice) {
        updatePreferences({ tts_voice: preferred.name });
      }
    }
  }, [availableVoices, preferences, baseLang, pickPreferredVoice, updatePreferences]);

  // Handle language change: auto-select matching voice
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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!preferences) return null;

  // Google Cloud TTS voices by language
  const cloudVoices: Record<string, Array<{ name: string; label: string }>> = {
    'sr-RS': [
      { name: 'sr-RS-Standard-A', label: 'Serbian Female (Standard)' },
    ],
    'ar-XA': [
      { name: 'ar-XA-Standard-D', label: 'Arabic Female (Standard)' },
      { name: 'ar-XA-Wavenet-D', label: 'Arabic Female (Wavenet)' },
    ],
    'fr-FR': [
      { name: 'fr-FR-Standard-A', label: 'French Female (Standard)' },
      { name: 'fr-FR-Wavenet-A', label: 'French Female (Wavenet)' },
    ],
    'pt-PT': [
      { name: 'pt-PT-Standard-A', label: 'Portuguese Female (Standard)' },
      { name: 'pt-PT-Wavenet-A', label: 'Portuguese Female (Wavenet)' },
    ],
  };

  const getCloudVoicesForLanguage = (language: string) => {
    return cloudVoices[language] || [];
  };

  // STRICT filter: only voices matching the selected language (normalized)
  const filteredVoices = availableVoices.filter(voice => {
    const langCode = baseLang(preferences.stt_language);
    const voiceLang = baseLang(voice.lang);
    return voiceLang === langCode;
  });
  
  const currentCloudVoices = getCloudVoicesForLanguage(preferences.stt_language);

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
    };
    return phrases[language] || phrases['en-US'];
  };

  const handlePreviewVoice = async () => {
    const testPhrase = getTestPhrase(preferences.stt_language || 'en-US');
    const voiceName = preferences.tts_voice;
    const isCloudVoice = voiceName?.includes('-Standard-') || voiceName?.includes('-Wavenet-');

    setIsTesting(true);

    try {
      if (isCloudVoice) {
        // Use Google Cloud TTS for preview
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase.functions.invoke('google-cloud-tts', {
          body: {
            text: testPhrase,
            voiceId: voiceName,
            languageCode: preferences.stt_language || 'en-US',
          },
        });

        if (error) throw error;
        if (!data?.audioContent) throw new Error('No audio content received');

        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.volume = preferences.tts_volume / 100;
        audio.onended = () => setIsTesting(false);
        audio.onerror = () => setIsTesting(false);
        await audio.play();
      } else {
        // Use browser TTS for preview
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
    <AppLayout>
      <SEO 
        title={t('screens.settings.voiceAiSettings')} 
        description="Configure your voice recognition and AI assistant preferences" 
        canonical={window.location.href} 
      />
      <SubNavigation items={settingsNavigation} />
      
      <div className="p-6 bg-gradient-subtle min-h-screen pb-32 md:pb-40">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title={t('screens.settings.voiceAiSettings')}
            description="Customize your voice recognition and AI assistant experience"
            emoji="🎙️"
          />

          {/* Settings Tabs */}
          <Tabs defaultValue="voice" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="voice">{t('screens.settings.voice')}</TabsTrigger>
              <TabsTrigger value="ai">{t('screens.settings.aiModels')}</TabsTrigger>
              <TabsTrigger value="privacy">{t('screens.settings.privacy')}</TabsTrigger>
            </TabsList>

            {/* Voice Settings Tab */}
            <TabsContent value="voice" className="space-y-4">
              {/* 2-Column TTS Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Card: TTS Voice Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('screens.settings.voiceOutputSettings')}</CardTitle>
                    <CardDescription>{t('screens.settings.configureHowAiSpeaksYou')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Language */}
                    <div className="space-y-2">
                      <Label>{t('screens.settings.language')}</Label>
                      <Select
                        value={preferences.stt_language}
                        onValueChange={handleLanguageChange}
                        disabled={isUpdating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-US">{t('screens.settings.englishUs')}</SelectItem>
                          <SelectItem value="de-DE">{t('screens.settings.germanDe')}</SelectItem>
                          <SelectItem value="sr-RS">{t('screens.settings.serbianRs')}</SelectItem>
                          <SelectItem value="es-ES">{t('screens.settings.spanishEs')}</SelectItem>
                          <SelectItem value="ar-XA">{t('screens.settings.arabicXa')}</SelectItem>
                          <SelectItem value="ru-RU">{t('screens.settings.russianRu')}</SelectItem>
                          <SelectItem value="zh-CN">{t('screens.settings.chineseCn')}</SelectItem>
                          <SelectItem value="fr-FR">{t('screens.settings.frenchFr')}</SelectItem>
                          <SelectItem value="pt-PT">{t('screens.settings.portuguesePt')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Voice Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t('screens.settings.voice')}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadVoices}
                          disabled={isUpdating}
                          className="h-7 text-xs"
                        >{t('screens.settings.refreshBrowserVoices')}
                        </Button>
                      </div>
                      <Select
                        value={preferences.tts_voice}
                        onValueChange={(value) => updatePreferences({ tts_voice: value })}
                        disabled={isUpdating}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('screens.settings.selectVoice')} />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Google Cloud Voices */}
                          {currentCloudVoices.length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                {t('screens.settings.googleCloudVoicesHighQuality')}
                              </div>
                              {currentCloudVoices.map((voice) => (
                                <SelectItem key={voice.name} value={voice.name}>
                                  {voice.label}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Browser Voices */}
                          {filteredVoices.length > 0 && (
                            <>
                              {currentCloudVoices.length > 0 && (
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2 pt-2">
                                  {t('screens.settings.browserVoices')}
                                </div>
                              )}
                              {filteredVoices.map((voice) => (
                                <SelectItem key={voice.name} value={voice.name}>
                                  {voice.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* No voices */}
                          {filteredVoices.length === 0 && currentCloudVoices.length === 0 && (
                            <SelectItem value="" disabled>
                              {t('screens.settings.noVoicesAvailable')}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {currentCloudVoices.length > 0 
                          ? 'Google Cloud voices provide superior quality and natural-sounding speech'
                          : filteredVoices.length === 0
                          ? `No voices available for ${baseLang(preferences.stt_language).toUpperCase()}. Install a voice in your OS/browser settings.`
                          : 'Using browser-based voices'
                        }
                      </p>
                    </div>

                    {/* Speed */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t('screens.settings.speed')}</Label>
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

                    {/* Pitch */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t('screens.settings.pitch')}</Label>
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

                    {/* Volume */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t('screens.settings.volume')}</Label>
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

                    {/* Preview Button */}
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

                {/* Right Card: Proactive Speaking Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('screens.settings.proactiveSpeaking')}</CardTitle>
                    <CardDescription>{t('screens.settings.controlWhenHowVitanaSpeaksYou')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Auto-Greeting */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('screens.settings.autogreeting')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('screens.settings.vitanaWillGreetYouAutomatically')}
                        </p>
                      </div>
                      <Switch
                        checked={preferences.auto_greeting_enabled}
                        onCheckedChange={(checked) =>
                          updatePreferences({ auto_greeting_enabled: checked })
                        }
                        disabled={isUpdating}
                      />
                    </div>

                    {preferences.auto_greeting_enabled && (
                      <>
                        {/* Greeting Frequency */}
                        <div className="space-y-2">
                          <Label>{t('screens.settings.greetingFrequency')}</Label>
                          <Select
                            value={preferences.greeting_frequency}
                            onValueChange={(value: 'session' | 'daily' | 'hourly' | 'off') =>
                              updatePreferences({ greeting_frequency: value })
                            }
                            disabled={isUpdating}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="session">{t('screens.settings.oncePerSession')}</SelectItem>
                              <SelectItem value="daily">{t('screens.settings.oncePerDay')}</SelectItem>
                              <SelectItem value="hourly">{t('screens.settings.oncePerHour')}</SelectItem>
                              <SelectItem value="off">{t('screens.settings.off')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Message Types */}
                        <div className="space-y-3">
                          <Label>{t('screens.settings.messageTypes')}</Label>
                          <div className="space-y-3">
                            {[
                              { id: 'time_greeting', label: 'Time-based greetings (Good morning, etc.)' },
                              { id: 'wellness_check', label: 'Wellness check-ins' },
                              { id: 'motivational', label: 'Motivational messages' },
                              { id: 'reminder', label: 'Action reminders' },
                            ].map((type) => (
                              <div key={type.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={type.id}
                                  checked={preferences.greeting_message_types?.includes(type.id)}
                                  onCheckedChange={(checked) => {
                                    const currentTypes = preferences.greeting_message_types || [];
                                    const newTypes = checked
                                      ? [...currentTypes, type.id]
                                      : currentTypes.filter((t) => t !== type.id);
                                    updatePreferences({ greeting_message_types: newTypes });
                                  }}
                                  disabled={isUpdating}
                                />
                                <label
                                  htmlFor={type.id}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {type.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* AI Model Settings */}
            <TabsContent value="ai" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.settings.aiModelPreferences')}</CardTitle>
                  <CardDescription>
                    {t('screens.settings.chooseYourPreferredAiModelBehavior')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-model">{t('screens.settings.preferredModel')}</Label>
                    <Select
                      value={preferences.ai_model}
                      onValueChange={(value) => updatePreferences({ ai_model: value })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger id="ai-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">{t('screens.settings.gpt4')}</SelectItem>
                        <SelectItem value="gpt-4-turbo">{t('screens.settings.gpt4Turbo')}</SelectItem>
                        <SelectItem value="claude-3">{t('screens.settings.claude3')}</SelectItem>
                        <SelectItem value="gemini-pro">{t('screens.settings.geminiPro')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-temperature">{t('screens.settings.creativityValue0', { value0: preferences.ai_temperature.toFixed(1) })}</Label>
                    <Slider
                      id="ai-temperature"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[preferences.ai_temperature]}
                      onValueChange={([value]) => 
                        updatePreferences({ ai_temperature: value })
                      }
                      disabled={isUpdating}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('screens.settings.lowerValuesMoreFocusedHigherValues')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="response-length">{t('screens.settings.responseLength')}</Label>
                    <Select
                      value={preferences.ai_response_length}
                      onValueChange={(value: any) => updatePreferences({ ai_response_length: value })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger id="response-length">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">{t('screens.settings.shortConcise')}</SelectItem>
                        <SelectItem value="medium">{t('screens.settings.medium')}</SelectItem>
                        <SelectItem value="long">{t('screens.settings.detailedComprehensive')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.settings.privacyDataSettings')}</CardTitle>
                  <CardDescription>
                    {t('screens.settings.controlHowYourVoiceDataStored')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="store-recordings">{t('screens.settings.storeVoiceRecordings')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('screens.settings.saveRecordingsForQualityImprovement')}
                      </p>
                    </div>
                    <Switch
                      id="store-recordings"
                      checked={preferences.store_voice_recordings}
                      onCheckedChange={(checked) => 
                        updatePreferences({ store_voice_recordings: checked })
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auto-delete">{t('screens.settings.autodeleteRecordingsAfterDays')}</Label>
                    <Input
                      id="auto-delete"
                      type="number"
                      min="1"
                      max="365"
                      value={preferences.auto_delete_recordings_days}
                      onChange={(e) => 
                        updatePreferences({ 
                          auto_delete_recordings_days: parseInt(e.target.value) 
                        })
                      }
                      disabled={isUpdating || !preferences.store_voice_recordings}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
