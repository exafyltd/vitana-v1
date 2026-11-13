/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — the pure rules of the sharing screens,
 * as the web computes them: campaign status tones and counters, the campaign activation check,
 * the bulk CSV, the post-analytics totals and rates, the share URLs, and the public landing CTA.
 * No React, no I/O: the screens call these and the tests pin them.
 */

export type StatusTone = 'success' | 'info' | 'warning' | 'pending' | 'muted';

/** CampaignDetail `getStatusColor`: active / published green, completed blue, paused orange, scheduled yellow, the rest grey. */
export function statusTone(status: string | null | undefined): StatusTone {
  switch (status) {
    case 'active':
    case 'published':
      return 'success';
    case 'completed':
      return 'info';
    case 'paused':
      return 'warning';
    case 'scheduled':
      return 'pending';
    default:
      return 'muted';
  }
}

export interface CampaignRow {
  id: string;
  user_id?: string | null;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  cover_image_url?: string | null;
  target_channels: unknown;
  distribution_config: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

export interface PostRow {
  id: string;
  campaign_id: string | null;
  user_id?: string | null;
  title: string;
  description: string | null;
  content?: string | null;
  status: string;
  published_at: string | null;
  scheduled_for?: string | null;
  channels?: string[] | null;
  created_at?: string;
}

/** The channel keys a campaign targets: the true keys of the object, or the entries of an array. */
export function targetChannelKeys(target: unknown): string[] {
  if (Array.isArray(target)) return target.map(String);
  if (target && typeof target === 'object') return Object.entries(target as Record<string, unknown>).filter(([, v]) => v === true).map(([k]) => k);
  return [];
}

export const hasSelectedChannels = (target: unknown): boolean => targetChannelKeys(target).length > 0;

/** CampaignDetail: a campaign can be activated when it has a name and at least one channel. */
export const canActivateCampaign = (c: Pick<CampaignRow, 'name' | 'target_channels'>): boolean => !!c.name && hasSelectedChannels(c.target_channels);

export function postStats(posts: readonly PostRow[], campaignId: string) {
  const mine = posts.filter((p) => p.campaign_id === campaignId);
  return {
    total: mine.length,
    published: mine.filter((p) => p.status === 'published').length,
    scheduled: mine.filter((p) => p.status === 'scheduled').length,
    drafts: mine.filter((p) => p.status === 'draft').length,
  };
}

/** Campaigns.tsx `handleBulkExport`: the CSV the web downloads. */
export function campaignsToCsv(campaigns: readonly CampaignRow[]): string {
  return [
    ['Name', 'Status', 'Start Date', 'End Date', 'Description'],
    ...campaigns.map((c) => [c.name, c.status, c.start_date || '', c.end_date || '', c.description || '']),
  ]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');
}

/** The next status of a campaign the activation sheet saves. */
export function activationStatus(mode: 'instant' | 'scheduled'): 'active' | 'scheduled' {
  return mode === 'instant' ? 'active' : 'scheduled';
}

/** Combines a calendar day and an "HH:mm" time (the schedule sheet). */
export function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/** Social platforms the web shows beside the messaging channels (ChannelConnector SOCIAL_CHANNELS). */
export const SOCIAL_CHANNELS = [
  { key: 'instagram', name: 'Instagram' },
  { key: 'linkedin', name: 'LinkedIn' },
  { key: 'twitter', name: 'Twitter/X' },
  { key: 'facebook', name: 'Facebook' },
  { key: 'youtube', name: 'YouTube' },
  { key: 'tiktok', name: 'TikTok' },
] as const;

/** Messaging channels a member can connect in one tap (ChannelConnector ALL_CHANNELS). */
export const MESSAGING_CHANNELS = [
  { type: 'email', name: 'Email' },
  { type: 'sms', name: 'SMS' },
  { type: 'whatsapp', name: 'WhatsApp' },
  { type: 'slack', name: 'Slack' },
] as const;

/** Channels a post can target (CreatePostDialog CHANNELS). */
export const POST_CHANNELS = [
  { key: 'email', name: 'Email' },
  { key: 'sms', name: 'SMS' },
  { key: 'whatsapp', name: 'WhatsApp' },
  { key: 'linkedin', name: 'LinkedIn' },
  { key: 'instagram', name: 'Instagram' },
  { key: 'facebook', name: 'Facebook' },
  { key: 'twitter', name: 'Twitter/X' },
  { key: 'youtube', name: 'YouTube' },
  { key: 'tiktok', name: 'TikTok' },
] as const;

export interface ChannelRow {
  id: string;
  user_id?: string;
  channel_type: string;
  channel_name: string | null;
  is_connected: boolean;
  is_active?: boolean;
}

/** ChannelConnector `isChannelConnected`: matches the type or the name, case-insensitively. */
export function isChannelConnected(channels: readonly ChannelRow[] | undefined, type: string): boolean {
  return !!channels?.some((c) => c.channel_type === type || c.channel_name?.toLowerCase() === type.toLowerCase());
}

export interface AnalyticsRow {
  channel_type: string;
  sent_count: number | null;
  delivered_count: number | null;
  opened_count: number | null;
  clicked_count: number | null;
  responded_count: number | null;
  failed_count: number | null;
  revenue: number | string | null;
}

/** usePostAnalytics: the totals and the per-channel sums. */
export function aggregateAnalytics(rows: readonly AnalyticsRow[]) {
  const totals = { totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, totalResponded: 0, totalFailed: 0, totalRevenue: 0 };
  const byChannel: Record<string, { sent: number; delivered: number; opened: number; clicked: number; responded: number; failed: number; revenue: number }> = {};
  for (const r of rows) {
    totals.totalSent += r.sent_count || 0;
    totals.totalDelivered += r.delivered_count || 0;
    totals.totalOpened += r.opened_count || 0;
    totals.totalClicked += r.clicked_count || 0;
    totals.totalResponded += r.responded_count || 0;
    totals.totalFailed += r.failed_count || 0;
    totals.totalRevenue += Number(r.revenue || 0);
    const c = (byChannel[r.channel_type] ??= { sent: 0, delivered: 0, opened: 0, clicked: 0, responded: 0, failed: 0, revenue: 0 });
    c.sent += r.sent_count || 0;
    c.delivered += r.delivered_count || 0;
    c.opened += r.opened_count || 0;
    c.clicked += r.clicked_count || 0;
    c.responded += r.responded_count || 0;
    c.failed += r.failed_count || 0;
    c.revenue += Number(r.revenue || 0);
  }
  return { totals, byChannel };
}

/** AnalyticsDashboard: `part / whole` as a percentage with one decimal, "0" with no whole. */
export const percent = (part: number, whole: number): string => (whole > 0 ? ((part / whole) * 100).toFixed(1) : '0');

// ── share URLs (src/lib/shareUrl.ts) ──────────────────────────────────────

export type ShareContentType = 'group' | 'event' | 'meetup' | 'live_room' | 'profile' | 'post' | 'service' | 'music' | 'product' | 'campaign';

export interface ShareableContent {
  type: ShareContentType;
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  url?: string;
  slug?: string;
}

/** `getShareUrl`: events and meetups and profiles on the canonical host, the rest on the public origin. */
export function getShareUrl(type: ShareContentType, id: string, options: { utm_source?: string; utm_medium?: string; utm_campaign?: string; slug?: string; origin?: string } = {}): string {
  const enc = encodeURIComponent;
  // The web uses `window.location.origin`; natively the caller passes the build's web origin (see `origin.ts`).
  const PUBLIC_ORIGIN = (options.origin ?? '').replace(/\/+$/, '');
  if (type === 'product') return `${PUBLIC_ORIGIN}/products/${enc(id)}`;
  if (type === 'event' || type === 'meetup') return `${PUBLIC_ORIGIN}/events/${enc(options.slug || id)}`;
  if (type === 'profile') return `${PUBLIC_ORIGIN}/profiles/${enc(id)}`;
  const path =
    type === 'campaign' ? `/pub/campaigns/${enc(id)}` : type === 'group' ? `/comm/groups/${enc(id)}` : type === 'post' ? `/sharing/posts/${enc(id)}` : `/${enc(type)}/${enc(id)}`;
  const params = new URLSearchParams();
  if (options.utm_source) params.set('utm_source', options.utm_source);
  if (options.utm_medium) params.set('utm_medium', options.utm_medium);
  if (options.utm_campaign) params.set('utm_campaign', options.utm_campaign);
  const qs = params.toString();
  return `${PUBLIC_ORIGIN}${path}${qs ? `?${qs}` : ''}`;
}

/** UniversalShareDialog: the text a personal share carries. */
export const shareTextOf = (content: Pick<ShareableContent, 'title' | 'description'>): string =>
  `${content.title}${content.description ? `\n${content.description}` : ''}`;

export type PersonalChannel = 'whatsapp' | 'viber' | 'email' | 'sms';

/** PersonalShareButtons: the link each app opens with the text and the share URL in the message. */
export function personalShareUrl(channel: PersonalChannel, text: string, url: string, title: string): string {
  const message = `${text}\n${url}`;
  switch (channel) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(message)}`;
    case 'viber':
      return `viber://forward?text=${encodeURIComponent(message)}`;
    case 'email':
      return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`;
    case 'sms':
    default:
      return `sms:?&body=${encodeURIComponent(message)}`;
  }
}

// ── public campaign CTA (src/lib/eventsCtaUtils.ts getPublicLandingCta) ────

export type PublicCtaAction = 'view-ticket' | 'sold-out' | 'buy-ticket' | 'get-free-ticket' | 'reserve';

export function publicLandingCta(o: { hasTickets: boolean; isPaid: boolean; isSoldOut?: boolean; isAuthenticated?: boolean; userHasTicket?: boolean }): { action: PublicCtaAction; disabled: boolean } {
  if (o.isAuthenticated && o.userHasTicket) return { action: 'view-ticket', disabled: false };
  if (o.hasTickets) {
    if (o.isSoldOut) return { action: 'sold-out', disabled: true };
    return { action: o.isPaid ? 'buy-ticket' : 'get-free-ticket', disabled: false };
  }
  return { action: 'reserve', disabled: false };
}

/** The catalog key of a CTA action's label (`getLocalizedLabel`). */
export const CTA_LABEL_KEY: Record<PublicCtaAction, string> = {
  'view-ticket': 'eventCta.viewTicket',
  'sold-out': 'eventCta.soldOut',
  'buy-ticket': 'eventCta.buyTicket',
  'get-free-ticket': 'eventCta.getFreeTicket',
  reserve: 'eventCta.reserveSpot',
};

/** PublicCampaignLanding `getCampaignTicketUrl`: the external ticket or booking link in the campaign, if any. */
export function campaignTicketUrl(c: { metadata?: Record<string, unknown> | null } & Record<string, unknown>): string | null {
  const m = (c.metadata ?? {}) as Record<string, unknown>;
  const pick = [c.ticket_url, c.checkout_url, m.ticket_url, m.booking_url, m.external_url, m.ticketUrl, m.bookingUrl, m.externalUrl].find((v) => typeof v === 'string' && v);
  return (pick as string | undefined) ?? null;
}
