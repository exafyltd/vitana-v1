/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the small sheets of the campaign and
 * posting flows, native twins of the web dialogs `ScheduleDialog`, `ActivateCampaignDialog`,
 * `CreatePostDialog` and `DeleteCampaignDialog`, as kit bottom sheets. Dates come from the device
 * date field (`getChatDevice().DateTimeField`), so Android and iOS use their own pickers.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, TextInput, Textarea, notify, notifyError, useUITheme } from '../../ports/ui';
import { getChatDevice } from '../../ports/chat-device';
import { useI18n } from '../../i18n/I18nProvider';
import { Chip, ChipRow, Field, SheetActions, SheetScroll } from './components';
import { formatDayTime } from './format';
import { POST_CHANNELS } from './rules';
import { currentUserId, useDistributionPosts, useScheduledPosts } from './data/hooks';

/** Today at 12:00, or an hour from now when noon has passed (the web sheet opens on today at 12:00). */
function defaultWhen(): Date {
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);
  return noon.getTime() > Date.now() ? noon : new Date(Date.now() + 3_600_000);
}

function WhenField({ value, onChange, testID }: { value: Date; onChange: (d: Date) => void; testID: string }): ReactElement {
  const { t, locale } = useI18n();
  const { DateTimeField } = getChatDevice();
  return <DateTimeField value={value} mode="datetime" onChange={onChange} placeholder={t('screens.sharing.selectDate')} display={formatDayTime(value, locale)} minimumDate={new Date()} testID={testID} />;
}

// ── schedule ─────────────────────────────────────────────────────────────
export function ScheduleSheet({ open, onClose, onConfirm, isLoading }: { open: boolean; onClose: () => void; onConfirm: (when: Date) => void; isLoading?: boolean }): ReactElement | null {
  const { t } = useI18n();
  const [when, setWhen] = useState<Date>(defaultWhen);
  useEffect(() => {
    if (open) setWhen(defaultWhen());
  }, [open]);
  if (!open) return null;
  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.schedulePost')} testID="schedule-sheet">
      <Text muted>{t('screens.sharing.chooseWhenYouWantThisPost')}</Text>
      <Field label={t('screens.sharing.scheduleDateTime')}>
        <WhenField value={when} onChange={setWhen} testID="schedule-date" />
      </Field>
      <SheetActions>
        <Button variant="outline" onPress={onClose} disabled={isLoading} testID="schedule-cancel">
          {t('screens.sharing.cancel')}
        </Button>
        <Button onPress={() => onConfirm(when)} disabled={isLoading} testID="schedule-confirm">
          {t('screens.sharing.schedulePost')}
        </Button>
      </SheetActions>
    </BottomSheet>
  );
}

