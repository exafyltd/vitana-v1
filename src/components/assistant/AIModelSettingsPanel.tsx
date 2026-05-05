import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from '@/lib/i18n-toast';

interface AIModelSettingsPanelProps {
  preferences: any;
  isUpdating: boolean;
  updatePreferences: (updates: any) => void;
}

export default function AIModelSettingsPanel({ preferences, isUpdating, updatePreferences }: AIModelSettingsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('screens.assistant.aiModelPreferences')}</CardTitle>
        <CardDescription>
          Choose your preferred AI model and behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ai-model">{t('screens.assistant.preferredModel')}</Label>
          <Select
            value={preferences.ai_model}
            onValueChange={(value) => updatePreferences({ ai_model: value })}
            disabled={isUpdating}
          >
            <SelectTrigger id="ai-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4">{t('screens.assistant.gpt4')}</SelectItem>
              <SelectItem value="gpt-4-turbo">{t('screens.assistant.gpt4Turbo')}</SelectItem>
              <SelectItem value="claude-3">{t('screens.assistant.claude3')}</SelectItem>
              <SelectItem value="gemini-pro">{t('screens.assistant.geminiPro')}</SelectItem>
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
          <Label htmlFor="response-length">{t('screens.assistant.responseLength')}</Label>
          <Select
            value={preferences.ai_response_length}
            onValueChange={(value: any) => updatePreferences({ ai_response_length: value })}
            disabled={isUpdating}
          >
            <SelectTrigger id="response-length">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short">{t('screens.assistant.shortConcise')}</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="long">{t('screens.assistant.detailedComprehensive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
