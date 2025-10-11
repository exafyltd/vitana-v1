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
import { useState } from "react";

export default function VoiceAISettings() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();
  const [isTesting, setIsTesting] = useState(false);

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
        <div className="max-w-4xl mx-auto space-y-6">
          <StandardHeader
            title="Voice & AI Settings"
            description="Customize your voice recognition and AI assistant experience"
            emoji="🎙️"
          />

          <Tabs defaultValue="stt" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="stt">Speech-to-Text</TabsTrigger>
              <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
              <TabsTrigger value="ai">AI Models</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            {/* Speech-to-Text Settings */}
            <TabsContent value="stt" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Speech Recognition Settings</CardTitle>
                  <CardDescription>
                    Configure how your voice input is processed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stt-language">Language</Label>
                    <Select
                      value={preferences.stt_language}
                      onValueChange={(value) => updatePreferences({ stt_language: value })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger id="stt-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (EN)</SelectItem>
                        <SelectItem value="sr-RS">Serbian (SR)</SelectItem>
                        <SelectItem value="de-DE">German (DE)</SelectItem>
                        <SelectItem value="ar-XA">Arabic (AR)</SelectItem>
                        <SelectItem value="es-ES">Spanish (ES)</SelectItem>
                        <SelectItem value="ru-RU">Russian (RU)</SelectItem>
                        <SelectItem value="zh-CN">Chinese (ZH)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This language is also used by the globe icon in the communication dock
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="instant-stt">Instant Transcription</Label>
                    <Switch
                      id="instant-stt"
                      checked={preferences.stt_instant_enabled}
                      onCheckedChange={(checked) => 
                        updatePreferences({ stt_instant_enabled: checked })
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-punctuation">Auto-Punctuation</Label>
                    <Switch
                      id="auto-punctuation"
                      checked={preferences.stt_auto_punctuation}
                      onCheckedChange={(checked) => 
                        updatePreferences({ stt_auto_punctuation: checked })
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sensitivity">Voice Sensitivity: {preferences.stt_sensitivity}%</Label>
                    <Slider
                      id="sensitivity"
                      min={0}
                      max={100}
                      step={5}
                      value={[preferences.stt_sensitivity]}
                      onValueChange={([value]) => 
                        updatePreferences({ stt_sensitivity: value })
                      }
                      disabled={isUpdating}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Text-to-Speech Settings */}
            <TabsContent value="tts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Voice Output Settings</CardTitle>
                  <CardDescription>
                    Customize how the AI speaks to you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tts-language">Language</Label>
                    <Select
                      value={preferences.stt_language}
                      onValueChange={(value) => updatePreferences({ stt_language: value })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger id="tts-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (EN)</SelectItem>
                        <SelectItem value="sr-RS">Serbian (SR)</SelectItem>
                        <SelectItem value="de-DE">German (DE)</SelectItem>
                        <SelectItem value="ar-XA">Arabic (AR)</SelectItem>
                        <SelectItem value="es-ES">Spanish (ES)</SelectItem>
                        <SelectItem value="ru-RU">Russian (RU)</SelectItem>
                        <SelectItem value="zh-CN">Chinese (ZH)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the language for voice output
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tts-voice">Voice</Label>
                    <Select
                      value={preferences.tts_voice}
                      onValueChange={(value) => updatePreferences({ tts_voice: value })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger id="tts-voice">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">Alloy</SelectItem>
                        <SelectItem value="echo">Echo</SelectItem>
                        <SelectItem value="fable">Fable</SelectItem>
                        <SelectItem value="onyx">Onyx</SelectItem>
                        <SelectItem value="nova">Nova</SelectItem>
                        <SelectItem value="shimmer">Shimmer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tts-character">Voice Character</Label>
                    <Select
                      value={preferences.tts_character}
                      onValueChange={(value) => updatePreferences({ tts_character: value })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger id="tts-character">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tts-speed">Speech Speed: {preferences.tts_speed.toFixed(1)}x</Label>
                    <Slider
                      id="tts-speed"
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      value={[preferences.tts_speed]}
                      onValueChange={([value]) => 
                        updatePreferences({ tts_speed: value })
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tts-pitch">Pitch: {preferences.tts_pitch.toFixed(1)}</Label>
                    <Slider
                      id="tts-pitch"
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      value={[preferences.tts_pitch]}
                      onValueChange={([value]) => 
                        updatePreferences({ tts_pitch: value })
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tts-volume">Volume: {preferences.tts_volume}%</Label>
                    <Slider
                      id="tts-volume"
                      min={0}
                      max={100}
                      step={5}
                      value={[preferences.tts_volume]}
                      onValueChange={([value]) => 
                        updatePreferences({ tts_volume: value })
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-greeting">Intelligent Auto-Greeting</Label>
                      <p className="text-xs text-muted-foreground">
                        Vitana will welcome you with context-aware messages
                      </p>
                    </div>
                    <Switch
                      id="auto-greeting"
                      checked={preferences.auto_greeting_enabled}
                      onCheckedChange={(checked) => 
                        updatePreferences({ auto_greeting_enabled: checked })
                      }
                      disabled={isUpdating}
                    />
                  </div>

                  {preferences.auto_greeting_enabled && (
                    <>
                      <div className="space-y-2 pt-4 border-t">
                        <Label htmlFor="greeting-frequency">Greeting Frequency</Label>
                        <Select
                          value={preferences.greeting_frequency || 'session'}
                          onValueChange={(value: any) => updatePreferences({ greeting_frequency: value })}
                          disabled={isUpdating}
                        >
                          <SelectTrigger id="greeting-frequency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="session">Once per session (recommended)</SelectItem>
                            <SelectItem value="daily">Once per day</SelectItem>
                            <SelectItem value="hourly">Every 4 hours</SelectItem>
                            <SelectItem value="off">Off</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Controls how often Vitana greets you
                        </p>
                      </div>

                      <div className="space-y-3 pt-4 border-t">
                        <Label>Greeting Message Types</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Choose what types of messages Vitana can say
                        </p>
                        
                        <div className="space-y-2">
                          {[
                            { value: 'welcome', label: 'Welcome Messages', description: 'Simple time-based greetings' },
                            { value: 'reminder', label: 'Reminders', description: 'Appointments and pending actions' },
                            { value: 'motivation', label: 'Motivational', description: 'Progress updates and achievements' },
                            { value: 'recommendation', label: 'Recommendations', description: 'AI-powered suggestions' },
                            { value: 'inspiration', label: 'Inspirational', description: 'Daily tips and quotes' },
                          ].map((type) => {
                            const currentTypes = (preferences.greeting_message_types || ['welcome', 'reminder', 'motivation']) as string[];
                            const isChecked = currentTypes.includes(type.value);
                            
                            return (
                              <div key={type.value} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                                <div className="space-y-0.5">
                                  <Label htmlFor={`greeting-type-${type.value}`}>{type.label}</Label>
                                  <p className="text-xs text-muted-foreground">{type.description}</p>
                                </div>
                                <Switch
                                  id={`greeting-type-${type.value}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const updated = checked 
                                      ? [...currentTypes, type.value]
                                      : currentTypes.filter(t => t !== type.value);
                                    updatePreferences({ greeting_message_types: updated });
                                  }}
                                  disabled={isUpdating}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  <Button onClick={handlePreviewVoice} className="w-full" disabled={isUpdating || isTesting}>
                    <Volume2 className="w-4 h-4 mr-2" />
                    {isTesting ? 'Speaking...' : 'Preview Voice'}
                  </Button>
                </CardContent>
              </Card>
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
