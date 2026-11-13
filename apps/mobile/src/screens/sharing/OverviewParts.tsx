/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the panels of the Sharing overview, native
 * twins of the web `BlastCenter`, `ChannelConnector`, `GrowthKPIs`, `NextScheduledPosts` and
 * `AnalyticsDashboard` (mobile-web layout: one column). Class B data access lives in `./data/hooks`.
 * The growth KPIs are the web's fixed sample figures (it renders mock numbers); the analytics panel
 * shows the aggregated totals and rates in place of the web charts (recharts has no native twin).
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, Textarea, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { Chip, ChipRow, EmptyBlock, Field, Panel, StatusBadge, layout } from './components';
import { ScheduleSheet, ENTITY_TYPES } from './sheets';
import { formatDayTime } from './format';
import { aggregateAnalytics, isChannelConnected, MESSAGING_CHANNELS, percent, SOCIAL_CHANNELS, targetChannelKeys } from './rules';
import { currentUserId, useCampaigns, useChannels, useDistributionPosts, usePostAnalytics, useScheduledPosts } from './data/hooks';

// ── blast center ─────────────────────────────────────────────────────────
export function BlastCenter(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { channels, isLoading: channelsLoading } = useChannels();
  const { campaigns } = useCampaigns();
  const { createPost, blastNow } = useDistributionPosts();
  const { schedulePost } = useScheduledPosts();
  const [picked, setPicked] = useState<string[]>([]);
  const [entityType, setEntityType] = useState('event');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [pendingPostId, setPendingPostId] = useState<string | null>(null);

  const selectedCampaign = campaigns?.find((c) => c.id === campaignId);
  const config = (selectedCampaign?.distribution_config ?? {}) as { frequency?: string; smart_scheduling_enabled?: boolean };
  const campaignChannels = targetChannelKeys(selectedCampaign?.target_channels);
  const types = () => picked.map((id) => channels?.find((c) => c.id === id)?.channel_type).filter(Boolean) as string[];
  const busy = createPost.isPending || blastNow.isPending;

  const toggle = (id: string) => {
    if (!channels?.find((c) => c.id === id)?.is_connected) {
      notifyError('toasts.sharing.channelNotConnected');
      return;
    }
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const reset = () => {
    setTitle('');
    setDescription('');
    setPicked([]);
    setCampaignId('');
  };
  const ready = async (authKey: string, needChannel: boolean): Promise<string | null> => {
    let userId: string;
    try {
      userId = await currentUserId();
    } catch {
      notifyError('toasts.sharing.notAuthenticated', authKey);
      return null;
    }
    if (!title || !description) {
      notifyError('toasts.sharing.missingFields', 'toasts.sharing.pleaseFillTitleDescription');
      return null;
    }
    if (needChannel && picked.length === 0) {
      notifyError('toasts.sharing.noChannelsSelected', authKey === 'toasts.sharing.pleaseLogSchedulePosts' ? 'toasts.sharing.pleaseSelectAtLeastOneChannel2' : 'toasts.sharing.pleaseSelectAtLeastOneChannel');
      return null;
    }
    return userId;
  };
  const draft = (userId: string) => ({
    user_id: userId,
    title,
    content: description,
    description,
    entity_type: entityType,
    channels: types(),
    status: 'draft' as const,
    campaign_id: campaignId || null,
  });

  const blast = async () => {
    const userId = await ready('toasts.sharing.pleaseLogBlastPosts', true);
    if (!userId) return;
    try {
      const post = await createPost.mutateAsync(draft(userId));
      await blastNow.mutateAsync(post.id);
      reset();
    } catch {
      // The mutation already raised its error toast.
    }
  };
  const saveDraft = async () => {
    const userId = await ready('toasts.sharing.pleaseLogSaveDrafts', false);
    if (!userId) return;
    try {
      await createPost.mutateAsync(draft(userId));
    } catch {
      // The mutation already raised its error toast.
    }
  };
  const schedule = async () => {
    const userId = await ready('toasts.sharing.pleaseLogSchedulePosts', true);
    if (!userId) return;
    try {
      const post = await createPost.mutateAsync(draft(userId));
      setPendingPostId(post.id);
    } catch {
      // The mutation already raised its error toast.
    }
  };
  const confirmSchedule = async (when: Date) => {
    if (!pendingPostId) return;
    try {
      const user_id = await currentUserId();
      await schedulePost.mutateAsync({ post_id: pendingPostId, user_id, scheduled_for: when.toISOString(), channels: types() });
      reset();
      setPendingPostId(null);
    } catch {
      // The mutation already raised its error toast.
    }
  };

  return (
    <Panel title={t('screens.sharing.blastCenter')} description={t('screens.sharing.shareYourContentAcrossMultipleChannels')} testID="blast-center">
      <Field label={t('screens.sharing.whatYouSharing')}>
        <ChipRow>
          {ENTITY_TYPES.map(([value, key]) => (
            <Chip key={value} role="radio" label={t(key)} selected={entityType === value} onPress={() => setEntityType(value)} testID={`blast-entity-${value}`} />
          ))}
        </ChipRow>
      </Field>
      <Field label={t('screens.sharing.campaignOptional')}>
        <ChipRow>
          <Chip role="radio" label={t('screens.sharing.noCampaignSelected')} selected={!campaignId} onPress={() => setCampaignId('')} testID="blast-campaign-none" />
          {(campaigns ?? []).map((c) => (
            <Chip key={c.id} role="radio" label={c.name} selected={campaignId === c.id} onPress={() => setCampaignId(c.id)} testID={`blast-campaign-${c.id}`} />
          ))}
        </ChipRow>
        {selectedCampaign ? (
          <View style={[styles.hint, { backgroundColor: colors.muted }]} testID="blast-campaign-hint">
            <Text size="sm" weight="600">
              {t('screens.sharing.campaignName', { name: selectedCampaign.name })}
            </Text>
            {config.frequency ? (
              <Text variant="caption" muted>
                {t('screens.sharing.frequencyFrequency', { frequency: config.frequency })}
              </Text>
            ) : null}
            {config.smart_scheduling_enabled ? (
              <Text variant="caption" muted>
                {`✨ ${t('screens.sharing.smartSchedulingEnabled')}`}
              </Text>
            ) : null}
            {campaignChannels.length > 0 ? (
              <Text variant="caption" muted>
                {t('screens.sharing.channelsValue0', { value0: campaignChannels.join(', ') })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Field>
      <Field label={t('screens.sharing.title')}>
        <TextInput value={title} onChangeText={setTitle} placeholder={t('screens.sharing.enterCompellingTitle')} accessibilityLabel={t('screens.sharing.title')} testID="blast-title" />
      </Field>
      <Field label={t('screens.sharing.description')}>
        <Textarea value={description} onChangeText={setDescription} rows={4} placeholder={t('screens.sharing.writeYourMessage')} accessibilityLabel={t('screens.sharing.description')} testID="blast-description" />
      </Field>
      <Field label={t('screens.sharing.selectChannels')}>
        {channelsLoading ? (
          <Text muted>{t('common.loading')}</Text>
        ) : channels && channels.length > 0 ? (
          <ChipRow>
            {channels.map((c) => (
              <Chip
                key={c.id}
                role="checkbox"
                label={`${c.is_connected && c.is_active ? '✓' : '!'} ${c.channel_name ?? c.channel_type}`}
                selected={picked.includes(c.id)}
                onPress={() => toggle(c.id)}
                testID={`blast-channel-${c.id}`}
              />
            ))}
          </ChipRow>
        ) : (
          <EmptyBlock testID="blast-channels-empty" title={t('screens.sharing.noChannelsConnectedYet')} body={t('screens.sharing.goIntegrationsConnectChannels')} />
        )}
      </Field>
      <View style={[styles.credits, { backgroundColor: colors.statusSuccessSubtle }]}>
        <Text size="sm" style={{ color: colors.statusSuccess }}>
          {t('screens.sharing.postNowEarn5Credits')}
        </Text>
      </View>
      <View style={layout.row}>
        <Button onPress={() => void blast()} disabled={busy} testID="blast-now">
          {t('screens.sharing.blastNow')}
        </Button>
        <Button variant="outline" onPress={() => void schedule()} disabled={createPost.isPending} testID="blast-schedule">
          {t('screens.sharing.schedule')}
        </Button>
        <Button variant="outline" onPress={() => void saveDraft()} disabled={createPost.isPending} accessibilityLabel={t('screens.sharing.saveAsDraft')} testID="blast-save-draft">
          {t('screens.sharing.saveAsDraft')}
        </Button>
      </View>
      <ScheduleSheet open={!!pendingPostId} onClose={() => setPendingPostId(null)} onConfirm={(when) => void confirmSchedule(when)} isLoading={schedulePost.isPending} />
    </Panel>
  );
}

// ── channel connector ────────────────────────────────────────────────────
export function ChannelConnector(): ReactElement {
  const { t } = useI18n();
  const { channels, connectChannel, disconnectChannel } = useChannels();
  const [connecting, setConnecting] = useState<string[]>([]);

  const connect = async (type: string, name: string) => {
    setConnecting((p) => [...p, type]);
    try {
      await connectChannel.mutateAsync({ channel_type: type, channel_name: name });
    } catch {
      // The mutation already raised its error toast.
    } finally {
      setConnecting((p) => p.filter((x) => x !== type));
    }
  };
  const rowOf = (type: string) => channels?.find((c) => c.is_connected && (c.channel_type === type || c.channel_name?.toLowerCase() === type.toLowerCase()));

  return (
    <View style={layout.stack}>
      <Panel title={t('screens.sharing.distributionChannels')} description={t('screens.sharing.connectMessagingChannelsForDirectDistribution')} testID="channel-connector">
        {MESSAGING_CHANNELS.map((ch) => {
          const row = rowOf(ch.type);
          const connected = isChannelConnected(channels?.filter((c) => c.is_connected), ch.type);
          return (
            <View key={ch.type} style={layout.spread}>
              <View style={layout.fill}>
                <Text weight="600">{ch.name}</Text>
                {connected ? (
                  <Text variant="caption" muted testID={`channel-connected-${ch.type}`}>
                    {`✓ ${t('screens.sharing.connected')}`}
                  </Text>
                ) : (
                  <Text variant="caption" muted>
                    {t('screens.sharing.notConnected')}
                  </Text>
                )}
              </View>
              {connected ? (
                <Button size="sm" variant="outline" onPress={() => row && disconnectChannel.mutate(row.id)} disabled={!row || disconnectChannel.isPending} testID={`channel-disconnect-${ch.type}`}>
                  {t('buttons.disconnect')}
                </Button>
              ) : (
                <Button size="sm" onPress={() => void connect(ch.type, ch.name)} disabled={connecting.includes(ch.type)} testID={`channel-connect-${ch.type}`}>
                  {t('screens.sharing.connect')}
                </Button>
              )}
            </View>
          );
        })}
      </Panel>
      <Panel title={t('screens.sharing.socialMedia')} description={t('screens.sharing.socialPlatformsRequireApiIntegrationComing')} testID="social-channels">
        {SOCIAL_CHANNELS.map((ch) => (
          <View key={ch.key} style={layout.spread}>
            <Text weight="600">{ch.name}</Text>
            <Text variant="caption" muted testID={`social-${ch.key}`}>
              {isChannelConnected(channels?.filter((c) => c.is_connected), ch.key) ? `✓ ${t('screens.sharing.connected')}` : t('screens.sharing.comingSoon')}
            </Text>
          </View>
        ))}
      </Panel>
    </View>
  );
}

// ── growth KPIs (the web's fixed sample figures) ─────────────────────────
const KPIS = [
  { key: 'reach', value: '12.4K', change: '+23%' },
  { key: 'clicks', value: '3,247', change: '+18%' },
  { key: 'ctr', value: '4.2%', change: '+0.8%' },
  { key: 'revenue', value: '$842', change: '+31%' },
] as const;

export function GrowthKpis(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <Panel title={t('screens.sharing.growthKpis')} description={t('screens.sharing.last7DaysPerformance')} testID="growth-kpis">
      <View style={styles.kpiGrid}>
        {KPIS.map((k) => (
          <View key={k.key} style={styles.kpi}>
            <Text variant="caption" muted>
              {t(`sharingNative.kpi.${k.key}`)}
            </Text>
            <Text variant="title">{k.value}</Text>
            <Text variant="caption" weight="600" style={{ color: colors.statusSuccess }}>
              {k.change}
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.hint, { backgroundColor: colors.muted }]}>
        <Text size="sm" weight="600">
          {t('screens.sharing.bestTimePostToday')}
        </Text>
        <Text size="sm" muted>
          {t('screens.sharing.text900Am1100')}
        </Text>
      </View>
    </Panel>
  );
}

// ── automation queue ─────────────────────────────────────────────────────
export function ScheduledQueue(): ReactElement {
  const { t, locale } = useI18n();
  const { scheduledPosts, isLoading, pauseScheduled, resumeScheduled, cancelScheduled } = useScheduledPosts();
  const rows = scheduledPosts ?? [];
  return (
    <Panel title={t('screens.sharing.automationQueue')} description={t('screens.sharing.nextScheduledPosts')} testID="scheduled-queue">
      {isLoading ? (
        <Text muted>{t('common.loading')}</Text>
      ) : rows.length === 0 ? (
        <EmptyBlock testID="scheduled-empty" title={t('screens.sharing.noScheduledPostsYet')} />
      ) : (
        rows.map((row) => {
          const post = row.distribution_posts;
          const paused = row.status === 'paused';
          return (
            <View key={row.id} style={styles.queueRow} testID={`scheduled-row-${row.id}`}>
              <View style={layout.spread}>
                <Text weight="700" style={layout.fill}>
                  {post?.title || t('sharingNative.queue.untitled')}
                </Text>
                {paused ? <StatusBadge status="paused" /> : null}
              </View>
              <Text size="sm" muted numberOfLines={2}>
                {post?.description || post?.content || t('sharingNative.queue.noDescription')}
              </Text>
              <Text variant="caption" muted>
                {formatDayTime(row.scheduled_for, locale)}
              </Text>
              {row.channels && row.channels.length > 0 ? (
                <Text variant="caption" muted>
                  {row.channels.join(', ')}
                </Text>
              ) : null}
              <View style={layout.row}>
                {paused ? (
                  <Button size="sm" variant="outline" onPress={() => resumeScheduled.mutate(row.id)} testID={`scheduled-resume-${row.id}`}>
                    {t('screens.sharing.resume')}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onPress={() => pauseScheduled.mutate(row.id)} testID={`scheduled-pause-${row.id}`}>
                    {t('screens.sharing.pause')}
                  </Button>
                )}
                <Button size="sm" variant="outline" onPress={() => cancelScheduled.mutate(row.id)} testID={`scheduled-cancel-${row.id}`}>
                  {t('screens.sharing.cancel')}
                </Button>
              </View>
            </View>
          );
        })
      )}
    </Panel>
  );
}

// ── analytics ────────────────────────────────────────────────────────────
export function AnalyticsPanel(): ReactElement {
  const { t } = useI18n();
  const { data, isLoading } = usePostAnalytics();
  if (isLoading) {
    return (
      <Panel testID="analytics-loading">
        <Text muted>{t('common.loading')}</Text>
      </Panel>
    );
  }
  if (!data || data.length === 0) {
    return (
      <Panel testID="analytics-empty">
        <Text weight="700">{t('screens.sharing.noAnalyticsDataYet')}</Text>
        <Text muted>{t('screens.sharing.startBlastingPostsSeeYourPerformance')}</Text>
      </Panel>
    );
  }
  const { totals, byChannel } = aggregateAnalytics(data);
  const stats: Array<[string, string, number | string]> = [
    ['sent', t('sharingNative.analytics.sent'), totals.totalSent],
    ['delivered', t('screens.sharing.delivered'), totals.totalDelivered],
    ['opened', t('screens.sharing.opened'), totals.totalOpened],
    ['clicked', t('sharingNative.analytics.clicked'), totals.totalClicked],
    ['responded', t('sharingNative.analytics.responded'), totals.totalResponded],
    ['revenue', t('sharingNative.kpi.revenue'), `$${totals.totalRevenue.toFixed(2)}`],
  ];
  const rates: Array<[string, string, string, string]> = [
    ['delivery-rate', t('screens.sharing.deliveryRate'), percent(totals.totalDelivered, totals.totalSent), t('screens.sharing.totaldeliveredTotalsentSent', { totalDelivered: totals.totalDelivered, totalSent: totals.totalSent })],
    ['open-rate', t('screens.sharing.openRate'), percent(totals.totalOpened, totals.totalDelivered), t('screens.sharing.totalopenedTotaldeliveredDelivered', { totalOpened: totals.totalOpened, totalDelivered: totals.totalDelivered })],
    ['click-rate', t('screens.sharing.clickRate'), percent(totals.totalClicked, totals.totalOpened), t('screens.sharing.totalclickedTotalopenedOpened', { totalClicked: totals.totalClicked, totalOpened: totals.totalOpened })],
  ];
  return (
    <View style={layout.stack} testID="analytics-panel">
      <View style={styles.kpiGrid}>
        {stats.map(([id, label, value]) => (
          <View key={id} style={styles.kpi}>
            <Text variant="caption" muted>
              {label}
            </Text>
            <Text variant="title" testID={`analytics-${id}`}>
              {value}
            </Text>
          </View>
        ))}
      </View>
      {rates.map(([id, label, rate, detail]) => (
        <Panel key={id} title={label}>
          <Text variant="title" testID={`analytics-${id}`}>
            {rate}%
          </Text>
          <Text variant="caption" muted>
            {detail}
          </Text>
        </Panel>
      ))}
      <Panel title={t('screens.sharing.channelPerformance')} testID="analytics-channels">
        {Object.entries(byChannel).map(([channel, c]) => (
          <View key={channel} style={layout.spread}>
            <Text weight="600">{channel}</Text>
            <Text size="sm" muted>
              {`${c.sent} / ${c.delivered} / ${c.opened}`}
            </Text>
          </View>
        ))}
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { borderRadius: 12, padding: 12, gap: 4 },
  credits: { borderRadius: 12, padding: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { minWidth: '45%', flexGrow: 1, gap: 2 },
  queueRow: { gap: 6, paddingVertical: 8 },
});
