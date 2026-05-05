import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useIntelligentGreeting } from "@/hooks/useIntelligentGreeting";
import { Play, RotateCcw, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { t } from '@/lib/i18n-toast';

interface ProactiveTalkingPanelProps {
  preferences: any;
  isUpdating: boolean;
  updatePreferences: (updates: any) => void;
}

export default function ProactiveTalkingPanel({ preferences, isUpdating, updatePreferences }: ProactiveTalkingPanelProps) {
  const { manualGreeting, clearGreetingState, lastGreeting, isSpeaking } = useIntelligentGreeting();

  // Extract language from voice or use stt_language
  const extractLanguageFromVoice = (voice: string): string | null => {
    const match = voice.match(/([a-z]{2}-[A-Z]{2})/);
    return match?.[1] || null;
  };

  const canonicalLang = preferences?.stt_language || extractLanguageFromVoice(preferences?.tts_voice || '') || 'en-US';
  const voiceLangExtracted = extractLanguageFromVoice(preferences?.tts_voice || '');

  // Map UI message types to generator types
  const messageTypeMap: Record<string, string> = {
    'time_greeting': 'welcome',
    'motivational': 'motivation',
    'reminder': 'reminder',
    'wellness_check': 'recommendation',
  };

  const allowedGeneratorTypes = (preferences?.greeting_message_types || [])
    .map((t: string) => messageTypeMap[t] || t);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('screens.assistant.proactiveSpeakingSettings')}</CardTitle>
          <CardDescription>{t('screens.assistant.controlWhenHowVitanaSpeaksYou')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('screens.assistant.autogreeting')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('screens.assistant.vitanaWillGreetYouAutomatically')}
              </p>
            </div>
            <Switch
              checked={preferences?.auto_greeting_enabled}
              onCheckedChange={(checked) =>
                updatePreferences({ auto_greeting_enabled: checked })
              }
              disabled={isUpdating}
            />
          </div>

          {preferences?.auto_greeting_enabled && (
            <>
              <div className="space-y-2">
                <Label>{t('screens.assistant.greetingFrequency')}</Label>
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
                    <SelectItem value="session">{t('screens.assistant.oncePerSession')}</SelectItem>
                    <SelectItem value="daily">{t('screens.assistant.oncePerDay')}</SelectItem>
                    <SelectItem value="hourly">{t('screens.assistant.oncePerHour')}</SelectItem>
                    <SelectItem value="off">{t('screens.assistant.off')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>{t('screens.assistant.messageTypes')}</Label>
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
                            : currentTypes.filter((t: string) => t !== type.id);
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

      <Card>
        <CardHeader>
          <CardTitle>{t('screens.assistant.testingDebugging')}</CardTitle>
          <CardDescription>{t('screens.assistant.testDebugProactiveGreetingFunctionality')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('screens.assistant.languageVsVoice')}</strong>{t('screens.assistant.languageSettingControlsWhatLanguageText')}
            </AlertDescription>
          </Alert>

          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium">{t('screens.assistant.currentConfiguration')}</h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>{t('screens.assistant.sttLanguage')}</strong> {preferences?.stt_language || 'Not set'}</p>
              <p><strong>{t('screens.assistant.ttsVoice')}</strong> {preferences?.tts_voice || 'Not set'}</p>
              <p><strong>{t('screens.assistant.extractedFromVoice')}</strong> {voiceLangExtracted || 'None'}</p>
              <p><strong>{t('screens.assistant.finalLanguageUsed')}</strong> {canonicalLang}</p>
              <p><strong>{t('screens.assistant.allowedMessageTypes')}</strong> {allowedGeneratorTypes.join(', ') || 'None'}</p>
            </div>
          </div>

          {lastGreeting && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium">{t('screens.assistant.lastGreeting')}</h4>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p><strong>{t('screens.assistant.type')}</strong> {lastGreeting.type}</p>
                <p><strong>{t('screens.assistant.text')}</strong> "{lastGreeting.text}"</p>
                <p><strong>{t('screens.assistant.priority')}</strong> {lastGreeting.priority}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={manualGreeting}
              disabled={isSpeaking || isUpdating}
              className="flex-1"
            >
              <Play className="mr-2 h-4 w-4" />
              {isSpeaking ? "Speaking..." : "Play Sample Greeting"}
            </Button>
            <Button
              onClick={clearGreetingState}
              variant="outline"
              disabled={isUpdating}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('screens.assistant.resetSession')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
