/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — the Sales tabs of the Business Hub:
 * Inventory (`ResellerAvailableEventsTab`), Promotions (`ResellerCampaignsTab`), Referrals
 * (`VaeaCatalogPanel` + `VaeaDetectedList`) and the drafts strip (`VaeaDraftsStrip`). Reads only;
 * the web sell modal, the campaign dialog and the catalog add-form are not ported in this lane
 * (listed in the PR body).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { EmptyState, ErrorState, FilterChips, LoadingRows, Surface } from './components';
import { eventKind, formatMoney, matchesInventoryFilter, type InventoryFilter } from './earnings';
import { formatDay } from './format';
import { useCampaigns, useIsReseller, useResellableEvents, useVaeaCatalog, useVaeaDetected, useVaeaDrafts, type CampaignRow } from './data/queries';

export function InventoryPanel() {
  const { t, locale } = useI18n();
  const { resellerProfile } = useIsReseller();
  const q = useResellableEvents();
  const [filter, setFilter] = useState<InventoryFilter>('all');
  if (!resellerProfile) {
    return <EmptyState testID="inventory-locked" glyph="🎫" title={t('screens.reseller.noEventsYourInventory')} body={t('screens.reseller.activateResellerModeAccessYourInventory')} />;
  }
  if (q.isPending) return <LoadingRows testID="inventory-loading" />;
  if (q.isError) return <ErrorState testID="inventory-error" message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void q.refetch()} />;
  const events = q.data ?? [];
  if (events.length === 0) {
    return (
      <EmptyState
        testID="inventory-empty"
        glyph="🎫"
        title={t('screens.reseller.noEventsYourInventory')}
        body={t('screens.reseller.onceYouAddEventsYourInventory')}
        action={{ label: t('screens.reseller.addFirstEvent'), onPress: () => navigateToWebPath('/comm/events') }}
      />
    );
  }
  const shown = events.filter((e) => matchesInventoryFilter(e.default_reseller_commission_rate ?? 0, e.start_time, filter));
  return (
    <View style={styles.list} testID="inventory-list">
      <FilterChips<InventoryFilter>
        groupLabel={t('businessNative.tabs.inventory')}
        selected={filter}
        onSelect={setFilter}
        testIDPrefix="inventory-filter"
        chips={[
          { key: 'all', label: t('businessNative.inventory.filter.all') },
          { key: 'high-commission', label: t('businessNative.inventory.filter.highEarnings') },
          { key: 'ending-soon', label: t('businessNative.inventory.filter.endingSoon') },
          { key: 'popular', label: t('businessNative.inventory.filter.popular') },
        ]}
      />
      {shown.length === 0 ? <Text muted testID="inventory-no-match">{t('businessNative.inventory.noMatch')}</Text> : null}
      {shown.map((e) => {
        const rate = e.default_reseller_commission_rate ?? 0;
        const price = Number((e.metadata as { price?: number } | null)?.price ?? 0);
        const perTicket = price * (rate / 100);
        const kind = eventKind(e.location);
        return (
          <Surface key={e.id} testID={`inventory-${e.id}`}>
            <Text weight="600">{e.title}</Text>
            <Text variant="caption" muted>
              {formatDay(e.start_time, locale, true)}
              {e.location ? ` • ${e.location}` : ''}
            </Text>
            {rate > 0 ? (
              <Badge variant="secondary">{t('businessNative.inventory.commission', { type: kind === 'in-person' ? t('businessNative.inventory.inPerson') : t('businessNative.events.online'), rate })}</Badge>
            ) : null}
            {perTicket > 0 ? <Text weight="700">{t('businessNative.inventory.earnPerTicket', { amount: formatMoney(perTicket, locale) })}</Text> : null}
          </Surface>
        );
      })}
    </View>
  );
}

function CampaignCard({ campaign, eventTitle }: { campaign: CampaignRow; eventTitle: string | null }) {
  const { t, locale } = useI18n();
  const range =
    campaign.start_date && campaign.end_date
      ? `${formatDay(campaign.start_date, locale)} – ${formatDay(campaign.end_date, locale)}`
      : campaign.start_date
        ? t('businessNative.campaigns.starts', { date: formatDay(campaign.start_date, locale) })
        : t('businessNative.campaigns.noDate');
  const isDraft = campaign.status === 'draft';
  const statusKey = ['draft', 'scheduled', 'active', 'completed'].includes(campaign.status) ? campaign.status : 'draft';
  return (
    <Surface
      testID={`campaign-${campaign.id}`}
      accessibilityLabel={campaign.name}
      onPress={() => navigateToWebPath(isDraft ? '/sharing/campaigns' : `/pub/campaigns/${campaign.id}`)}
    >
      <Text weight="600">{campaign.name}</Text>
      <Text variant="caption" muted>
        {range}
        {eventTitle ? ` • ${t('businessNative.campaigns.promoting', { title: eventTitle })}` : ''}
      </Text>
      <View style={styles.metaRow}>
        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>{t(`businessNative.campaigns.status.${statusKey}`)}</Badge>
        <Text variant="caption" weight="600">
          {isDraft ? t('businessNative.campaigns.edit') : t('businessNative.campaigns.view')}
        </Text>
      </View>
    </Surface>
  );
}

