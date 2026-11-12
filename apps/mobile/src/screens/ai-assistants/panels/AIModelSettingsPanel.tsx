/**
 * VTID-05521 — `?tab=ai`, the native twin of
 * `src/components/assistant/AIModelSettingsPanel.tsx`: preferred model select,
 * the creativity (temperature) slider 0..1 step 0.1 and the response-length
 * select, each writing its `user_preferences` column. The N2 `Slider` (fill
 * from the inline start, flips in RTL — the web slider defect is not
 * reproduced).
 */
import type { ReactElement } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider } from '../../../ports/ui';
import { useI18n } from '../../../i18n/I18nProvider';
import { Field, Hint, PanelCard } from '../components';
import type { PanelProps } from './types';

const MODELS = [
  ['gpt-4', 'screens.assistant.gpt4'],
  ['gpt-4-turbo', 'screens.assistant.gpt4Turbo'],
  ['claude-3', 'screens.assistant.claude3'],
  ['gemini-pro', 'screens.assistant.geminiPro'],
] as const;

const LENGTHS = [
  ['short', 'screens.assistant.shortConcise'],
  ['medium', 'screens.assistant.medium'],
  ['long', 'screens.assistant.detailedComprehensive'],
] as const;

export function AIModelSettingsPanel({ preferences, isUpdating, updatePreferences }: PanelProps): ReactElement {
  const { t } = useI18n();
  const creativity = t('screens.assistant.creativityValue0', { value0: Number(preferences.ai_temperature ?? 0).toFixed(1) });
  return (
    <PanelCard title={t('screens.assistant.aiModelPreferences')} description={t('screens.assistant.chooseYourPreferredAiModelBehavior')} testID="assistant-panel-ai">
      <Field label={t('screens.assistant.preferredModel')}>
        <Select value={preferences.ai_model} onValueChange={(value) => updatePreferences({ ai_model: value })} disabled={isUpdating}>
          <SelectTrigger testID="assistant-ai-model-trigger" accessibilityLabel={t('screens.assistant.preferredModel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent testID="assistant-ai-model">
            {MODELS.map(([value, key]) => (
              <SelectItem key={value} value={value} testID={`assistant-ai-model-${value}`}>
                {t(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={creativity}>
        <Slider
          testID="assistant-ai-temperature"
          accessibilityLabel={creativity}
          min={0}
          max={1}
          step={0.1}
          value={[Number(preferences.ai_temperature ?? 0)]}
          onValueChange={([value]) => updatePreferences({ ai_temperature: value })}
          disabled={isUpdating}
        />
        <Hint>{t('screens.assistant.lowerValuesMoreFocusedHigherValues')}</Hint>
      </Field>

      <Field label={t('screens.assistant.responseLength')}>
        <Select
          value={preferences.ai_response_length}
          onValueChange={(value) => updatePreferences({ ai_response_length: value as PanelProps['preferences']['ai_response_length'] })}
          disabled={isUpdating}
        >
          <SelectTrigger testID="assistant-response-length-trigger" accessibilityLabel={t('screens.assistant.responseLength')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent testID="assistant-response-length">
            {LENGTHS.map(([value, key]) => (
              <SelectItem key={value} value={value} testID={`assistant-response-length-${value}`}>
                {t(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </PanelCard>
  );
}
