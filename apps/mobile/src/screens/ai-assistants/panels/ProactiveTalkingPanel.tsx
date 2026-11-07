/**
 * VTID-05521 — `?tab=proactive`, the native twin of
 * `src/components/assistant/ProactiveTalkingPanel.tsx`: the auto-greeting
 * switch, and while it is on the greeting frequency select and the four
 * message-type checkboxes; then the "Testing & debugging" card — the
 * language-vs-voice alert, the current configuration block, the last
 * greeting (when one was played) and the two buttons. "Play sample greeting"
 * asks the `generate-proactive-greeting` edge function (the model composes
 * the greeting in the member's language — never a line in code) and speaks
 * it through the gateway; "Reset session" clears the greeted-this-session
 * flag.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Checkbox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Text, useUITheme } from '../../../ports/ui';
import { Label } from '../../../ports/assistant';
import { useI18n } from '../../../i18n/I18nProvider';
import { MESSAGE_TYPE_MAP, languageFromVoice, type UserPreferences } from '../data/requests';
import { useManualGreeting } from '../data/hooks';
import { AlertBox, ButtonGlyph, Field, PanelCard, SwitchField } from '../components';
import type { PanelProps } from './types';

const FREQUENCIES = [
  ['session', 'screens.assistant.oncePerSession'],
  ['daily', 'screens.assistant.oncePerDay'],
  ['hourly', 'screens.assistant.oncePerHour'],
  ['off', 'screens.assistant.off'],
] as const;

const MESSAGE_TYPES = ['time_greeting', 'wellness_check', 'motivational', 'reminder'] as const;

function InfoLine({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Text size="xs" muted>
      <Text size="xs" weight="700" muted>
        {label}
      </Text>{' '}
      {value}
    </Text>
  );
}

export function ProactiveTalkingPanel({ preferences, isUpdating, updatePreferences }: PanelProps): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { manualGreeting, clearGreetingState, lastGreeting, isSpeaking } = useManualGreeting(preferences);

  const voiceLang = languageFromVoice(preferences.tts_voice);
  const canonicalLang = preferences.stt_language || voiceLang || 'en-US';
  const types = preferences.greeting_message_types ?? [];
  const allowed = types.map((type) => MESSAGE_TYPE_MAP[type] || type);
  const notSet = t('aiAssistantsNative.proactive.notSet');
  const none = t('aiAssistantsNative.proactive.none');

  return (
    <View style={styles.stack} testID="assistant-panel-proactive">
      <PanelCard title={t('screens.assistant.proactiveSpeakingSettings')} description={t('screens.assistant.controlWhenHowVitanaSpeaksYou')} gap={24}>
        <SwitchField
          label={t('screens.assistant.autogreeting')}
          description={t('screens.assistant.vitanaWillGreetYouAutomatically')}
          checked={!!preferences.auto_greeting_enabled}
          onChange={(checked) => updatePreferences({ auto_greeting_enabled: checked })}
          disabled={isUpdating}
          testID="assistant-proactive-auto-greeting"
        />

        {preferences.auto_greeting_enabled ? (
          <>
            <Field label={t('screens.assistant.greetingFrequency')}>
              <Select
                value={preferences.greeting_frequency}
                onValueChange={(value) => updatePreferences({ greeting_frequency: value as UserPreferences['greeting_frequency'] })}
                disabled={isUpdating}
              >
                <SelectTrigger testID="assistant-proactive-frequency-trigger" accessibilityLabel={t('screens.assistant.greetingFrequency')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent testID="assistant-proactive-frequency">
                  {FREQUENCIES.map(([value, key]) => (
                    <SelectItem key={value} value={value} testID={`assistant-proactive-frequency-${value}`}>
                      {t(key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <View style={styles.types} testID="assistant-proactive-message-types">
              <Label>{t('screens.assistant.messageTypes')}</Label>
              {MESSAGE_TYPES.map((id) => {
                const label = t(`aiAssistantsNative.proactive.messageType.${id}`);
                return (
                  <View key={id} style={styles.checkRow}>
                    <Checkbox
                      testID={`assistant-proactive-type-${id}`}
                      accessibilityLabel={label}
                      checked={types.includes(id)}
                      onCheckedChange={(checked) =>
                        updatePreferences({ greeting_message_types: checked === true ? [...types, id] : types.filter((x) => x !== id) })
                      }
                      disabled={isUpdating}
                    />
                    <Text size="sm" weight="500" style={styles.fill}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </PanelCard>

      <PanelCard title={t('screens.assistant.testingDebugging')} description={t('screens.assistant.testDebugProactiveGreetingFunctionality')}>
        <AlertBox icon="Info">
          <Text size="sm">
            <Text size="sm" weight="700">
              {t('screens.assistant.languageVsVoice')}
            </Text>
            {t('screens.assistant.languageSettingControlsWhatLanguageText')}
          </Text>
        </AlertBox>

        <View style={[styles.block, { backgroundColor: colors.muted }]} testID="assistant-proactive-config">
          <Text size="sm" weight="500">
            {t('screens.assistant.currentConfiguration')}
          </Text>
          <InfoLine label={t('screens.assistant.sttLanguage')} value={preferences.stt_language || notSet} />
          <InfoLine label={t('screens.assistant.ttsVoice')} value={preferences.tts_voice || notSet} />
          <InfoLine label={t('screens.assistant.extractedFromVoice')} value={voiceLang || none} />
          <InfoLine label={t('screens.assistant.finalLanguageUsed')} value={canonicalLang} />
          <InfoLine label={t('screens.assistant.allowedMessageTypes')} value={allowed.join(', ') || none} />
        </View>

        {lastGreeting ? (
          <View style={[styles.block, { backgroundColor: colors.muted }]} testID="assistant-proactive-last-greeting">
            <Text size="sm" weight="500">
              {t('screens.assistant.lastGreeting')}
            </Text>
            <InfoLine label={t('screens.assistant.type')} value={lastGreeting.type} />
            <InfoLine label={t('screens.assistant.text')} value={t('aiAssistantsNative.proactive.quoted', { text: lastGreeting.text })} />
            <InfoLine label={t('screens.assistant.priority')} value={lastGreeting.priority} />
          </View>
        ) : null}

        <View style={styles.buttons}>
          <Button onPress={() => void manualGreeting()} disabled={isSpeaking || isUpdating} style={styles.fill} testID="assistant-proactive-play">
            <ButtonGlyph name="Play" />
            {isSpeaking ? t('aiAssistantsNative.proactive.speaking') : t('aiAssistantsNative.proactive.playSample')}
          </Button>
          <Button variant="outline" onPress={clearGreetingState} disabled={isUpdating} testID="assistant-proactive-reset">
            <ButtonGlyph name="RotateCcw" />
            {t('screens.assistant.resetSession')}
          </Button>
        </View>
      </PanelCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 24 },
  types: { gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1 },
  block: { gap: 4, padding: 16, borderRadius: 8 },
  buttons: { flexDirection: 'row', gap: 8 },
});
