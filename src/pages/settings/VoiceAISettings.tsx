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
import { useState, useEffect } from "react";

export default function VoiceAISettings() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();
  const [isTesting, setIsTesting] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

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

  // Filter voices by selected language - use more flexible matching
  const filteredVoices = availableVoices.filter(voice => {
    const langCode = preferences.stt_language.split('-')[0]; // e.g., "sr" from "sr-RS"
    const voiceLang = voice.lang.split('-')[0]; // e.g., "sr" from "sr-Latn-RS"
    return voiceLang === langCode || voice.lang === preferences.stt_language;
  });

  const getTestPhrase = (language: string): string => {
    const phrases: Record<string, string> = {
      'en-US': 'Hello, this is a preview of your selected voice settings.',
      'de-DE': 'Hallo, dies ist eine Vorschau Ihrer ausgewählten Spracheinstellungen.',
      'sr-RS': 'Zdravo, ovo je pregled izabranih postavki glasa.',
      'es-ES': 'Hola, esta es una vista previa de la configuración de voz seleccionada.',
      'ar-XA': 'مرحبا، هذه معاينة لإعدادات الصوت المحددة.',
      'ru-RU': 'Привет, это предварительный просмотр выбранных настроек голоса.',
      'zh-CN': '您好，这是您所选语音设置的预览。',
    };
    return phrases[language] || phrases['en-US'];
  };

  const handlePreviewVoice = () => {
    window.speechSynthesis.cancel();
    
    const testPhrase = getTestPhrase(preferences.stt_language || 'en-US');
    const utterance = new SpeechSynthesisUtterance(testPhrase);
    utterance.rate = preferences.tts_speed;
    utterance.pitch = preferences.tts_pitch;
    utterance.volume = preferences.tts_volume / 100;
    utterance.lang = preferences.stt_language || 'en-US';
    
    // Apply selected voice
    const selectedVoice = availableVoices.find(v => v.name === preferences.tts_voice);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.onstart = () => setIsTesting(true);
    utterance.onend = () => setIsTesting(false);
    utterance.onerror = () => setIsTesting(false);
    
    window.speechSynthesis.speak(utterance);
  };

  return (
    <AppLayout>
      <SEO 
        title="Voice & AI Settings" 
        description="Configure your voice recognition and AI assistant preferences" 
        canonical={window.location.href} 
      />
      <SubNavigation items={settingsNavigation} />
      
      <div className="p-6 bg-gradient-subtle min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Voice & AI Settings"
            description="Customize your voice recognition and AI assistant experience"
            emoji="🎙️"
          />

          {/* Settings Tabs */}
          <Tabs defaultValue="voice" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="ai">AI Models</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            {/* Voice Settings Tab */}
            <TabsContent value="voice" className="space-y-4">
              {/* 2-Column TTS Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Card: TTS Voice Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Voice Output Settings</CardTitle>
                    <CardDescription>Configure how the AI speaks to you</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Language */}
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select
                        value={preferences.stt_language}
                        onValueChange={(value) => updatePreferences({ stt_language: value })}
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
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Browser Voice */}
                    <div className="space-y-2">
                      <Label>Voice</Label>
                      <Select
                        value={preferences.tts_voice}
                        onValueChange={(value) => updatePreferences({ tts_voice: value })}
                        disabled={isUpdating}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredVoices.length > 0 ? (
                            filteredVoices.map((voice) => (
                              <SelectItem key={voice.name} value={voice.name}>
                                {voice.name} ({voice.lang})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="default" disabled>No voices available for this language</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Speed */}
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

                    {/* Pitch */}
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

                    {/* Volume */}
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
                    <CardTitle>Proactive Speaking</CardTitle>
                    <CardDescription>Control when and how Vitana speaks to you</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Auto-Greeting */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-Greeting</Label>
                        <p className="text-sm text-muted-foreground">
                          Vitana will greet you automatically
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
                          <Label>Greeting Frequency</Label>
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
                              <SelectItem value="session">Once per session</SelectItem>
                              <SelectItem value="daily">Once per day</SelectItem>
                              <SelectItem value="hourly">Once per hour</SelectItem>
                              <SelectItem value="off">Off</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Message Types */}
                        <div className="space-y-3">
                          <Label>Message Types</Label>
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
                  <CardTitle>AI Model Preferences</CardTitle>
                  <CardDescription>
                    Choose your preferred AI model and behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-model">Preferred Model</Label>
                    <Select
                      value={preferences.ai_model}
                      onValueChange={(value) => updatePreferences({ ai_model: value })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger id="ai-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="claude-3">Claude 3</SelectItem>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-temperature">Creativity: {preferences.ai_temperature.toFixed(1)}</Label>
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
                      Lower values are more focused, higher values are more creative
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="response-length">Response Length</Label>
                    <Select
                      value={preferences.ai_response_length}
                      onValueChange={(value: any) => updatePreferences({ ai_response_length: value })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger id="response-length">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short & Concise</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="long">Detailed & Comprehensive</SelectItem>
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
                  <CardTitle>Privacy & Data Settings</CardTitle>
                  <CardDescription>
                    Control how your voice data is stored and used
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="store-recordings">Store Voice Recordings</Label>
                      <p className="text-xs text-muted-foreground">
                        Save recordings for quality improvement
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
                    <Label htmlFor="auto-delete">Auto-Delete Recordings After (Days)</Label>
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
