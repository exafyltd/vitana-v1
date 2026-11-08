/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the campaign create / edit sheet, the
 * native twin of the web `CampaignDialog` four-step flow (basics → channels → template → smart
 * scheduling). It writes the same `campaigns` row: name, description, `target_channels` (an object
 * of enabled keys), `distribution_config` (template, frequency, smart scheduling, goal, best times)
 * and the tenant slug in `metadata`. Not ported in this lane, listed in the PR body: the cover-image
 * upload and the audience selector (CSV / manual contacts); an edit keeps the stored cover image and
 * audience untouched.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Switch, Text, TextInput, Textarea, notify, notifyError, useUITheme } from '../../ports/ui';
import { CHANNEL_BEST_TIMES, DISTRIBUTION_TEMPLATES } from '../../ports/sharing';
import { useI18n } from '../../i18n/I18nProvider';
import { useTenant } from '../../identity/TenantProvider';
import { Chip, ChipRow, Field, SheetActions, SheetScroll, SwitchRow } from './components';
import { currentUserId, useActivateAllPosts, useCampaigns, useChannels } from './data/hooks';
import { isChannelConnected, POST_CHANNELS, targetChannelKeys, type CampaignRow } from './rules';

const GOALS = [
  ['awareness', 'screens.sharing.awareness'],
  ['engagement', 'screens.sharing.engagement'],
  ['event_promotion', 'screens.sharing.eventPromotion'],
  ['community_growth', 'screens.sharing.communityGrowth'],
  ['sales', 'screens.sharing.sales'],
] as const;

const TOTAL_STEPS = 4;

