/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — native twin of the mobile-web
 * Campaign Manager list (`src/pages/sharing/Campaigns.tsx`, the non-Spotlight branch): campaign
 * cards with status, dates, channels and post counts; tap a card to edit it in the sheet; open,
 * duplicate and delete per card; bulk mode (select, duplicate, delete, CSV export) from two campaigns
 * up; and the loaded, empty, error and loading states. Search and the calendar shortcut of the web
 * header strip are not ported (the web search field has no handler). Smart-Reschedule is the web's
 * "coming soon" toast.
 */
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, notify, useUITheme } from '../../ports/ui';
import { getChatDevice } from '../../ports/chat-device';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { CardSkeletons, EmptyBlock, ErrorBlock, Page, Panel, StatusBadge, layout } from './components';
import { CampaignSheet } from './CampaignSheet';
import { DeleteCampaignSheet } from './sheets';
import { formatDay } from './format';
import { useCampaigns, useDistributionPosts } from './data/hooks';
import { campaignsToCsv, postStats, targetChannelKeys, POST_CHANNELS, type CampaignRow } from './rules';

const channelName = (key: string) => POST_CHANNELS.find((c) => c.key === key)?.name ?? key;

function CampaignCard({
  campaign,
  total,
  bulkMode,
  selected,
  onEdit,
  onToggle,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  campaign: CampaignRow;
  total: number;
  bulkMode: boolean;
  selected: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const channels = targetChannelKeys(campaign.target_channels);
  const dates = [campaign.start_date, campaign.end_date].filter(Boolean).map((d) => formatDay(d as string, locale)).join(' – ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={campaign.name}
      onPress={bulkMode ? onToggle : onEdit}
      testID={`campaign-card-${campaign.id}`}
      style={[styles.card, { borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.card }]}
    >
      <View style={layout.spread}>
        <View style={layout.fill}>
          <Text weight="700" numberOfLines={2}>
            {campaign.name}
          </Text>
          <StatusBadge status={campaign.status} testID={`campaign-status-${campaign.id}`} />
        </View>
        {bulkMode ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={campaign.name}
            onPress={onToggle}
            testID={`campaign-select-${campaign.id}`}
            style={[styles.check, { borderColor: colors.primary, backgroundColor: selected ? colors.primary : 'transparent' }]}
          >
            {selected ? <Text style={{ color: colors.primaryForeground }}>✓</Text> : null}
          </Pressable>
        ) : null}
      </View>
      {campaign.description ? (
        <Text size="sm" muted numberOfLines={2}>
          {campaign.description}
        </Text>
      ) : null}
      {dates ? (
        <Text variant="caption" muted>
          {dates}
        </Text>
      ) : null}
      {channels.length > 0 ? (
        <Text variant="caption" muted>
          {channels.map(channelName).join(', ')}
        </Text>
      ) : null}
      <Text variant="caption" weight="600" testID={`campaign-posts-${campaign.id}`}>
        {`${t('screens.sharing.posts')} ${total}`}
      </Text>
      {!bulkMode ? (
        <View style={layout.row}>
          <Button size="sm" onPress={onOpen} testID={`campaign-open-${campaign.id}`}>
            {t('screens.sharing.viewDetails')}
          </Button>
          <Button size="sm" variant="outline" onPress={onDuplicate} testID={`campaign-duplicate-${campaign.id}`}>
            {t('screens.sharing.duplicate')}
          </Button>
          <Button size="sm" variant="outline" onPress={onDelete} testID={`campaign-delete-${campaign.id}`}>
            {t('screens.sharing.delete')}
          </Button>
        </View>
      ) : null}
    </Pressable>
  );
}