export function CampaignsPanel() {
  const { t } = useI18n();
  const { campaigns, linkedEvents } = useCampaigns();
  if (campaigns.isPending) return <LoadingRows testID="campaigns-loading" />;
  if (campaigns.isError) return <ErrorState testID="campaigns-error" message={t('communityHubNative.common.errorBody')} retryLabel={t('communityHubNative.common.retry')} onRetry={() => void campaigns.refetch()} />;
  const list = campaigns.data ?? [];
  const create = { label: t('screens.reseller.createCampaign'), onPress: () => navigateToWebPath('/sharing/campaigns'), testID: 'campaigns-create' };
  if (list.length === 0) {
    return <EmptyState testID="campaigns-empty" glyph="📣" title={t('screens.reseller.noCampaignsYet')} body={t('screens.reseller.createCampaignPromoteEventsBoostYour')} action={create} />;
  }
  const titles = new Map(linkedEvents.map((e) => [e.id, e.title]));
  return (
    <View style={styles.list} testID="campaigns-list">
      <Button size="sm" onPress={create.onPress} testID={create.testID}>
        {create.label}
      </Button>
      {list.map((c) => (
        <CampaignCard key={c.id} campaign={c} eventTitle={c.metadata?.event_id ? (titles.get(c.metadata.event_id) ?? null) : null} />
      ))}
    </View>
  );
}

/** Drafts strip: hidden while loading, on error and when there is nothing to review (web rule). */
export function DraftsStrip() {
  const { t } = useI18n();
  const { data, isPending, isError, dismiss, refetch } = useVaeaDrafts(25);
  const [open, setOpen] = useState(false);
  const drafts = data ?? [];
  if (isPending || isError || drafts.length === 0) return null;
  return (
    <Surface testID="drafts-strip">
      <Text weight="600" onPress={() => setOpen((v) => !v)} accessibilityRole="button" testID="drafts-toggle">
        {t('screens.business.autopilotHasLengthReferralDraftValue1', { length: drafts.length, value1: drafts.length === 1 ? '' : 's' })}
      </Text>
      <Text variant="caption" muted>
        {t('screens.business.shadowDraftsReviewDismissPostingArrives')}
      </Text>
      {open ? (
        <View style={styles.list}>
          {drafts.map((d) => (
            <Surface key={d.id} testID={`draft-${d.id}`}>
              <Text variant="caption" muted>
                {t('screens.business.autopilotDraft')}
              </Text>
              <Text>{d.reply_body}</Text>
              {d.match_reason ? <Text variant="caption" muted>{d.match_reason}</Text> : null}
              <Button variant="ghost" size="sm" onPress={() => dismiss.mutate(d.id)} testID={`draft-dismiss-${d.id}`}>
                {t('common.close')}
              </Button>
            </Surface>
          ))}
          <Button variant="ghost" size="sm" onPress={() => void refetch()}>
            {t('screens.business.refresh')}
          </Button>
        </View>
      ) : null}
    </Surface>
  );
}

export function ReferralsPanel() {
  const { t } = useI18n();
  const catalog = useVaeaCatalog();
  const detected = useVaeaDetected(25);
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.list} testID="referrals-panel">
      <View>
        <Text weight="600">{t('screens.business.yourReferralCatalog')}</Text>
        <Text variant="caption" muted>
          {t('screens.business.ownProductsRankAboveVettedPartners')}
        </Text>
      </View>
      {catalog.isPending ? <LoadingRows count={2} testID="catalog-loading" /> : null}
      {catalog.isError ? <ErrorState testID="catalog-error" message={t('communityHubNative.common.errorBody')} retryLabel={t('screens.business.retry')} onRetry={() => void catalog.refetch()} /> : null}
      {catalog.data && catalog.data.length === 0 ? <EmptyState testID="catalog-empty" glyph="🤝" title={t('screens.business.yourCatalogEmpty')} body={t('screens.business.addProductsServicesAutopilotCanRecommend')} /> : null}
      {(catalog.data ?? []).map((item) => (
        <Surface key={item.id} testID={`catalog-${item.id}`}>
          <Text weight="600">{item.title}</Text>
          <Text variant="caption" muted>
            {item.category}
          </Text>
          {item.personal_note ? <Text variant="caption" muted>“{item.personal_note}”</Text> : null}
        </Surface>
      ))}
      <View>
        <Text weight="600" onPress={() => setOpen((v) => !v)} accessibilityRole="button" testID="detected-toggle">
          {t('screens.business.whatAutopilotSaw')} ({detected.data?.length ?? 0})
        </Text>
        <Text variant="caption" muted>
          {t('screens.business.everyMessageAutopilotScannedIncludingOnes')}
        </Text>
      </View>
      {open && detected.isError ? <ErrorState testID="detected-error" message={t('communityHubNative.common.errorBody')} retryLabel={t('screens.business.retry')} onRetry={() => void detected.refetch()} /> : null}
      {open && detected.data && detected.data.length === 0 ? <Text variant="caption" muted testID="detected-empty">{t('screens.business.nothingDetectedYet')}</Text> : null}
      {open
        ? (detected.data ?? []).map((q) => (
            <Surface key={q.id} testID={`detected-${q.id}`}>
              <Text variant="caption" muted>
                {q.platform}
                {q.author_handle ? ` · @${q.author_handle}` : ''} · {q.combined_score.toFixed(2)}
              </Text>
              <Text numberOfLines={2}>{q.message_body}</Text>
              {q.disposition_reason ? <Text variant="caption" muted>{q.disposition_reason}</Text> : null}
            </Surface>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
});