export function CampaignSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: CampaignRow | null }): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { tenant } = useTenant();
  const { createCampaign, updateCampaign, activateCampaign } = useCampaigns();
  const activateAll = useActivateAllPosts();
  const { channels } = useChannels();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [template, setTemplate] = useState('custom');
  const [smart, setSmart] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const cfg = (editing?.distribution_config ?? {}) as Record<string, unknown>;
    setStep(1);
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setGoal(typeof cfg.goal === 'string' ? cfg.goal : '');
    setSelected(Object.fromEntries(targetChannelKeys(editing?.target_channels).map((k) => [k, true])));
    setTemplate(typeof cfg.template_id === 'string' ? cfg.template_id : 'custom');
    setSmart(typeof cfg.smart_scheduling_enabled === 'boolean' ? cfg.smart_scheduling_enabled : true);
    setBusy(false);
  }, [open, editing]);

  const chosenKeys = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => k), [selected]);
  if (!open) return null;

  const isEdit = !!editing;
  const canProceed = step === 1 ? name.trim() !== '' : step === 2 ? chosenKeys.length > 0 : template !== '';

  const pickTemplate = (id: string) => {
    setTemplate(id);
    const suggested = DISTRIBUTION_TEMPLATES.find((x) => x.id === id)?.suggestedChannels ?? [];
    if (chosenKeys.length === 0 && suggested.length > 0) setSelected(Object.fromEntries(suggested.map((k) => [k, true])));
  };

  const payload = async () => {
    const user_id = await currentUserId();
    const tpl = DISTRIBUTION_TEMPLATES.find((x) => x.id === template);
    const previous = (editing?.distribution_config ?? {}) as Record<string, unknown>;
    return {
      user_id,
      name,
      description,
      status: editing?.status ?? 'draft',
      cover_image_url: editing?.cover_image_url ?? null,
      target_channels: selected,
      metadata: { ...(editing?.metadata ?? {}), tenant_slug: tenant?.slug ?? null },
      distribution_config: {
        ...previous,
        template_id: template,
        frequency: tpl?.frequency ?? 'weekly',
        smart_scheduling_enabled: smart,
        goal,
        best_times: Object.fromEntries(chosenKeys.map((k) => [k, CHANNEL_BEST_TIMES[k] ?? []])),
      },
    };
  };

  const save = async (): Promise<string | null> => {
    const data = await payload();
    if (editing) {
      await updateCampaign.mutateAsync({ id: editing.id, ...data });
      return editing.id;
    }
    const created = await createCampaign.mutateAsync(data);
    return created.id;
  };

  const submit = async () => {
    setBusy(true);
    try {
      await save();
      onClose();
    } catch {
      // The mutation already raised its error toast.
    } finally {
      setBusy(false);
    }
  };

  const saveAndActivate = async () => {
    setBusy(true);
    try {
      const id = await save();
      if (!id) throw new Error('save failed');
      await activateCampaign.mutateAsync(id);
      try {
        await activateAll.mutateAsync(id);
      } catch {
        // No draft posts to activate is fine.
      }
      notify('toasts.sharing.campaignSavedActivated');
      onClose();
    } catch {
      notifyError('toasts.sharing.failedActivateCampaign');
    } finally {
      setBusy(false);
    }
  };

  const stepTitles = [t('sharingNative.campaign.stepBasics'), t('sharingNative.campaign.stepChannels'), t('sharingNative.campaign.stepTemplate'), t('sharingNative.campaign.stepSchedule')];
  const tplKey = (id: string, field: 'name' | 'description') => `sharingNative.templates.${id}.${field}`;

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? t('sharingNative.campaign.editTitle') : t('sharingNative.campaign.createTitle')} testID="campaign-sheet">
      <Text variant="caption" muted testID="campaign-step">
        {t('sharingNative.campaign.stepOf', { current: step, total: TOTAL_STEPS })} · {stepTitles[step - 1]}
      </Text>
      <SheetScroll>
        {step === 1 ? (
          <>
            <Field label={t('screens.sharing.campaignName')}>
              <TextInput value={name} onChangeText={setName} placeholder={t('screens.sharing.eGSummerLaunch2025')} accessibilityLabel={t('screens.sharing.campaignName')} testID="campaign-name" />
            </Field>
            <Field label={t('screens.sharing.description')} hint={t('screens.sharing.describeYourCampaignOneSentenceWho')}>
              <Textarea value={description} onChangeText={setDescription} rows={3} placeholder={t('screens.sharing.eGMultichannelPromotionForOur')} accessibilityLabel={t('screens.sharing.description')} testID="campaign-description" />
            </Field>
            <Field label={t('screens.sharing.campaignGoalOptional')} hint={t('screens.sharing.helpsAutopilotOptimizeYourPostingStrategy')}>
              <ChipRow>
                {GOALS.map(([value, key]) => (
                  <Chip key={value} role="radio" label={t(key)} selected={goal === value} onPress={() => setGoal(goal === value ? '' : value)} testID={`campaign-goal-${value}`} />
                ))}
              </ChipRow>
            </Field>
          </>
        ) : null}
        {step === 2 ? (
          <Field label={t('screens.sharing.selectChannels')} hint={t('screens.sharing.connectYourAccountsAutopublishYourCampaign')}>
            <ChipRow>
              {POST_CHANNELS.map((c) => (
                <Chip
                  key={c.key}
                  role="checkbox"
                  label={isChannelConnected(channels, c.key) ? `${c.name} · ${t('screens.sharing.connected')}` : c.name}
                  selected={!!selected[c.key]}
                  onPress={() => setSelected((s) => ({ ...s, [c.key]: !s[c.key] }))}
                  testID={`campaign-channel-${c.key}`}
                />
              ))}
            </ChipRow>
          </Field>
        ) : null}
        {step === 3 ? (
          <Field label={t('sharingNative.campaign.stepTemplate')}>
            <View style={styles.templates}>
              {DISTRIBUTION_TEMPLATES.map((tpl) => {
                const active = template === tpl.id;
                return (
                  <Chip
                    key={tpl.id}
                    role="radio"
                    label={`${tpl.icon} ${t(tplKey(tpl.id, 'name'))}`}
                    selected={active}
                    onPress={() => pickTemplate(tpl.id)}
                    testID={`campaign-template-${tpl.id}`}
                  />
                );
              })}
            </View>
            <Text variant="caption" muted>
              {t(tplKey(template, 'description'))}
            </Text>
          </Field>
        ) : null}
        {step === 4 ? (
          <>
            <SwitchRow
              title={t('screens.sharing.smartSchedulingEnabled')}
              description={t('screens.sharing.aiSchedulingActive')}
              control={<Switch checked={smart} onCheckedChange={setSmart} accessibilityLabel={t('screens.sharing.smartSchedulingEnabled')} testID="campaign-smart" />}
            />
            <View style={[styles.summary, { backgroundColor: colors.muted }]}>
              <Text weight="700">{name}</Text>
              {description ? <Text muted>{description}</Text> : null}
              <Text variant="caption" muted>
                {POST_CHANNELS.filter((c) => selected[c.key]).map((c) => c.name).join(', ')}
              </Text>
            </View>
          </>
        ) : null}
      </SheetScroll>
      <SheetActions>
        <Button variant="outline" onPress={() => (step === 1 ? onClose() : setStep(step - 1))} disabled={busy} testID="campaign-back">
          {step === 1 ? t('screens.sharing.cancel') : t('screens.sharing.back')}
        </Button>
        {step < TOTAL_STEPS ? (
          <Button onPress={() => canProceed && setStep(step + 1)} disabled={!canProceed} testID="campaign-next">
            {t('screens.sharing.continue')}
          </Button>
        ) : isEdit && editing?.status === 'draft' ? (
          <>
            <Button variant="outline" onPress={() => void submit()} disabled={busy} testID="campaign-save">
              {t('sharingNative.campaign.saveDraft')}
            </Button>
            <Button onPress={() => void saveAndActivate()} disabled={busy} testID="campaign-save-activate">
              {t('sharingNative.campaign.saveActivate')}
            </Button>
          </>
        ) : (
          <Button onPress={() => void submit()} disabled={busy} testID="campaign-save">
            {isEdit ? t('sharingNative.campaign.update') : t('screens.sharing.createCampaign')}
          </Button>
        )}
      </SheetActions>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summary: { borderRadius: 12, padding: 12, gap: 6 },
});
