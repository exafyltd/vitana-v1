/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — twin of the web
 * `src/components/feedback/FeedbackReportList.tsx`, which renders
 * `MyTicketsList` with `kinds={['bug', 'ux_issue']}`, `pageSize={5}` and the
 * "My reports" heading: the member's tickets (`GET /feedback/tickets/mine`,
 * refetched every 30 s and when `refreshKey` changes), each with its FB-number,
 * member status, voice / severity badges, kind + reported date (+ handler),
 * transcript, the four-step timeline, the answer once fixed, and
 * confirm / reopen while it awaits the member. Loading, error (+ retry) and
 * empty states; "Show more" pages by five. The status badge colours map to
 * the kit's Badge variants (tokens only, no raw colour). The web list's
 * `?ticket=` highlight is not used on the Diary (no caller passes it there).
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Text, notify, notifyError, useUITheme, type BadgeVariant } from '../../ports/ui';
import { DiaryIcon } from '../../ports/diary';
import {
  DIARY_REPORT_KINDS,
  KNOWN_KINDS,
  MEMBER_TIMELINE,
  MY_TICKETS_QUERY_KEY,
  memberTicketStatus,
  ticketAnswer,
  timelineStep,
  useMyTickets,
  useTicketAction,
  type MemberTicket,
  type MemberTicketStatus,
} from './data/tickets';
import { DiaryCard } from './components';
import { useDiaryText } from './text';

const PAGE_SIZE = 5;

const STATUS_VARIANT: Record<MemberTicketStatus, BadgeVariant> = {
  received: 'outline',
  under_review: 'secondary',
  in_progress: 'secondary',
  fixed: 'success',
  wont_fix: 'outline',
  duplicate: 'outline',
};

const capitalize = (name: string) => (name ? name.charAt(0).toUpperCase() + name.slice(1) : name);

