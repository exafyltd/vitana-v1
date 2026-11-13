/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — native twin of the mobile-web campaign
 * detail (`src/pages/sharing/CampaignDetail.tsx`, the non-Spotlight branch): the campaign header
 * with its status and dates, the status actions (activate a draft, pause / complete an active
 * campaign, resume a paused one, edit), the four post counters, and the posts list with schedule
 * and publish-now for drafts and a create-post sheet. Like the web, the campaign is found in the
 * member's campaign list (RLS keeps that list the member's own).
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, notify, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { CardSkeletons, EmptyBlock, ErrorBlock, Page, Panel, StatusBadge, layout } from './components';
import { ActivateSheet, CreatePostSheet, ScheduleSheet } from './sheets';
import { CampaignSheet } from './CampaignSheet';
import { ShareCampaignSheet } from './UniversalShareSheet';
import { formatDay } from './format';
import { useActivateAllPosts, useCampaigns, useDistributionPosts } from './data/hooks';
import { activationStatus, canActivateCampaign, POST_CHANNELS, postStats, targetChannelKeys } from './rules';

export function CampaignDetailScreen({ id }: { id: string }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { campaigns, isLoading, isError, refetch, activateCampaign, pauseCampaign, completeCampaign, updateCampaign } = useCampaigns();
  const { posts, updatePost, blastNow } = useDistributionPosts();
  const activateAll = useActivateAllPosts();
  const [activateOpen, setActivateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [schedulingPost, setSchedulingPost] = useState<string | null>(null);

  const campaign = campaigns?.find((c) => c.id === id);
  const campaignPosts = (posts ?? []).filter((p) => p.campaign_id === id);
  const drafts = campaignPosts.filter((p) => p.status === 'draft');
  const stats = postStats(posts ?? [], id);
  const channelKeys = targetChannelKeys(campaign?.target_channels);

  if (isError) {
    return (
      <Page title={t('screens.sharing.campaignManager')} testID="campaign-detail-screen">
        <ErrorBlock message={t('errors.somethingWentWrong')} retryLabel={t('common.retry')} onRetry={() => void refetch()} testID="campaign-detail-error" retryTestID="campaign-detail-retry" />
      </Page>
    );
  }
  if (isLoading) {
    return (
      <Page title={t('screens.sharing.campaignManager')} testID="campaign-detail-screen">
        <CardSkeletons count={2} testID="campaign-detail-loading" />
      </Page>
    );
  }
  if (!campaign) {
    return (
      <Page title={t('screens.sharing.campaignManager')} testID="campaign-detail-screen">
        <EmptyBlock
          testID="campaign-not-found"
          title={t('screens.sharing.campaignNotFound')}
          action={{ label: t('screens.sharing.backCampaigns'), onPress: () => navigateToWebPath('/sharing/campaigns'), testID: 'campaign-back-list' }}
        />
      </Page>
    );
  }

  const activate = async (mode: 'instant' | 'scheduled', when?: Date) => {
    try {
      if (mode === 'instant') {
        if (drafts.length > 0) await activateAll.mutateAsync(id);
        await activateCampaign.mutateAsync(id);
      } else if (when) {
        await updateCampaign.mutateAsync({ id, status: activationStatus('scheduled'), start_date: when.toISOString() });
      }
      setActivateOpen(false);
    } catch {
      // The mutation already raised its error toast.
    }
  };
  const confirmSchedule = async (when: Date) => {
    if (!schedulingPost) return;
    await updatePost.mutateAsync({ id: schedulingPost, updates: { status: 'scheduled', scheduled_for: when.toISOString() } });
    setSchedulingPost(null);
    notify('toasts.sharing.postScheduledSuccessfully');
  };
  const publish = async (postId: string) => {
    await blastNow.mutateAsync(postId);
    notify('toasts.sharing.postPublished');
  };

  const dates = [campaign.start_date, campaign.end_date].filter(Boolean).map((d) => formatDay(d as string, locale)).join(' – ');
  const counter = (testID: string, label: string, value: number) => (
    <View style={[styles.counter, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text size="xs" muted>
        {label}
      </Text>
      <Text size="2xl" weight="700" testID={testID}>
        {value}
      </Text>
    </View>
  );

  return (
    <>
      <Page
        title={campaign.name}
        description={campaign.description ?? undefined}
        testID="campaign-detail-screen"
        actions={
          <>
            <Button size="sm" variant="ghost" onPress={() => navigateToWebPath('/sharing/campaigns')} testID="campaign-back-list">
              {t('screens.sharing.backCampaigns')}
            </Button>
            {campaign.status === 'draft' ? (
              <Button size="sm" onPress={() => setActivateOpen(true)} disabled={!canActivateCampaign(campaign)} testID="detail-activate">
                {t('screens.sharing.activateCampaign')}
              </Button>
            ) : null}
            {campaign.status === 'active' ? (
              <>
                <Button size="sm" variant="outline" onPress={() => void pauseCampaign.mutateAsync(id)} disabled={pauseCampaign.isPending} testID="detail-pause">
                  {t('screens.sharing.pause')}
                </Button>
                <Button size="sm" variant="outline" onPress={() => void completeCampaign.mutateAsync(id)} disabled={completeCampaign.isPending} testID="detail-complete">
                  {t('screens.sharing.complete')}
                </Button>
              </>
            ) : null}
            {campaign.status === 'paused' ? (
              <Button size="sm" onPress={() => void activateCampaign.mutateAsync(id)} disabled={activateCampaign.isPending} testID="detail-resume">
                {t('screens.sharing.resume')}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onPress={() => setEditOpen(true)} testID="detail-edit">
              {t('screens.sharing.edit')}
            </Button>
            <Button size="sm" variant="outline" onPress={() => setShareOpen(true)} testID="detail-share">
              {t('screens.sharing.share')}
            </Button>
          </>
        }
      >
        <View style={layout.row}>
          <StatusBadge status={campaign.status} testID="detail-status" />
          {dates ? (
            <Text size="sm" muted>
              {dates}
            </Text>
          ) : null}
        </View>

        <View style={styles.counters}>
          {counter('stat-total', t('screens.sharing.totalPosts'), stats.total)}
          {counter('stat-published', t('screens.sharing.published'), stats.published)}
          {counter('stat-scheduled', t('screens.sharing.scheduled'), stats.scheduled)}
          {counter('stat-drafts', t('screens.sharing.drafts'), stats.drafts)}
        </View>

        <Panel title={t('screens.sharing.campaignPosts')}>
          <Button size="sm" onPress={() => setCreateOpen(true)} testID="detail-create-post">
            {t('screens.sharing.createPost')}
          </Button>
          {campaignPosts.length === 0 ? (
            <EmptyBlock
              testID="detail-posts-empty"
              title={t('screens.sharing.noPostsYet')}
              body={t('screens.sharing.createPostsAssignThemThisCampaign')}
              action={{ label: t('screens.sharing.createFirstPost'), onPress: () => setCreateOpen(true), testID: 'detail-create-first-post' }}
            />
          ) : (
            <View style={layout.stack}>
              {campaignPosts.map((post) => (
                <View key={post.id} style={[styles.post, { borderColor: colors.border }]} testID={`post-row-${post.id}`}>
                  <Text weight="700">{post.title}</Text>
                  {post.description ? (
                    <Text size="sm" muted numberOfLines={1}>
                      {post.description}
                    </Text>
                  ) : null}
                  <View style={layout.row}>
                    <StatusBadge status={post.status} />
                    {post.published_at ? (
                      <Text variant="caption" muted>
                        {formatDay(post.published_at, locale)}
                      </Text>
                    ) : null}
                  </View>
                  {post.status === 'draft' ? (
                    <View style={layout.row}>
                      <Button size="sm" variant="outline" onPress={() => setSchedulingPost(post.id)} testID={`post-schedule-${post.id}`}>
                        {t('screens.sharing.schedule')}
                      </Button>
                      <Button size="sm" onPress={() => void publish(post.id)} disabled={blastNow.isPending} testID={`post-publish-${post.id}`}>
                        {t('screens.sharing.publishNow')}
                      </Button>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </Panel>
      </Page>

      <ActivateSheet
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onConfirm={(mode, when) => void activate(mode, when)}
        isLoading={activateAll.isPending || activateCampaign.isPending || updateCampaign.isPending}
        postsCount={campaignPosts.length}
        draftCount={drafts.length}
        channelNames={channelKeys.map((k) => POST_CHANNELS.find((c) => c.key === k)?.name ?? k)}
      />
      <ScheduleSheet open={!!schedulingPost} onClose={() => setSchedulingPost(null)} onConfirm={(when) => void confirmSchedule(when)} isLoading={updatePost.isPending} />
      <CampaignSheet open={editOpen} onClose={() => setEditOpen(false)} editing={campaign} />
      <CreatePostSheet open={createOpen} onClose={() => setCreateOpen(false)} campaignId={campaign.id} campaignName={campaign.name} targetChannels={channelKeys} />
      <ShareCampaignSheet open={shareOpen} onClose={() => setShareOpen(false)} campaign={campaign} />
    </>
  );
}

const styles = StyleSheet.create({
  counters: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  counter: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 4, minWidth: 140, flexGrow: 1 },
  post: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
});
