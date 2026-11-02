/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — native twin of the web
 * member ticket list (`src/components/support/MyTicketsList.tsx`) on Support →
 * My tickets: ticket number, the six-word member status vocabulary, the
 * received → fixed timeline, the answer once resolved, confirm / reopen, and
 * the `?ticket=` highlight. Reads GET /feedback/tickets/mine; confirm / reopen
 * are writes (POST), mocked in tests.
 */
import { useMemo, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Icon, Spinner, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { Panel } from './components';
import { formatDate } from './format';
import {
  MEMBER_TIMELINE,
  MY_TICKETS_QUERY_KEY,
  matchesTicketRef,
  memberTicketStatus,
  ticketAction,
  ticketAnswer,
  timelineStep,
  useMyTickets,
  type MemberTicket,
} from './data/tickets';

const KNOWN_KINDS = new Set(['feedback', 'bug', 'ux_issue', 'support_question', 'account_issue', 'marketplace_claim', 'feature_request']);

function capitalize(name: string): string {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

export function MyTicketsList({ highlight, pageSize = 10 }: { highlight?: string | null; pageSize?: number }): ReactElement {
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
    <View style={styles.list} testID="my-tickets">
      <Text size="sm" weight="600" accessibilityRole="header">
        {t('supportTickets.title')}
        {tickets.length > 0 ? ` (${tickets.length})` : ''}
      </Text>

      {query.isLoading ? (
        <View style={styles.row} testID="my-tickets-loading">
          <Spinner accessibilityLabel={t('supportTickets.loading')} />
          <Text size="sm" muted>
            {t('supportTickets.loading')}
          </Text>
        </View>
      ) : null}

      {query.error && !query.data ? (
        <View style={styles.row} testID="my-tickets-error">
          <Text size="sm" color={colors.destructive}>
            {t('supportTickets.loadError')}
          </Text>
          <Button size="sm" variant="outline" onPress={() => void query.refetch()}>
            {t('supportTickets.retry')}
          </Button>
        </View>
      ) : null}

      {query.data && tickets.length === 0 ? (
        <Panel testID="my-tickets-empty" style={styles.center}>
          <Text weight="500" size="sm">
            {t('supportTickets.empty')}
          </Text>
          <Text size="sm" muted>
            {t('supportTickets.emptyHint')}
          </Text>
        </Panel>
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
        return (
          <Panel
            key={ticket.id}
            testID={`member-ticket-${ticket.id}`}
            style={highlighted ? { borderColor: colors.primary, borderWidth: 2 } : undefined}
          >
            <View style={styles.badges}>
              <Text size="sm" weight="600" style={styles.ltr}>
                {ticket.ticket_number}
              </Text>
              <Badge variant="outline">{t(`supportTickets.status.${status}`)}</Badge>
              {ticket.structured_fields?.voice_origin ? <Badge variant="outline">{t('supportTickets.viaVoice')}</Badge> : null}
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
                  <View key={s} style={styles.step}>
                    <View
                      style={[
                        styles.bar,
                        { backgroundColor: i <= step ? (status === 'fixed' ? colors.statusSuccess : colors.primary) : colors.muted },
                      ]}
                    />
                    <Text size="xs" weight={i === step ? '600' : '400'} muted={i !== step} numberOfLines={1}>
                      {t(`supportTickets.status.${s}`)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {answer ? (
              <View style={[styles.answer, { borderColor: colors.border, backgroundColor: colors.muted }]} testID="ticket-answer">
                <Text size="xs" weight="500" muted>
                  {t('supportTickets.ourAnswer')}
                </Text>
                <Text size="sm">{answer}</Text>
              </View>
            ) : null}
            {ticket.status === 'user_confirmed' ? (
              <View style={styles.row}>
                <Icon name="Check" size={14} color={colors.statusSuccess} />
                <Text size="xs" color={colors.statusSuccess}>
                  {t('supportTickets.confirmed')}
                </Text>
              </View>
            ) : null}
            {ticket.status === 'resolved' ? (
              <View style={[styles.answer, { borderColor: colors.primary }]}>
                <Text size="sm" weight="500">
                  {ticket.resolver_agent
                    ? t('supportTickets.didItWorkNamed', { name: capitalize(ticket.resolver_agent) })
                    : t('supportTickets.didItWork')}
                </Text>
                <View style={styles.row}>
                  <Button size="sm" disabled={busyId === ticket.id} onPress={() => void act(ticket, 'confirm')} testID={`ticket-confirm-${ticket.id}`}>
                    {t('supportTickets.yesFixed')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === ticket.id}
                    onPress={() => void act(ticket, 'reopen')}
                    testID={`ticket-reopen-${ticket.id}`}
                  >
                    {t('supportTickets.noStillBroken')}
                  </Button>
                </View>
              </View>
            ) : null}
          </Panel>
        );
      })}

      {tickets.length > shown.length ? (
        <View style={styles.center}>
          <Button variant="ghost" size="sm" onPress={() => setVisible((v) => v + pageSize)} testID="tickets-show-more">
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
  badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  ltr: { writingDirection: 'ltr' },
  timeline: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, minWidth: 0, gap: 4 },
  bar: { height: 6, borderRadius: 999 },
  answer: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 4 },
});
