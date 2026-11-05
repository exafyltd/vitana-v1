/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the card
 * variants of a chat bubble, native twins of the web components MessageBubble
 * renders:
 *
 *  - CalendarInviteCard (VTID-04917, gateway v2 card): kind badge, title, day ·
 *    time, place, "Over", "{yes} going · {maybe} maybe", I'm in / Maybe / No
 *    for invitees (POST respond; open_event / open_room navigate), "No answers
 *    yet" for the sender (CalendarInviteCard.tsx);
 *  - LegacyCalendarInvite (v1): badge, title, date + time, place, attendees,
 *    the note, then CalendarInviteStatus — the member's answer badge, the
 *    Accept / Decline / Maybe buttons, or for the sender "Invitation sent" /
 *    the response summary; refreshed by realtime on calendar_invite_responses;
 *  - ServiceBookingCard: badge, service, provider, text, action buttons;
 *  - quick replies of a `template` message;
 *  - SharedContentCard (VTID-05321): loading / error + retry / unavailable /
 *    the preview card that opens its in-app path;
 *  - VitanaCompanionCard (VTID-05100): the Unified Card System card under a
 *    Vitana note (eyebrow, title, text, action → the card's deep link; F4
 *    "Ask Vitana" opens the ORB), no X in the chat;
 *  - VitanaMessageActions (VTID-03587): navigate / redirect_event buttons;
 *  - MediaAlbum (VTID-05316): 2 / 3 / 2×2 tiles with "+N".
 */
import { useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, notify, notifyError, Skeleton, Text, useUITheme } from '../../../ports/ui';
import { ChatIcon } from '../../../ports/chat';
import { CARD_DEEP_LINKS, cardCategory, isVitanaCardType, type VitanaCardType } from '../../../ports/feed';
import { useActivateOrb } from '../../../ports/orb-activate';
import { getSupabase } from '../../../auth/client';
import { navigateToWebPath } from '../../../navigation/navigate';
import { useI18n } from '../../../i18n/I18nProvider';
import {
  CalendarApiError,
  fetchInviteState,
  getAllInviteResponses,
  getInviteResponse,
  inviteIsOver,
  respondToCalendarInvite,
  type CalendarInviteCardData,
  type InviteAction,
  type InviteResponse,
  type LegacyInviteResponse,
} from '../data/calendar';
import { fetchSharedPreview, isInAppPath, type SharedRef } from '../data/shared';

// ── v2 calendar invite card ────────────────────────────────────────────

const RESPONSES: InviteResponse[] = ['accepted', 'maybe', 'declined'];
const DONE_KEY: Partial<Record<InviteAction, string>> = {
  joined: 'vcal.inviteCard.joined',
  added: 'vcal.inviteCard.added',
  removed: 'vcal.inviteCard.removed',
  recorded: 'vcal.inviteCard.recorded',
};

