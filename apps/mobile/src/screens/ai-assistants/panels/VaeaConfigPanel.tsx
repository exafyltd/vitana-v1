/**
 * VTID-05521 — `?tab=referrals`, the native twin of
 * `src/components/business/vaea/VaeaConfigPanel.tsx` over `GET` / `PUT
 * /vaea/config` (`useVaeaConfig`): a spinner while loading, the gateway's
 * error text in a destructive card, else "Your three switches" (receive /
 * give recommendations, make-money goal — disabled until give is on) and
 * "Autonomy & voice" (default autonomy select, disclosure text and expertise
 * zones with a Save button that appears once the field is edited). Each
 * write is one field, as on the web, with a spinner beside the switch that
 * is saving.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner, Switch, Text, TextInput, useUITheme } from '../../../ports/ui';
import { useI18n } from '../../../i18n/I18nProvider';
import { useVaeaConfig, type AutonomyMode, type VaeaConfig } from '../data/hooks';
import { Field, Hint, PanelCard } from '../components';

const AUTONOMY = [
  ['silent', 'screens.business.silentLogOnly'],
  ['draft_to_user', 'screens.business.draftMeDefault'],
  ['one_tap_approve', 'screens.business.onetapApprove'],
  ['auto_post', 'screens.business.autopost'],
] as const;

function SwitchRow({
  title,
  description,
  checked,
  onChange,
  saving,
  disabled,
  disabledHint,
  testID,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  saving?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  testID: string;
}): ReactElement {
  return (
    <View style={styles.switchRow}>
      <View style={styles.fill}>
        <Text size="sm" weight="500">
          {title}
        </Text>
        <Text size="xs" muted testID={`${testID}-description`}>
          {disabled ? disabledHint || description : description}
        </Text>
      </View>
      <View style={styles.switchSide}>
        {saving ? <Spinner /> : null}
        <Switch testID={testID} accessibilityLabel={title} checked={checked} onCheckedChange={onChange} disabled={disabled || saving} />
      </View>
    </View>
  );
}

function SaveField({
  label,
  hint,
  value,
  onSave,
  saving,
  placeholder,
  testID,
}: {
  label: string;
  hint: string;
  value: string;
  onSave: (v: string) => void;
  saving?: boolean;
  placeholder?: string;
  testID: string;
}): ReactElement {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const dirty = draft !== value;
  return (
    <Field label={label}>
      <TextInput testID={testID} accessibilityLabel={label} value={draft} onChangeText={setDraft} placeholder={placeholder} />
      <View style={styles.saveCol}>
        {dirty ? (
          <Button size="sm" onPress={() => onSave(draft)} disabled={saving} style={styles.saveButton} testID={`${testID}-save`}>
            {saving ? <Spinner /> : null}
            {t('screens.business.save')}
          </Button>
        ) : null}
        <Hint>{hint}</Hint>
      </View>
    </Field>
  );
}

export function VaeaConfigPanel(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { config, loading, error, update } = useVaeaConfig();
  const [saving, setSaving] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.loading} testID="assistant-referrals-loading">
        <Spinner />
      </View>
    );
  }

  if (error) {
    return (
      <Card testID="assistant-referrals-error" style={{ borderColor: colors.destructive }}>
        <CardContent style={styles.errorBody}>
          <Text size="sm" color={colors.destructive}>
            {error}
          </Text>
        </CardContent>
      </Card>
    );
  }

  const c = config;
  const setField = async <K extends keyof VaeaConfig>(key: K, value: VaeaConfig[K]) => {
    setSaving(key as string);
    try {
      await update({ [key]: value } as Partial<VaeaConfig>);
    } catch {
      // web: the rejection is unhandled and the field keeps its old value
    } finally {
      setSaving(null);
    }
  };
  const zones = c?.expertise_zones ?? [];

  return (
    <View style={styles.stack} testID="assistant-panel-referrals">
      <PanelCard title={t('screens.business.yourThreeSwitches')} description={t('screens.business.theseDecideWhatAutopilotCanDo')}>
        <SwitchRow
          testID="assistant-referrals-receive"
          title={t('screens.business.receiveRecommendations')}
          description={t('aiAssistantsNative.referrals.receiveDescription')}
          checked={c?.receive_recommendations ?? true}
          onChange={(v) => void setField('receive_recommendations', v)}
          saving={saving === 'receive_recommendations'}
        />
        <SwitchRow
          testID="assistant-referrals-give"
          title={t('screens.business.giveRecommendationsEarn')}
          description={t('aiAssistantsNative.referrals.giveDescription')}
          checked={c?.give_recommendations ?? false}
          onChange={(v) => void setField('give_recommendations', v)}
          saving={saving === 'give_recommendations'}
        />
        <SwitchRow
          testID="assistant-referrals-money"
          title={t('screens.business.goalMakeMoney')}
          description={t('aiAssistantsNative.referrals.moneyDescription')}
          checked={c?.make_money_goal ?? false}
          onChange={(v) => void setField('make_money_goal', v)}
          saving={saving === 'make_money_goal'}
          disabled={!c?.give_recommendations}
          disabledHint={t('aiAssistantsNative.referrals.moneyDisabledHint')}
        />
      </PanelCard>

      <PanelCard title={t('screens.business.autonomyVoice')} description={t('screens.business.howAutopilotPhrasesReferralRepliesWhen')}>
        <Field label={t('screens.business.defaultAutonomy')}>
          <Select value={c?.autonomy_default ?? 'draft_to_user'} onValueChange={(v) => void setField('autonomy_default', v as AutonomyMode)} disabled={saving === 'autonomy_default'}>
            <SelectTrigger testID="assistant-referrals-autonomy-trigger" accessibilityLabel={t('screens.business.defaultAutonomy')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent testID="assistant-referrals-autonomy">
              {AUTONOMY.map(([value, key]) => (
                <SelectItem key={value} value={value} testID={`assistant-referrals-autonomy-${value}`}>
                  {t(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Hint>{t('screens.business.eachListenerChannelCanOverrideThis')}</Hint>
        </Field>

        <SaveField
          testID="assistant-referrals-disclosure"
          label={t('screens.business.disclosureText')}
          hint={t('screens.business.appendedEveryDraftWithAffiliateLink')}
          value={c?.disclosure_text ?? ''}
          saving={saving === 'disclosure_text'}
          onSave={(v) => void setField('disclosure_text', v)}
        />

        <SaveField
          testID="assistant-referrals-expertise"
          label={t('screens.business.expertiseZones')}
          hint={t('screens.business.commaseparatedMessagesOutsideTheseTopicsGet')}
          placeholder={t('screens.business.eGLongevitySleepSupplements')}
          value={zones.join(', ')}
          saving={saving === 'expertise_zones'}
          onSave={(v) =>
            void setField(
              'expertise_zones',
              v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      </PanelCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  loading: { paddingVertical: 48, alignItems: 'center' },
  errorBody: { paddingTop: 16, paddingBottom: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  switchSide: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
  fill: { flex: 1, minWidth: 0, gap: 2 },
  saveCol: { gap: 8 },
  saveButton: { alignSelf: 'stretch' },
});
