/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — the member ticket list under
 * the Talk-to-Vitana form: native twin of the web `MyTicketsList` as this
 * screen mounts it (`headingKey="screens.community.yourReports"`,
 * `src/components/support/MyTicketsList.tsx`). Reads the shared
 * `GET /api/v1/feedback/tickets/mine?limit=100` query (support lane data
 * layer, 30 s refetch) and renders the ticket number, the six-word member
 * status (tinted per status, web `STATUS_TONE`), voice / severity badges, kind
 * · date · handler, the transcript, the received → fixed timeline, the answer
 * once resolved, "confirmed", and confirm / reopen (POST, then refetch + the
 * web's toasts). `?ticket=<id or FB-number>` highlights that ticket, keeps it
 * visible beyond the first page and reports its position so the screen
 * scrolls to it (web `scrollIntoView`).
 */
import { useMemo, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Spinner, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import {
  AiChatIcon,
  MEMBER_TIMELINE,
  MY_TICKETS_QUERY_KEY,
  matchesTicketRef,
  memberTicketStatus,
  ticketAction,
  ticketAnswer,
  timelineStep,
  useMyTickets,
  type MemberTicket,
} from '../../ports/ai-chat';
import { useI18n } from '../../i18n/I18nProvider';

const KNOWN_KINDS = new Set(['feedback', 'bug', 'ux_issue', 'support_question', 'account_issue', 'marketplace_claim', 'feature_request']);

function capitalize(name: string): string {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d) : '';
}

export type TalkTicketsListProps = {
  highlight?: string | null;
  headingKey?: string;
  pageSize?: number;
  /** The highlighted ticket's offset inside the list (the screen scrolls to it once). */
  onHighlightLayout?: (y: number) => void;
};

export function TalkTicketsList({ highlight, headingKey = 'supportTickets.title', pageSize = 10, onHighlightLayout }: TalkTicketsListProps): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const queryClient = useQueryClient();
  const query = useMyTickets();
  const [visible, setVisible] = useState(pageSize);
  const [busyId, setBusyId] = useState<string | null>(null);

  const tickets = useMemo(() => query.data ?? [], [query.data]);
  // A deep-linked ticket beyond the first page must still be visible.
  const highlightIndex = tickets.findIndex((tk) => matchesTicketRef(tk, highlight));
  const shown = tickets.slice(0, Math.max(visible, highlightIndex + 1));

  const tone = (status: string): { fg: string; bg: string } => {
    if (status === 'received') return { fg: colors.statusInfo, bg: colors.statusInfoSubtle };
    if (status === 'under_review' || status === 'in_progress') return { fg: colors.statusWarning, bg: colors.statusWarningSubtle };
    if (status === 'fixed') return { fg: colors.statusSuccess, bg: colors.statusSuccessSubtle };
    return { fg: colors.mutedForeground, bg: colors.muted };
  };

  const act = async (ticket: MemberTicket, action: 'confirm' | 'reopen') => {
    setBusyId(ticket.id);
    try {
      await ticketAction(ticket.id, action);
      await queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
      if (action === 'confirm') notify('toasts.community.thanks', 'toasts.community.weLlKeepEyeIt');
      else notify('toasts.community.reopened', 'toasts.community.vitanaWillFollowUp');
    } catch {
      notifyError(action === 'confirm' ? 'toasts.community.couldnTConfirm' : 'toasts.community.couldnTReopen');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.list} testID="talk-tickets">
      <Text size="sm" weight="600" accessibilityRole="header" testID="talk-tickets-heading">
        {t(headingKey)}
        {tickets.length > 0 ? ` (${tickets.length})` : ''}
      </Text>

      {query.isLoading ? (
        <View style={styles.row} testID="talk-tickets-loading">
          <Spinner accessibilityLabel={t('supportTickets.loading')} />
          <Text size="sm" muted>
            {t('supportTickets.loading')}
          </Text>
        </View>
      ) : null}

      {query.error && !query.data ? (
        <View style={styles.row} testID="talk-tickets-error">
          <Text size="sm" color={colors.destructive}>
            {t('supportTickets.loadError')}
          </Text>
          <Button size="sm" variant="outline" onPress={() => void query.refetch()} testID="talk-tickets-retry">
            {t('supportTickets.retry')}
          </Button>
        </View>
      ) : null}

      {query.data && tickets.length === 0 ? (
        <View testID="talk-tickets-empty" style={[styles.card, styles.center, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text weight="500" size="sm">
            {t('supportTickets.empty')}
          </Text>
          <Text size="sm" muted>
            {t('supportTickets.emptyHint')}
          </Text>
        </View>
      ) : null}

      {shown.map((ticket) => {
        const status = memberTicketStatus(ticket.status);
        const step = timelineStep(status);
        const answer = ticketAnswer(ticket);
        const highlighted = matchesTicketRef(ticket, highlight);
        const severity = ticket.structured_fields?.severity;
        const kind = t(`supportTickets.kind.${KNOWN_KINDS.has(ticket.kind) ? ticket.kind : 'other'}`);
        const meta = [kind, t('supportTickets.reportedOn', { date: formatDate(ticket.created_at, locale) })];
        if (ticket.resolver_agent) meta.push(t('supportTickets.handledBy', { name: capitalize(ticket.resolver_agent) }));
        const statusTone = tone(status);
        return (
          <View
            key={ticket.id}
            testID={`talk-ticket-${ticket.id}`}
            accessibilityState={highlighted ? { selected: true } : undefined}
            onLayout={highlighted && onHighlightLayout ? (e) => onHighlightLayout(e.nativeEvent.layout.y) : undefined}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              highlighted ? { borderColor: colors.primary, borderWidth: 2 } : null,
            ]}
          >
            <View style={styles.row}>
              <Text size="sm" weight="600" style={styles.ltr}>
                {ticket.ticket_number}
              </Text>
              <View style={[styles.status, { backgroundColor: statusTone.bg, borderColor: statusTone.fg }]} testID={`talk-ticket-status-${status}`}>
                <Text size="xs" weight="500" color={statusTone.fg}>
                  {t(`supportTickets.status.${status}`)}
                </Text>
              </View>
              {ticket.structured_fields?.voice_origin ? (
                <View style={[styles.status, { borderColor: colors.border }]}>
                  <AiChatIcon name="Mic" size={12} color={colors.mutedForeground} />
                  <Text size="xs">{t('supportTickets.viaVoice')}</Text>
                </View>
              ) : null}
              {severity ? <Badge variant="outline">{t(`supportTickets.severity.${severity}`)}</Badge> : null}
            </View>
            <Text size="xs" muted>
              {meta.join(' · ')}
            </Text>
            {ticket.raw_transcript ? (
              <Text size="sm" numberOfLines={2}>
                {ticket.raw_transcript}
              </Text>
            ) : null}
            {step >= 0 ? (
              <View style={styles.timeline} accessibilityLabel={t('supportTickets.timelineLabel')}>
                {MEMBER_TIMELINE.map((s, i) => (
                  <View key={s} style={styles.step} accessibilityState={i === step ? { selected: true } : undefined}>
                    <View style={[styles.bar, { backgroundColor: i <= step ? (status === 'fixed' ? colors.statusSuccess : colors.primary) : colors.muted }]} />
                    <Text size="xs" weight={i === step ? '600' : '400'} muted={i !== step} numberOfLines={1}>
                      {t(`supportTickets.status.${s}`)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {answer ? (
              <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.muted }]} testID={`talk-ticket-answer-${ticket.id}`}>
                <Text size="xs" weight="500" muted>
                  {t('supportTickets.ourAnswer')}
                </Text>
                <Text size="sm">{answer}</Text>
              </View>
            ) : null}
            {ticket.status === 'user_confirmed' ? (
              <View style={styles.row}>
                <AiChatIcon name="Check" size={14} color={colors.statusSuccess} />
                <Text size="xs" color={colors.statusSuccess}>
                  {t('supportTickets.confirmed')}
                </Text>
              </View>
            ) : null}
            {ticket.status === 'resolved' ? (
              <View style={[styles.box, { borderColor: colors.primary }]}>
                <Text size="sm" weight="500">
                  {ticket.resolver_agent ? t('supportTickets.didItWorkNamed', { name: capitalize(ticket.resolver_agent) }) : t('supportTickets.didItWork')}
                </Text>
                <View style={styles.row}>
                  <Button size="sm" disabled={busyId === ticket.id} onPress={() => void act(ticket, 'confirm')} testID={`talk-ticket-confirm-${ticket.id}`}>
                    {t('supportTickets.yesFixed')}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === ticket.id} onPress={() => void act(ticket, 'reopen')} testID={`talk-ticket-reopen-${ticket.id}`}>
                    {t('supportTickets.noStillBroken')}
                  </Button>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}

      {tickets.length > shown.length ? (
        <View style={styles.center}>
          <Button variant="ghost" size="sm" onPress={() => setVisible((v) => v + pageSize)} testID="talk-tickets-show-more">
            {t('supportTickets.showMore', { count: tickets.length - shown.length })}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  center: { alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  ltr: { writingDirection: 'ltr' },
  timeline: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, minWidth: 0, gap: 4 },
  bar: { height: 6, borderRadius: 999 },
  box: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 4 },
});