export function CalendarInviteCard({ messageId, invite, isOwn }: { messageId: string; invite: CalendarInviteCardData; isOwn: boolean }) {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const queryClient = useQueryClient();
  const over = inviteIsOver(invite);
  const state = useQuery({ queryKey: ['calendar-invite', messageId], queryFn: () => fetchInviteState(messageId), staleTime: 30_000, retry: false });
  const answer = useMutation({
    mutationFn: (r: InviteResponse) => respondToCalendarInvite(messageId, r),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-invite', messageId] });
      if ((result.action === 'open_event' || result.action === 'open_room') && result.path) {
        notify(result.action === 'open_event' ? 'vcal.inviteCard.openEvent' : 'vcal.inviteCard.openRoom');
        navigateToWebPath(result.path);
        return;
      }
      const key = DONE_KEY[result.action];
      if (key) notify(key);
    },
    onError: (err) => notifyError(err instanceof CalendarApiError && err.message === 'EVENT_NOT_OPEN' ? 'vcal.inviteCard.notOpen' : 'vcal.inviteCard.error'),
  });
  const mine = state.data?.my_response ?? null;
  const counts = state.data?.counts;
  const canAnswer = !isOwn && !over && state.data?.is_sender !== true;
  const when = `${new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(invite.start_time))} · ${new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(new Date(invite.start_time))}`;
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]} testID="calendar-invite-card">
      <Badge variant="secondary">{t(`vcal.inviteCard.kind.${invite.ref_type}`)}</Badge>
      <Text style={styles.title}>{invite.title || t('vcal.feedCard.untitled')}</Text>
      <View style={styles.row}>
        <ChatIcon name="CalendarDays" size={14} color={colors.mutedForeground} />
        <Text muted style={styles.small}>
          {when}
        </Text>
      </View>
      {invite.location ? (
        <View style={styles.row}>
          <ChatIcon name="MapPin" size={14} color={colors.mutedForeground} />
          <Text muted style={styles.small}>
            {invite.location}
          </Text>
        </View>
      ) : null}
      {over ? (
        <Text muted style={styles.bold} testID="calendar-invite-over">
          {t('vcal.feedCard.past')}
        </Text>
      ) : null}
      {counts && (counts.accepted > 0 || counts.maybe > 0) ? (
        <Text muted style={styles.small} testID="calendar-invite-counts">
          {t('vcal.inviteCard.counts', { yes: counts.accepted, maybe: counts.maybe })}
        </Text>
      ) : null}
      {canAnswer ? (
        <View style={styles.row} accessibilityLabel={t('vcal.inviteCard.answer')}>
          {RESPONSES.map((r) => (
            <Button key={r} size="sm" variant={mine === r ? 'default' : 'secondary'} disabled={answer.isPending} onPress={() => answer.mutate(r)} accessibilityState={{ selected: mine === r }} testID={`calendar-invite-${r}`}>
              {t(`vcal.inviteCard.${r}`)}
            </Button>
          ))}
        </View>
      ) : null}
      {!canAnswer && !over && mine === null && isOwn && !counts?.accepted && !counts?.maybe ? (
        <Text muted style={styles.small} testID="calendar-invite-waiting">
          {t('vcal.inviteCard.waiting')}
        </Text>
      ) : null}
    </View>
  );
}

// ── v1 calendar invite with action buttons ─────────────────────────────

export type CardAction = { action?: string; type?: string; label?: string; variant?: string; data?: unknown; text?: string; messageId?: string; messageData?: unknown };