// ── activate ─────────────────────────────────────────────────────────────
export function ActivateSheet({
  open,
  onClose,
  onConfirm,
  isLoading,
  postsCount,
  draftCount,
  channelNames,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: 'instant' | 'scheduled', when?: Date) => void;
  isLoading?: boolean;
  postsCount: number;
  draftCount: number;
  channelNames: string[];
}): ReactElement | null {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const [mode, setMode] = useState<'instant' | 'scheduled'>('instant');
  const [when, setWhen] = useState<Date>(defaultWhen);
  useEffect(() => {
    if (open) {
      setMode('instant');
      setWhen(defaultWhen());
    }
  }, [open]);
  if (!open) return null;
  const row = (label: string, value: string | number) => (
    <View style={styles.spread}>
      <Text size="sm" muted>
        {label}
      </Text>
      <Text weight="700">{value}</Text>
    </View>
  );
  return (
    <BottomSheet open={open} onClose={onClose} title={t('screens.sharing.activateCampaign')} testID="activate-sheet">
      <SheetScroll>
        <Text muted>{postsCount > 0 ? t('sharingNative.activate.description') : t('sharingNative.activate.descriptionNoPosts')}</Text>
        <View style={[styles.summary, { backgroundColor: colors.muted }]}>
          {postsCount > 0 ? (
            <>
              {row(t('screens.sharing.totalPosts'), postsCount)}
              {row(t('screens.sharing.draftPosts'), draftCount)}
              {row(t('screens.sharing.readyPublish'), draftCount)}
            </>
          ) : (
            <>
              {row(t('screens.sharing.selectedChannels'), channelNames.length)}
              {channelNames.length > 0 ? (
                <Text variant="caption" muted>
                  {channelNames.join(', ')}
                </Text>
              ) : null}
            </>
          )}
        </View>
        <ChipRow label={t('screens.sharing.activateCampaign')}>
          <Chip role="radio" label={t('screens.sharing.activateNow')} selected={mode === 'instant'} onPress={() => setMode('instant')} testID="activate-mode-instant" />
          <Chip role="radio" label={t('screens.sharing.scheduleForLater')} selected={mode === 'scheduled'} onPress={() => setMode('scheduled')} testID="activate-mode-scheduled" />
        </ChipRow>
        <Text variant="caption" muted>
          {mode === 'instant'
            ? postsCount > 0
              ? t('sharingNative.activate.instantHint')
              : t('sharingNative.activate.instantHintNoPosts')
            : t('screens.sharing.pickSpecificDateTimeActivateCampaign')}
        </Text>
        {mode === 'scheduled' ? (
          <Field label={t('screens.sharing.scheduleDateTime')}>
            <WhenField value={when} onChange={setWhen} testID="activate-date" />
            <Text variant="caption" muted>
              {t('sharingNative.activate.willActivate', { when: formatDayTime(when, locale) })}
            </Text>
          </Field>
        ) : null}
      </SheetScroll>
      <SheetActions>
        <Button variant="outline" onPress={onClose} disabled={isLoading} testID="activate-cancel">
          {t('screens.sharing.cancel')}
        </Button>
        <Button onPress={() => (mode === 'scheduled' ? onConfirm('scheduled', when) : onConfirm('instant'))} disabled={isLoading} testID="activate-confirm">
          {t('screens.sharing.activateCampaign')}
        </Button>
      </SheetActions>
    </BottomSheet>
  );
}

// ── delete ───────────────────────────────────────────────────────────────
export function DeleteCampaignSheet({ open, name, onClose, onConfirm, isLoading }: { open: boolean; name: string; onClose: () => void; onConfirm: () => void; isLoading?: boolean }): ReactElement | null {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <BottomSheet open={open} onClose={onClose} title={t('sharingNative.delete.title')} testID="campaign-delete-sheet">
      <Text muted>{t('sharingNative.delete.body', { name })}</Text>
      <SheetActions>
        <Button variant="outline" onPress={onClose} disabled={isLoading} testID="campaign-delete-cancel">
          {t('screens.sharing.cancel')}
        </Button>
        <Button variant="destructive" onPress={onConfirm} disabled={isLoading} testID="campaign-delete-confirm">
          {t('screens.sharing.delete')}
        </Button>
      </SheetActions>
    </BottomSheet>
  );
}

// ── create post ──────────────────────────────────────────────────────────
export const ENTITY_TYPES = [
  ['event', 'screens.sharing.event'],
  ['meetup', 'screens.sharing.meetup'],
  ['group', 'screens.sharing.group'],
  ['live-room', 'screens.sharing.liveRoom'],
  ['profile', 'screens.sharing.profile'],
] as const;