export function CampaignsScreen(): ReactElement {
  const { t } = useI18n();
  const { campaigns, isLoading, isError, refetch, duplicateCampaign, deleteCampaign } = useCampaigns();
  const { posts } = useDistributionPosts();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<CampaignRow | null>(null);

  const list = campaigns ?? [];
  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const closeSheet = () => {
    setSheetOpen(false);
    setEditing(null);
  };
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearBulk = () => {
    setBulkMode(false);
    setPicked(new Set());
  };

  const bulkEach = async (action: (id: string) => Promise<unknown>) => {
    for (const id of Array.from(picked)) await action(id);
    setPicked(new Set());
  };
  const exportCsv = async () => {
    const chosen = list.filter((c) => picked.has(c.id));
    await getChatDevice().share({ message: campaignsToCsv(chosen) });
    notify('toasts.sharing.campaignsExportedCsv');
  };

  let content: ReactElement;
  if (isError) {
    content = <ErrorBlock message={t('errors.somethingWentWrong')} retryLabel={t('common.retry')} onRetry={() => void refetch()} testID="campaigns-error" retryTestID="campaigns-retry" />;
  } else if (isLoading) {
    content = <CardSkeletons count={3} testID="campaigns-loading" />;
  } else if (list.length === 0) {
    content = (
      <EmptyBlock
        testID="campaigns-empty"
        title={t('screens.sharing.noCampaignsYet')}
        body={t('screens.sharing.createYourFirstCampaignOrganizeTrack')}
        action={{ label: t('screens.sharing.createYourFirstCampaign'), onPress: openCreate, testID: 'campaigns-empty-create' }}
      />
    );
  } else {
    content = (
      <View style={layout.stack} testID="campaigns-list">
        {bulkMode && picked.size > 0 ? (
          <Panel testID="bulk-toolbar" title={t('screens.sharing.selectedcountCampaignValue1Selected', { selectedCount: picked.size, value1: picked.size !== 1 ? 's' : '' })}>
            <View style={layout.row}>
              <Button size="sm" variant="outline" onPress={() => setPicked(new Set(list.map((c) => c.id)))} testID="bulk-select-all">
                {t('screens.sharing.selectAll')}
              </Button>
              <Button size="sm" variant="outline" onPress={() => setPicked(new Set())} testID="bulk-deselect-all">
                {t('screens.sharing.deselectAll')}
              </Button>
              <Button size="sm" variant="outline" onPress={() => void bulkEach((id) => duplicateCampaign.mutateAsync(id))} testID="bulk-duplicate">
                {t('screens.sharing.duplicate')}
              </Button>
              <Button size="sm" variant="outline" onPress={() => void exportCsv()} testID="bulk-export">
                {t('screens.sharing.exportCsv')}
              </Button>
              <Button size="sm" variant="outline" onPress={() => notify('toasts.sharing.smartrescheduleFeatureComingSoon')} testID="bulk-reschedule">
                {t('screens.sharing.smartreschedule')}
              </Button>
              <Button size="sm" variant="destructive" onPress={() => void bulkEach((id) => deleteCampaign.mutateAsync(id))} testID="bulk-delete">
                {t('screens.sharing.delete')}
              </Button>
            </View>
          </Panel>
        ) : null}
        {list.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            total={postStats(posts ?? [], c.id).total}
            bulkMode={bulkMode}
            selected={picked.has(c.id)}
            onEdit={() => {
              setEditing(c);
              setSheetOpen(true);
            }}
            onToggle={() => toggle(c.id)}
            onOpen={() => navigateToWebPath(`/sharing/campaigns/${encodeURIComponent(c.id)}`)}
            onDuplicate={() => void duplicateCampaign.mutateAsync(c.id)}
            onDelete={() => setDeleting(c)}
          />
        ))}
      </View>
    );
  }

  return (
    <>
      <Page
        title={t('screens.sharing.campaignManager')}
        testID="campaigns-screen"
        actions={
          <>
            {list.length >= 2 ? (
              <Button size="sm" variant={bulkMode ? 'default' : 'outline'} onPress={() => (bulkMode ? clearBulk() : setBulkMode(true))} testID="campaigns-bulk-toggle">
                {bulkMode ? t('spotlightTierB.sharing.exitBulkMode') : t('spotlightTierB.sharing.bulkActions')}
              </Button>
            ) : null}
            <Button size="sm" onPress={openCreate} testID="campaigns-new">
              {t('screens.sharing.newCampaign')}
            </Button>
          </>
        }
      >
        {content}
      </Page>
      <CampaignSheet open={sheetOpen} onClose={closeSheet} editing={editing} />
      <DeleteCampaignSheet
        open={!!deleting}
        name={deleting?.name ?? ''}
        onClose={() => setDeleting(null)}
        isLoading={deleteCampaign.isPending}
        onConfirm={() => {
          if (!deleting) return;
          void deleteCampaign.mutateAsync(deleting.id).finally(() => setDeleting(null));
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