export function LegacyCalendarInvite({
  messageId,
  data,
  body,
  senderId,
  userId,
  actionButtons,
  onAction,
}: {
  messageId: string;
  data: Record<string, unknown>;
  body?: string;
  senderId: string;
  userId?: string;
  actionButtons?: CardAction[] | null;
  onAction?: (a: CardAction) => Promise<void> | void;
}) {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const isSender = senderId === userId || data.sender_id === userId;
  const [response, setResponse] = useState<LegacyInviteResponse | null>(null);
  const [all, setAll] = useState<LegacyInviteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    const load = async () => {
      try {
        if (isSender) setAll(await getAllInviteResponses(messageId));
        else setResponse(await getInviteResponse(messageId, userId));
      } catch {
        // The card still shows without the answers.
      } finally {
        setLoading(false);
      }
    };
    void load();
    const supabase = getSupabase();
    const channel = supabase
      .channel(`invite-response-${messageId}`)
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'calendar_invite_responses', filter: `message_id=eq.${messageId}` }, (payload: { eventType?: string; new?: { user_id?: string } }) => {
        if (isSender && payload.eventType === 'INSERT' && payload.new?.user_id !== userId) notify('toasts.messages.newResponse');
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [messageId, userId, isSender]);

  const date = typeof data.date === 'string' ? data.date : null;
  const counts = { accepted: all.filter((r) => r.response === 'accepted').length, declined: all.filter((r) => r.response === 'declined').length, maybe: all.filter((r) => r.response === 'maybe').length };
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]} testID="bubble-calendar-invite">
      <View style={styles.between}>
        <Badge variant="secondary">{t('screens.messages.calendarInvite')}</Badge>
        {data.priority === 'high' ? <Badge variant="destructive">{t('screens.messages.highPriority')}</Badge> : null}
      </View>
      <Text style={styles.title}>{typeof data.title === 'string' && data.title ? data.title : t('chatNative.invite.untitled')}</Text>
      {date ? (
        <View style={styles.row}>
          <ChatIcon name="Clock" size={14} color={colors.mutedForeground} />
          <Text muted style={styles.small}>
            {new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(new Date(date))}
            {typeof data.time === 'string' && data.time ? ` · ${data.time}` : ''}
          </Text>
        </View>
      ) : null}
      {typeof data.location === 'string' && data.location ? (
        <View style={styles.row}>
          <ChatIcon name="MapPin" size={14} color={colors.mutedForeground} />
          <Text muted style={styles.small}>
            {data.location}
          </Text>
        </View>
      ) : null}
      {data.attendees ? (
        <View style={styles.row}>
          <ChatIcon name="Users" size={14} color={colors.mutedForeground} />
          <Text muted style={styles.small}>
            {t('screens.messages.attendeesAttendees', { attendees: String(data.attendees) })}
          </Text>
        </View>
      ) : null}
      {body ? (
        <Text muted style={[styles.small, styles.note, { borderColor: colors.border }]}>
          {body}
        </Text>
      ) : null}
      {loading ? null : response ? (
        <Badge variant="secondary" testID={`invite-status-${response.response}`}>
          {t(`screens.messages.${response.response}`)}
        </Badge>
      ) : isSender ? (
        all.length === 0 ? (
          actionButtons?.length ? (
            <Badge variant="secondary" testID="invite-sent">
              {t('screens.messages.invitationSent')}
            </Badge>
          ) : (
            <Text muted style={styles.small}>
              {t('screens.messages.noResponsesYet')}
            </Text>
          )
        ) : (
          <View style={styles.row} testID="invite-summary">
            {counts.accepted ? <Badge variant="secondary">{t('screens.messages.acceptedcountAccepted', { acceptedCount: counts.accepted })}</Badge> : null}
            {counts.declined ? <Badge variant="secondary">{t('screens.messages.declinedcountDeclined', { declinedCount: counts.declined })}</Badge> : null}
            {counts.maybe ? <Badge variant="secondary">{t('screens.messages.maybecountMaybe', { maybeCount: counts.maybe })}</Badge> : null}
          </View>
        )
      ) : actionButtons?.length ? (
        <View style={styles.row}>
          {actionButtons.map((b, i) => (
            <Button
              key={`${b.action}-${i}`}
              size="sm"
              disabled={submitting}
              variant={b.action === 'calendar_accept' ? 'default' : b.action === 'calendar_decline' ? 'outline' : 'secondary'}
              onPress={async () => {
                setSubmitting(true);
                try {
                  await onAction?.({ ...b, messageData: data, messageId });
                } finally {
                  setSubmitting(false);
                }
              }}
              testID={`invite-action-${b.action}`}
            >
              {b.label ?? ''}
            </Button>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── service booking + template quick replies ───────────────────────────

export function ServiceBookingCard({ messageId, data, body, actionButtons, onAction }: { messageId: string; data: Record<string, unknown>; body?: string; actionButtons?: CardAction[] | null; onAction?: (a: CardAction) => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]} testID="service-booking-card">
      <Badge variant="secondary">{t('screens.messages.serviceBooking')}</Badge>
      <Text style={styles.title}>{typeof data.service_name === 'string' && data.service_name ? data.service_name : t('chatNative.booking.untitled')}</Text>
      {typeof data.provider_name === 'string' ? (
        <Text muted style={styles.small}>
          {data.provider_name}
        </Text>
      ) : null}
      {body ? <Text style={styles.small}>{body}</Text> : null}
      {actionButtons?.length ? (
        <View style={styles.row}>
          {actionButtons.map((b, i) => (
            <Button key={`${b.action}-${i}`} size="sm" variant={b.variant === 'outline' ? 'outline' : b.variant === 'secondary' ? 'secondary' : 'default'} onPress={() => onAction?.({ ...b, messageId })} testID={`booking-action-${i}`}>
              {b.label ?? ''}
            </Button>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function QuickReplies({ messageId, replies, onAction }: { messageId: string; replies: unknown; onAction?: (a: CardAction) => void }) {
  if (!Array.isArray(replies) || replies.length === 0) return null;
  return (
    <View style={styles.wrap} testID="template-quick-replies">
      {replies.map((reply, i) => (
        <Button key={`${String(reply)}-${i}`} size="sm" variant="outline" onPress={() => onAction?.({ type: 'quick_reply', text: String(reply), messageId })} testID={`quick-reply-${i}`}>
          {String(reply)}
        </Button>
      ))}
    </View>
  );
}

// ── shared post / event / product / profile ────────────────────────────

const KIND_ICON = { post: 'FileText', event: 'CalendarDays', product: 'ShoppingBag', profile: 'User' } as const;

export function SharedContentCard({ sharedRef, isOwn, userId }: { sharedRef: SharedRef; isOwn: boolean; userId?: string }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const preview = useQuery({ queryKey: ['chat-shared-preview', userId ?? null, sharedRef.kind, sharedRef.id], queryFn: () => fetchSharedPreview(sharedRef), staleTime: 60_000, retry: false });
  const kindLabel = t(`inbox.shared.kind.${sharedRef.kind}`);
  const frame = [styles.shared, { borderColor: isOwn ? colors.primary : colors.border, backgroundColor: colors.card }];
  if (preview.isLoading) {
    return (
      <View style={[frame, styles.pad]} accessibilityLabel={t('inbox.shared.loading')} testID="shared-card-loading">
        <Skeleton style={styles.sharedImage} />
        <Skeleton style={styles.line} />
      </View>
    );
  }
  if (preview.isError || !preview.data) {
    return (
      <View style={[frame, styles.pad, styles.row]} testID="shared-card-error">
        <ChatIcon name={KIND_ICON[sharedRef.kind]} size={16} color={colors.mutedForeground} />
        <Text muted style={styles.flex}>
          {t('inbox.shared.loadFailed')}
        </Text>
        <Pressable onPress={() => void preview.refetch()} accessibilityRole="button" accessibilityLabel={t('inbox.shared.retry')} style={styles.icon44} testID="shared-card-retry">
          <ChatIcon name="RotateCw" size={16} />
        </Pressable>
      </View>
    );
  }
  const p = preview.data;
  if (p.available === false) {
    return (
      <View style={[frame, styles.pad, styles.row]} testID={`shared-card-unavailable-${p.reason}`}>
        <ChatIcon name={p.reason === 'deleted' ? 'Trash2' : 'EyeOff'} size={16} color={colors.mutedForeground} />
        <View style={styles.flex}>
          <Text style={styles.bold}>{t(`inbox.shared.unavailable.${p.reason}.title`, { kind: kindLabel })}</Text>
          <Text muted style={styles.small}>
            {t(`inbox.shared.unavailable.${p.reason}.body`)}
          </Text>
        </View>
      </View>
    );
  }
  const round = sharedRef.kind === 'profile';
  const inApp = isInAppPath(p.url);
  return (
    <Pressable
      onPress={() => inApp && navigateToWebPath(p.url)}
      disabled={!inApp}
      accessibilityRole="button"
      accessibilityLabel={t('inbox.shared.open', { kind: kindLabel, title: p.title })}
      style={frame}
      testID="shared-card"
    >
      {p.image_url && !round ? <Image source={{ uri: p.image_url }} style={styles.sharedImage} /> : null}
      <View style={[styles.row, styles.pad]}>
        {p.image_url && round ? <Image source={{ uri: p.image_url }} style={styles.roundImage} /> : null}
        <View style={styles.flex}>
          <View style={styles.row}>
            <ChatIcon name={KIND_ICON[sharedRef.kind]} size={12} color={colors.mutedForeground} />
            <Text muted style={styles.small}>
              {kindLabel}
            </Text>
          </View>
          <Text style={styles.bold} numberOfLines={2}>
            {p.title || kindLabel}
          </Text>
          {p.description ? (
            <Text muted style={styles.small} numberOfLines={2}>
              {p.description}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ── Vitana companion card + actions ────────────────────────────────────

export interface VitanaCardPayload {
  kind: 'vitana_card';
  v: 1;
  card_type: VitanaCardType;
  params?: Record<string, unknown>;
}

export function isVitanaCardPayload(value: unknown): value is VitanaCardPayload {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  if (p.kind !== 'vitana_card' || p.v !== 1 || !isVitanaCardType(p.card_type as string)) return false;
  return p.params === undefined || (typeof p.params === 'object' && p.params !== null && !Array.isArray(p.params));
}

const EYEBROW: Partial<Record<string, string>> = {
  E1: 'screens.vitanaCards.eyebrowProfile', E2: 'screens.vitanaCards.eyebrowProfile', E4: 'screens.vitanaCards.eyebrowProfile', E5: 'screens.vitanaCards.eyebrowProfile', E11: 'screens.vitanaCards.eyebrowProfile',
  E3: 'screens.vitanaCards.eyebrowCommunity', E6: 'screens.vitanaCards.eyebrowConnect', E7: 'screens.vitanaCards.eyebrowConnect', E8: 'screens.vitanaCards.eyebrowConnect', E9: 'screens.vitanaCards.eyebrowConnect',
  E10: 'screens.vitanaCards.eyebrowNotifications',
};

/** The copy of a card (the web card components' COPY keys; F1/F2/F7/F8 are the home widgets'). */
export function companionCopy(type: string, params: Record<string, unknown> = {}): { eyebrow: string; title: string; description?: string; descriptionParams?: Record<string, string | number>; action?: string; to?: string; orb?: boolean } {
  switch (type) {
    case 'F1':
      return { eyebrow: 'screens.home.longevityJourneyEyebrow', title: 'screens.home.longevityJourneyAllDone', action: 'screens.vitanaIdentity.viewJourney', to: '/autopilot' };
    case 'F2':
      return { eyebrow: 'screens.home.vitanaIndexEyebrow', title: 'screens.home.vitanaIndexEyebrow', description: typeof params.score === 'number' ? 'chatNative.companion.indexScore' : undefined, descriptionParams: { score: Number(params.score) || 0 } };
    case 'F7':
      return { eyebrow: 'screens.downloadFlyer.inviteCardEyebrow', title: 'screens.downloadFlyer.inviteCardTitle', description: 'screens.downloadFlyer.inviteCardBody' };
    case 'F8':
      return { eyebrow: 'screens.proactive.didYouKnow', title: 'screens.proactive.didYouKnow' };
    default:
      return {
        eyebrow: EYEBROW[type] ?? `screens.vitanaCards.${type}.eyebrow`,
        title: `screens.vitanaCards.${type}.title`,
        description: `screens.vitanaCards.${type}.description`,
        action: `screens.vitanaCards.${type}.action`,
        to: CARD_DEEP_LINKS[type as VitanaCardType],
        orb: type === 'F4',
      };
  }
}

export function VitanaCompanionCard({ card }: { card: VitanaCardPayload }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const activateOrb = useActivateOrb();
  const copy = companionCopy(card.card_type, card.params);
  const category = cardCategory(card.card_type);
  const accent = category === 'boost' ? colors.destructive : category === 'feature' ? colors.accent : colors.primary;
  const go = () => {
    if (copy.orb && activateOrb()) return;
    if (copy.to) navigateToWebPath(copy.to);
  };
  return (
    <Pressable onPress={go} disabled={!copy.to && !copy.orb} accessibilityRole="button" style={[styles.companion, { backgroundColor: colors.card, borderColor: colors.border }]} testID="vitana-companion-card">
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={[styles.flex, styles.pad]}>
        <Text muted style={styles.small}>
          {t(copy.eyebrow)}
        </Text>
        <Text style={styles.title}>{t(copy.title)}</Text>
        {copy.description ? (
          <Text muted style={styles.small}>
            {t(copy.description, copy.descriptionParams)}
          </Text>
        ) : null}
        {copy.action && (copy.to || copy.orb) ? (
          <View style={styles.row}>
            <Button size="sm" onPress={go} testID={`vitana-companion-action-${card.card_type}`}>
              {t(copy.action)}
            </Button>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export interface VitanaDmAction {
  kind?: string;
  screen_id?: string;
  route?: string;
  title?: string;
  event?: string;
  section?: string;
  field?: string;
}

export function readVitanaActions(contentData: unknown): VitanaDmAction[] {
  if (!contentData || typeof contentData !== 'object') return [];
  const actions = (contentData as { actions?: unknown }).actions;
  if (!Array.isArray(actions)) return [];
  return actions.filter((a): a is VitanaDmAction => !!a && typeof a === 'object' && !Array.isArray(a));
}

/** web VitanaMessageActions: `navigate` opens the route; `redirect_event` is emitted app-wide (the web's window CustomEvent). */
export function VitanaMessageActions({ contentData }: { contentData: unknown }) {
  const { t } = useI18n();
  const actions = readVitanaActions(contentData).filter((a) => !(a.kind === 'navigate' && !a.route) && !(a.kind === 'redirect_event' && !a.event));
  if (actions.length === 0) return null;
  return (
    <View style={styles.wrap} testID="vitana-message-actions">
      {actions.map((a, i) => (
        <Button
          key={`${a.kind}-${a.screen_id ?? a.event ?? i}`}
          size="sm"
          variant="secondary"
          onPress={() => {
            if (a.kind === 'navigate' && a.route) navigateToWebPath(a.route);
            else if (a.kind === 'redirect_event' && a.event) DeviceEventEmitter.emit(a.event, { section: a.section, field: a.field });
          }}
          testID={`vitana-action-${i}`}
        >
          {a.title?.trim() || t('screens.messages.vitanaOpenScreen')}
        </Button>
      ))}
    </View>
  );
}

// ── media album ────────────────────────────────────────────────────────

export const ALBUM_VISIBLE = 4;
const VIDEO_NAME_RX = /\.(mp4|webm|mov|m4v)$/i;

export function isVideoAttachment(att: { type?: string; mime?: string; filename?: string; name?: string } | null | undefined): boolean {
  if (!att) return false;
  return att.type === 'video' || (att.mime || '').toLowerCase().startsWith('video/') || VIDEO_NAME_RX.test(att.filename || att.name || '');
}

export function albumLayout(count: number): { shown: number; more: number; variant: 'two' | 'three' | 'grid' | 'none' } {
  if (count < 2) return { shown: count, more: 0, variant: 'none' };
  if (count === 2) return { shown: 2, more: 0, variant: 'two' };
  if (count === 3) return { shown: 3, more: 0, variant: 'three' };
  return { shown: ALBUM_VISIBLE, more: count > ALBUM_VISIBLE ? count - (ALBUM_VISIBLE - 1) : 0, variant: 'grid' };
}

export type AlbumItem = { key: string; kind: 'image' | 'video'; url: string | undefined; alt: string };

export function MediaAlbum({ items, onOpen }: { items: AlbumItem[]; onOpen: (index: number) => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { shown, more, variant } = albumLayout(items.length);
  if (variant === 'none') return null;
  return (
    <View style={styles.album} testID={`media-album-${variant}`}>
      {items.slice(0, shown).map((item, index) => {
        const isMore = more > 0 && index === shown - 1;
        const wide = variant === 'three' && index === 0;
        const label = isMore ? t('inbox.media.moreItems', { count: more }) : item.kind === 'video' ? t('inbox.media.openVideo', { name: item.alt }) : t('inbox.media.openImage', { name: item.alt });
        return (
          <Pressable key={item.key} onPress={() => onOpen(index)} accessibilityRole="imagebutton" accessibilityLabel={label} style={[wide ? styles.tileWide : styles.tile, { backgroundColor: colors.muted }]} testID="media-album-tile">
            {item.url === undefined ? (
              <View style={styles.fill} accessibilityLabel={t('screens.messages.imageLoading')} testID="media-album-skeleton" />
            ) : item.kind === 'video' ? (
              <View style={[styles.fill, styles.center]}>
                <ChatIcon name="Play" size={20} />
              </View>
            ) : (
              <Image source={{ uri: item.url }} style={styles.fill} resizeMode="cover" />
            )}
            {isMore ? (
              <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.foreground, opacity: 0.6 }]} testID="media-album-more">
                <Text style={[styles.title, { color: colors.background }]}>+{more}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6, maxWidth: 300 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  title: { fontSize: 16, fontWeight: '600' },
  bold: { fontWeight: '600' },
  small: { fontSize: 13 },
  note: { borderStartWidth: 2, paddingStart: 8, marginTop: 4 },
  shared: { width: 256, maxWidth: '100%', borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  pad: { padding: 12, gap: 4 },
  flex: { flex: 1, minWidth: 0 },
  sharedImage: { width: '100%', height: 128 },
  roundImage: { width: 44, height: 44, borderRadius: 22 },
  line: { height: 14, width: '70%', marginTop: 8 },
  icon44: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  companion: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginTop: 6, maxWidth: 360 },
  accent: { width: 4 },
  album: { width: 288, maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 2, borderRadius: 8, overflow: 'hidden' },
  tile: { width: 143, height: 143, overflow: 'hidden' },
  tileWide: { width: 288, height: 162, overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