export function CreatePostSheet({ open, onClose, campaignId, campaignName, targetChannels }: { open: boolean; onClose: () => void; campaignId: string; campaignName: string; targetChannels: string[] }): ReactElement | null {
  const { t } = useI18n();
  const { createPost, blastNow } = useDistributionPosts();
  const { schedulePost } = useScheduledPosts();
  const [entityType, setEntityType] = useState<string>('event');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<string[]>(targetChannels);
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setEntityType('event');
      setTitle('');
      setDescription('');
      setPicked(targetChannels);
      setPendingPostId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the sheet opens
  }, [open]);
  if (!open) return null;

  const toggle = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  const base = async () => {
    let userId: string;
    try {
      userId = await currentUserId();
    } catch {
      notifyError('toasts.sharing.notAuthenticated', 'toasts.sharing.pleaseLogCreatePosts');
      return null;
    }
    if (!title || !description) {
      notifyError('toasts.sharing.missingFields', 'toasts.sharing.pleaseFillTitleDescription');
      return null;
    }
    return { user_id: userId, title, content: description, description, entity_type: entityType, channels: picked, status: 'draft' as const, campaign_id: campaignId };
  };
  const needChannel = () => {
    if (picked.length > 0) return false;
    notifyError('toasts.sharing.noChannelsSelected', 'toasts.sharing.pleaseSelectAtLeastOneChannel2');
    return true;
  };

  const saveDraft = async () => {
    const post = await base();
    if (!post) return;
    await createPost.mutateAsync(post);
    notify('toasts.sharing.postSavedAsDraft');
    onClose();
  };
  const blast = async () => {
    const post = await base();
    if (!post || needChannel()) return;
    const created = await createPost.mutateAsync(post);
    await blastNow.mutateAsync(created.id);
    onClose();
  };
  const schedule = async () => {
    const post = await base();
    if (!post || needChannel()) return;
    const created = await createPost.mutateAsync(post);
    setPendingPostId(created.id);
  };
  const confirmSchedule = async (when: Date) => {
    if (!pendingPostId) return;
    const user_id = await currentUserId();
    await schedulePost.mutateAsync({ post_id: pendingPostId, user_id, scheduled_for: when.toISOString(), channels: picked });
    setPendingPostId(null);
    onClose();
  };

  return (
    <>
      <BottomSheet open={open && !pendingPostId} onClose={onClose} title={t('screens.sharing.createPost')} testID="create-post-sheet">
        <SheetScroll>
          <Text muted>
            {t('screens.sharing.createNewPostForCampaign')} {campaignName}
          </Text>
          <Field label={t('screens.sharing.whatYouSharing')}>
            <ChipRow>
              {ENTITY_TYPES.map(([value, key]) => (
                <Chip key={value} role="radio" label={t(key)} selected={entityType === value} onPress={() => setEntityType(value)} testID={`post-entity-${value}`} />
              ))}
            </ChipRow>
          </Field>
          <Field label={t('screens.sharing.title')}>
            <TextInput value={title} onChangeText={setTitle} placeholder={t('screens.sharing.enterCompellingTitle')} accessibilityLabel={t('screens.sharing.title')} testID="post-title" />
          </Field>
          <Field label={t('screens.sharing.description')}>
            <Textarea value={description} onChangeText={setDescription} rows={4} placeholder={t('screens.sharing.writeYourMessage')} accessibilityLabel={t('screens.sharing.description')} testID="post-description" />
          </Field>
          <Field label={t('screens.sharing.selectChannels')}>
            <ChipRow>
              {POST_CHANNELS.map((c) => (
                <Chip key={c.key} role="checkbox" label={c.name} selected={picked.includes(c.key)} onPress={() => toggle(c.key)} testID={`post-channel-${c.key}`} />
              ))}
            </ChipRow>
          </Field>
        </SheetScroll>
        <SheetActions>
          <Button variant="outline" onPress={() => void saveDraft()} disabled={createPost.isPending} testID="post-save-draft">
            {t('screens.sharing.saveAsDraft')}
          </Button>
          <Button variant="outline" onPress={() => void schedule()} disabled={createPost.isPending} testID="post-schedule">
            {t('screens.sharing.schedule')}
          </Button>
          <Button onPress={() => void blast()} disabled={createPost.isPending} testID="post-blast">
            {t('screens.sharing.blastNow')}
          </Button>
        </SheetActions>
      </BottomSheet>
      <ScheduleSheet open={!!pendingPostId} onClose={() => setPendingPostId(null)} onConfirm={(when) => void confirmSchedule(when)} isLoading={schedulePost.isPending} />
    </>
  );
}

const styles = StyleSheet.create({
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  summary: { borderRadius: 12, padding: 12, gap: 8 },
});
