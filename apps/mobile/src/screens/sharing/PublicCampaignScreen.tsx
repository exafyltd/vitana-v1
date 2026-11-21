/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — native twin of the public campaign landing
 * (`src/pages/PublicCampaignLanding.tsx`, route `/pub/campaigns/:id`, no sign-in): the campaign is read
 * through the `get_public_campaign_details` RPC (and the linked event through `get_public_event_details`),
 * so it renders with no session. Two calls to action: the event action (external ticket link, the linked
 * event, or the same as "Join") and the community action (sign in through the tenant portal with a
 * return path to the campaign). The web opens a ticket dialog for guests of a ticketed event; native
 * sends them to the public event page (`/pub/events/:id`), which owns ticket checkout. Draft campaigns
 * hide their status badge.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button, Skeleton, Text, useUITheme } from '../../ports/ui';
import { getChatDevice } from '../../ports/chat-device';
import { canonicalTenantSlug, findBySlug } from '../../ports/core';
import { getSupabase } from '../../auth/client';
import { useAuth } from '../../auth/AuthProvider';
import { useTenant } from '../../identity/TenantProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { Panel } from './components';
import { formatDay, formatNumber } from './format';
import { campaignTicketUrl, CTA_LABEL_KEY, publicLandingCta } from './rules';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface PublicCampaign {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  target_channels: any;
  metadata: Record<string, any> | null;
  owner_name?: string;
}

interface LinkedEvent {
  has_tickets: boolean;
  lowest_ticket_price: number | null;
  is_paid_event: boolean;
  event_title: string;
  is_sold_out: boolean;
}

const LEGACY_PORTALS = ['maxina', 'alkalma'];