function TicketCard({ ticket }: { ticket: MemberTicket }) {
  const x = useDiaryText();
  const { t } = x;
  const { colors } = useUITheme();
  const action = useTicketAction();
  const status = memberTicketStatus(ticket.status);
  const step = timelineStep(status);
  const answer = ticketAnswer(ticket);
  const severity = ticket.structured_fields?.severity;
  const busy = action.isPending;

  const act = (kind: 'confirm' | 'reopen') =>
    action.mutate(
      { id: ticket.id, action: kind },
      {
        onSuccess: () => (kind === 'confirm' ? notify('toasts.community.thanks', 'toasts.community.weLlKeepEyeIt') : notify('toasts.community.reopened', 'toasts.community.vitanaWillFollowUp')),
        onError: () => notifyError(kind === 'confirm' ? 'toasts.community.couldnTConfirm' : 'toasts.community.couldnTReopen'),
      },
    );

  return (
    <DiaryCard testID="member-ticket">
      <View style={styles.row}>
        <Text weight="600" style={styles.mono}>
          {`\u2066${ticket.ticket_number}\u2069`}
        </Text>
        <Badge variant={STATUS_VARIANT[status]} testID="member-ticket-status">
          {t(`supportTickets.status.${status}`)}
        </Badge>
        {ticket.structured_fields?.voice_origin ? <Badge variant="outline">{t('supportTickets.viaVoice')}</Badge> : null}
        {severity ? <Badge variant="outline">{t(`supportTickets.severity.${severity}`)}</Badge> : null}
      </View>
      <Text variant="caption" muted>
        {[
          t(`supportTickets.kind.${KNOWN_KINDS.has(ticket.kind) ? ticket.kind : 'other'}`),
          t('supportTickets.reportedOn', { date: x.fmtDate(ticket.created_at, { dateStyle: 'medium' }) }),
          ...(ticket.resolver_agent ? [t('supportTickets.handledBy', { name: capitalize(ticket.resolver_agent) })] : []),
        ].join(' · ')}
      </Text>
      {ticket.raw_transcript ? <Text numberOfLines={2}>{ticket.raw_transcript}</Text> : null}
      {step >= 0 ? (
        <View style={styles.timeline} accessibilityLabel={t('supportTickets.timelineLabel')} testID="member-ticket-timeline">
          {MEMBER_TIMELINE.map((s, i) => (
            <View key={s} style={styles.step} accessibilityState={{ selected: i === step }}>
              <View style={[styles.bar, { backgroundColor: i <= step ? (status === 'fixed' ? colors.statusSuccess : colors.primary) : colors.muted }]} />
              <Text variant="caption" numberOfLines={1} weight={i === step ? '600' : '400'} muted={i !== step}>
                {t(`supportTickets.status.${s}`)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {answer ? (
        <View testID="ticket-answer" style={[styles.answer, { borderColor: colors.border, backgroundColor: colors.muted }]}>
          <Text variant="caption" muted weight="600">
            {t('supportTickets.ourAnswer')}
          </Text>
          <Text>{answer}</Text>
        </View>
      ) : null}
      {ticket.status === 'user_confirmed' ? (
        <View style={styles.row}>
          <DiaryIcon name="Check" size={14} color={colors.statusSuccess} />
          <Text variant="caption" color={colors.statusSuccess}>
            {t('supportTickets.confirmed')}
          </Text>
        </View>
      ) : null}
      {ticket.status === 'resolved' ? (
        <View style={[styles.answer, { borderColor: colors.primary }]} testID="member-ticket-confirm">
          <Text weight="600">{ticket.resolver_agent ? t('supportTickets.didItWorkNamed', { name: capitalize(ticket.resolver_agent) }) : t('supportTickets.didItWork')}</Text>
          <View style={styles.row}>
            <Button size="sm" disabled={busy} testID="member-ticket-yes" onPress={() => act('confirm')}>
              {t('supportTickets.yesFixed')}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} testID="member-ticket-reopen" onPress={() => act('reopen')}>
              {t('supportTickets.noStillBroken')}
            </Button>
          </View>
        </View>
      ) : null}
    </DiaryCard>
  );
}

export function FeedbackReportList({ refreshKey }: { refreshKey?: number }): ReactElement {
  const { t } = useDiaryText();
  const qc = useQueryClient();
  const query = useMyTickets();
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (refreshKey) void qc.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
  }, [refreshKey, qc]);

  const tickets = useMemo(() => (query.data ?? []).filter((tk) => DIARY_REPORT_KINDS.includes(tk.kind)), [query.data]);
  const shown = tickets.slice(0, visible);

  return (
    <View style={styles.section} testID="diary-reports">
      <Text weight="600" size="sm" accessibilityRole="header">
        {t('supportTickets.diary.title')}
        {tickets.length > 0 ? <Text muted size="sm">{` (${tickets.length})`}</Text> : null}
      </Text>
      {query.isLoading ? (
        <Text muted size="sm" testID="diary-reports-loading">
          {t('supportTickets.loading')}
        </Text>
      ) : null}
      {query.isError && !query.data ? (
        <View style={styles.row} testID="diary-reports-error">
          <Text size="sm">{t('supportTickets.loadError')}</Text>
          <Button size="sm" variant="outline" testID="diary-reports-retry" onPress={() => void query.refetch()}>
            {t('supportTickets.retry')}
          </Button>
        </View>
      ) : null}
      {query.data && tickets.length === 0 ? (
        <DiaryCard testID="diary-reports-empty" style={styles.center}>
          <Text weight="600" size="sm">
            {t('supportTickets.empty')}
          </Text>
          <Text muted size="sm" style={styles.centerText}>
            {t('supportTickets.emptyHint')}
          </Text>
        </DiaryCard>
      ) : null}
      {shown.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
      {tickets.length > shown.length ? (
        <View style={styles.center}>
          <Button variant="ghost" size="sm" testID="diary-reports-more" onPress={() => setVisible((v) => v + PAGE_SIZE)}>
            {t('supportTickets.showMore', { count: tickets.length - shown.length })}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  mono: { fontVariant: ['tabular-nums'] },
  timeline: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, minWidth: 0, gap: 4 },
  bar: { height: 6, borderRadius: 3 },
  answer: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 4 },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
});
