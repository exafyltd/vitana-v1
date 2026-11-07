/**
 * VTID-05521 — `?tab=autopilot`, the native twin of
 * `src/components/assistant/AutopilotSettingsPanel.tsx`: three cards — the
 * master switch, the four action-category switches (the whole
 * `autopilot_categories` object is written, as on the web) and frequency &
 * timing (max actions per day 1..20, quiet-hours start / end, priority
 * filter). The web's `<input type="number">` / `<input type="time">` only
 * ever hold a number / an `HH:MM`; the native text fields keep the typed
 * draft and write once it is one, so a half-typed value is never saved.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TextInput } from '../../../ports/ui';
import { useI18n } from '../../../i18n/I18nProvider';
import { isTimeValue, type UserPreferences } from '../data/requests';
import { Field, PanelCard, SwitchField } from '../components';
import type { PanelProps } from './types';

const CATEGORIES = [
  ['health', 'screens.assistant.healthActions'],
  ['community', 'screens.assistant.communityActions'],
  ['discovery', 'screens.assistant.discoveryActions'],
  ['memory', 'screens.assistant.memoryActions'],
] as const;

const PRIORITIES = [
  ['all', 'screens.assistant.allPriorities'],
  ['high_medium', 'screens.assistant.highMediumOnly'],
  ['high', 'screens.assistant.highPriorityOnly'],
] as const;

function DraftInput({
  value,
  accept,
  onCommit,
  disabled,
  label,
  type,
  testID,
}: {
  value: string;
  accept: (draft: string) => boolean;
  onCommit: (draft: string) => void;
  disabled: boolean;
  label: string;
  type?: 'number';
  testID: string;
}): ReactElement {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <TextInput
      testID={testID}
      accessibilityLabel={label}
      keyboardType={type === 'number' ? 'numeric' : undefined}
      value={draft}
      editable={!disabled}
      onChangeText={(next) => {
        setDraft(next);
        if (next !== value && accept(next)) onCommit(next);
      }}
    />
  );
}

export function AutopilotSettingsPanel({ preferences, isUpdating, updatePreferences }: PanelProps): ReactElement {
  const { t } = useI18n();
  const categories = preferences.autopilot_categories ?? { health: false, community: false, discovery: false, memory: false };
  return (
    <View style={styles.stack} testID="assistant-panel-autopilot">
      <PanelCard title={t('screens.assistant.enableAutopilot')} description={t('screens.assistant.turnAutopilotReceiveAutomatedSuggestionsActions')}>
        <SwitchField
          label={t('screens.assistant.autopilotActive')}
          checked={!!preferences.autopilot_enabled}
          onChange={(checked) => updatePreferences({ autopilot_enabled: checked })}
          disabled={isUpdating}
          testID="assistant-autopilot-enabled"
        />
      </PanelCard>

      <PanelCard title={t('screens.assistant.actionCategories')} description={t('screens.assistant.chooseWhichTypesAutopilotActionsYou')}>
        {CATEGORIES.map(([id, key]) => (
          <SwitchField
            key={id}
            label={t(key)}
            checked={!!categories[id]}
            onChange={(checked) => updatePreferences({ autopilot_categories: { ...categories, [id]: checked } })}
            disabled={isUpdating}
            testID={`assistant-autopilot-category-${id}`}
          />
        ))}
      </PanelCard>

      <PanelCard title={t('screens.assistant.frequencyTiming')} description={t('screens.assistant.controlWhenHowOftenYouReceive')}>
        <Field label={t('screens.assistant.maximumActionsPerDay')}>
          <DraftInput
            testID="assistant-autopilot-max-actions"
            label={t('screens.assistant.maximumActionsPerDay')}
            type="number"
            value={String(preferences.autopilot_max_actions_per_day ?? '')}
            accept={(d) => /^\d+$/.test(d) && Number(d) >= 1 && Number(d) <= 20}
            onCommit={(d) => updatePreferences({ autopilot_max_actions_per_day: parseInt(d, 10) })}
            disabled={isUpdating}
          />
        </Field>

        <View style={styles.grid}>
          <Field label={t('screens.assistant.quietHoursStart')} style={styles.cell}>
            <DraftInput
              testID="assistant-autopilot-quiet-start"
              label={t('screens.assistant.quietHoursStart')}
              value={preferences.autopilot_quiet_hours_start ?? ''}
              accept={isTimeValue}
              onCommit={(d) => updatePreferences({ autopilot_quiet_hours_start: d })}
              disabled={isUpdating}
            />
          </Field>
          <Field label={t('screens.assistant.quietHoursEnd')} style={styles.cell}>
            <DraftInput
              testID="assistant-autopilot-quiet-end"
              label={t('screens.assistant.quietHoursEnd')}
              value={preferences.autopilot_quiet_hours_end ?? ''}
              accept={isTimeValue}
              onCommit={(d) => updatePreferences({ autopilot_quiet_hours_end: d })}
              disabled={isUpdating}
            />
          </Field>
        </View>

        <Field label={t('screens.assistant.priorityFilter')}>
          <Select
            value={preferences.autopilot_priority_filter}
            onValueChange={(value) => updatePreferences({ autopilot_priority_filter: value as UserPreferences['autopilot_priority_filter'] })}
            disabled={isUpdating}
          >
            <SelectTrigger testID="assistant-autopilot-priority-trigger" accessibilityLabel={t('screens.assistant.priorityFilter')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent testID="assistant-autopilot-priority">
              {PRIORITIES.map(([value, key]) => (
                <SelectItem key={value} value={value} testID={`assistant-autopilot-priority-${value}`}>
                  {t(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </PanelCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  grid: { flexDirection: 'row', gap: 16 },
  cell: { flex: 1 },
});