export function PublicCampaignScreen({ id, utm }: { id: string; utm?: string }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const { registry } = useTenant();
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [event, setEvent] = useState<LinkedEvent | null>(null);
  const [hasTicket, setHasTicket] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const sb = getSupabase() as any;
        const { data, error } = await sb.rpc('get_public_campaign_details', { campaign_id: id });
        if (!live) return;
        if (error || !data || data.length === 0) {
          setState('missing');
          return;
        }
        const row = data[0] as PublicCampaign;
        setCampaign(row);
        const eventId = row.metadata?.event_id || row.metadata?.eventId;
        if (eventId) {
          const { data: ev } = await sb.rpc('get_public_event_details', { event_id: eventId });
          if (live && ev && ev.length > 0) {
            setEvent({
              has_tickets: ev[0].has_tickets || false,
              lowest_ticket_price: ev[0].lowest_ticket_price ?? null,
              is_paid_event: ev[0].is_paid_event || false,
              event_title: ev[0].title || row.name,
              is_sold_out: ev[0].is_sold_out || false,
            });
          }
        }
        if (live) setState('ready');
      } catch {
        if (live) setState('missing');
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  const linkedEventId: string | null = campaign?.metadata?.event_id || campaign?.metadata?.eventId || null;
  useEffect(() => {
    if (!user || !linkedEventId) {
      setHasTicket(false);
      return;
    }
    let live = true;
    void (async () => {
      const { data } = await (getSupabase() as any).from('event_ticket_purchases').select('id').eq('event_id', linkedEventId).eq('buyer_id', user.id).eq('status', 'completed').limit(1);
      if (live) setHasTicket(!!data && data.length > 0);
    })();
    return () => {
      live = false;
    };
  }, [user, linkedEventId]);

  if (state === 'loading') {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]} testID="public-campaign-loading">
        <Skeleton style={styles.heroSkeleton} />
        <Skeleton style={styles.lineSkeleton} />
      </View>
    );
  }
  if (state === 'missing' || !campaign) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} testID="public-campaign-not-found">
        <Text variant="title" accessibilityRole="header">
          {t('screens.publiccampaignlanding.campaignNotFound')}
        </Text>
        <Text muted>{t('sharingNative.public.notFoundBody')}</Text>
        <Button onPress={() => navigateToWebPath('/')} testID="public-go-home">
          {t('screens.publiccampaignlanding.goHome')}
        </Button>
      </View>
    );
  }

  const meta = campaign.metadata ?? {};
  const isPaid = event?.is_paid_event || meta.is_paid || meta.isPaid || false;
  const price: number | null = event?.lowest_ticket_price ?? meta.price ?? meta.event_price ?? null;
  const hasTickets = event?.has_tickets || false;
  const ticketUrl = campaignTicketUrl(campaign as unknown as { metadata?: Record<string, unknown> | null } & Record<string, unknown>);
  const tenantSlug: string | null = meta.tenant_slug || meta.tenantSlug || null;
  const cta = publicLandingCta({ hasTickets, isPaid, isSoldOut: event?.is_sold_out || false, isAuthenticated: !!user, userHasTicket: hasTicket });
  const currency: string = meta.display_currency || 'USD';
  const isDraft = campaign.status?.toLowerCase() === 'draft';
  const hero = campaign.cover_image_url || (campaign as any).image_url || meta.image_url || meta.cover_image_url || meta.event_image_url || null;
  const channels = Array.isArray(campaign.target_channels) ? campaign.target_channels.length : null;

  const slug = canonicalTenantSlug(tenantSlug);
  const loginRoute = slug && (findBySlug(registry, slug) || LEGACY_PORTALS.includes(slug.toLowerCase())) ? `/${findBySlug(registry, slug)?.slug ?? slug.toLowerCase()}` : '/maxina';
  const login = (returnUrl: string) => navigateToWebPath(`${loginRoute}?redirectTo=${encodeURIComponent(returnUrl)}`);

  const join = () => {
    const returnUrl = `/sharing/campaigns/${id}${utm ? `?${utm}` : ''}`;
    if (user) navigateToWebPath(returnUrl);
    else login(returnUrl);
  };
  const eventAction = () => {
    if (ticketUrl) {
      void getChatDevice().openUrl(ticketUrl);
      return;
    }
    if (linkedEventId) {
      navigateToWebPath(user ? `/comm/events-meetups?event=${linkedEventId}` : `/pub/events/${linkedEventId}`);
      return;
    }
    join();
  };

  const priceText = price === null ? null : price === 0 ? t('spotlightPublic.event.free') : t('spotlightPublic.event.fromPrice', { price: formatNumber(price, locale, { style: 'currency', currency }) });
  const detail = (label: string, value: string, testID?: string) => (
    <View style={styles.detail}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text weight="600" testID={testID}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]} testID="public-campaign-screen">
      {hero ? <Image source={{ uri: hero }} style={styles.hero} accessibilityLabel={campaign.name} /> : <View style={[styles.hero, { backgroundColor: colors.muted }]} />}
      <View style={styles.body}>
        <Text variant="title" accessibilityRole="header">
          {campaign.name}
        </Text>
        <View style={styles.badges}>
          {!isDraft ? (
            <Text size="sm" weight="600" style={{ color: colors.primary }} testID="public-campaign-status">
              {campaign.status}
            </Text>
          ) : null}
          {hasTickets && priceText ? (
            <Text size="sm" weight="600" testID="public-campaign-price">
              {priceText}
            </Text>
          ) : null}
        </View>
        <View style={styles.details}>
          {campaign.start_date ? detail(t('screens.publiccampaignlanding.campaignPeriod'), [campaign.start_date, campaign.end_date].filter(Boolean).map((d) => formatDay(d as string, locale)).join(' - ')) : null}
          {channels !== null ? detail(t('screens.publiccampaignlanding.channels'), t('screens.publiccampaignlanding.lengthChannelValue1', { length: channels, value1: channels !== 1 ? 's' : '' })) : null}
          {detail(t('screens.publiccampaignlanding.type'), t('screens.publiccampaignlanding.marketingCampaign'))}
          {detail(t('screens.publiccampaignlanding.community'), 'VITANA')}
        </View>
        {campaign.description ? <Text>{campaign.description}</Text> : null}
        <Panel testID="public-cta-panel">
          <Text variant="caption" weight="600" muted>
            {hasTickets ? t('eventCta.getYourTicket') : t('eventCta.joinThisEvent')}
          </Text>
          <Button onPress={eventAction} disabled={cta.disabled} accessibilityLabel={t(CTA_LABEL_KEY[cta.action])} testID={linkedEventId || ticketUrl ? 'public-event-cta' : 'public-join-cta'}>
            {t(CTA_LABEL_KEY[cta.action])}
          </Button>
          <Text variant="caption" muted>
            {t('screens.publiccampaignlanding.text')}
          </Text>
          <Text variant="caption" muted>
            {t('screens.publiccampaignlanding.discoverMoreEventsLongevityCommunities')}
          </Text>
          <Button variant="outline" onPress={() => (user ? navigateToWebPath('/comm/events-meetups') : login('/comm/events-meetups'))} testID="public-explore-cta">
            {t(user ? 'sharingNative.public.explore' : 'sharingNative.public.joinCommunity')}
          </Button>
          {!user ? (
            <Text variant="caption" muted>
              {t('screens.publiccampaignlanding.youLlSignCreateAccountNext')}
            </Text>
          ) : null}
        </Panel>
        <Text variant="caption" muted style={styles.footer}>
          {`${t('screens.publiccampaignlanding.poweredBy')} VITANA${t('screens.publiccampaignlanding.YourLongevityCommunity')}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  hero: { width: '100%', height: 220 },
  heroSkeleton: { height: 220, borderRadius: 0 },
  lineSkeleton: { height: 24, margin: 16, borderRadius: 8 },
  body: { padding: 16, gap: 12 },
  badges: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  details: { gap: 10 },
  detail: { gap: 2 },
  footer: { textAlign: 'center' },
});
