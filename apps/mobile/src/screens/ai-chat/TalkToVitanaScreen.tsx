/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — native port of the phone
 * branch of `src/pages/community/TalkToVitana.tsx` (`/comm/talk-to-vitana`,
 * ledger row COMM.TALK_TO_VITANA), the text-first feedback / ticket capture
 * screen. On a phone the web renders, in order (TalkToVitana.tsx:136-200):
 *
 *   AppLayout → MobileAppShell     the N3 shell supplies this chrome here
 *   StandardHeader                 phones: the title only (StandardHeader.tsx:42-50)
 *   SubNavigation                  the Community sections row
 *   Panel                          "What's on your mind?", topic Select
 *                                  (TICKET_KINDS, label + hint), Textarea
 *                                  (6 rows, max 10 000), Send, the success
 *                                  notice with the ticket number + "View
 *                                  ticket" (`?ticket=` link), the AI note
 *   EnrichmentCardStrip            screen="talk-to-vitana"
 *   MyTicketsList                  headingKey="screens.community.yourReports"
 *
 * The page renders no utility bar of its own (no search / calendar / Life
 * Compass / gift voucher: none appear in TalkToVitana.tsx), no sheet and no
 * modal; `SEO` is a web <head> tag. Submit posts through the native
 * community-gateway twin (`data/tickets.ts`); an empty text is blocked (the
 * button is disabled and the web's "Add a description" toast guards the
 * handler). "View ticket" sets `?ticket=` on this route, which highlights and
 * scrolls to that ticket, as a push / notification link with `?ticket=` does.
 * Voice intake is not part of this screen (its web header comment). React 19:
 * typed with `ReactElement`.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Text, notifyError, useUITheme } from '../../ports/ui';
import {
  AiChatIcon,
  ButtonIcon,
  MY_TICKETS_QUERY_KEY,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  type TicketKind,
} from '../../ports/ai-chat';
import { useI18n } from '../../i18n/I18nProvider';
import { CommunitySubNav } from './CommunitySubNav';
import { TalkTicketsList } from './TalkTicketsList';
import { VitanaCardStrip } from './VitanaCardStrip';
import { TALK_MAX_LENGTH, TALK_SCREEN_PATH, TICKET_KINDS, buildTalkTicketBody, submitTalkTicket, type CreatedTalkTicket } from './data/tickets';

export function TalkToVitanaScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ ticket?: string }>();
  const highlight = typeof params.ticket === 'string' && params.ticket ? params.ticket : null;
  const [text, setText] = useState('');
  const [kind, setKind] = useState<TicketKind>('feedback');
  const [submitting, setSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<CreatedTalkTicket>(null);

  // Scroll to a deep-linked ticket once its card has laid out (web scrollIntoView).
  const scrollRef = useRef<ScrollView>(null);
  const listY = useRef(0);
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!highlight) scrolledFor.current = null;
  }, [highlight]);
  const onHighlightLayout = (y: number) => {
    if (!highlight || scrolledFor.current === highlight) return;
    scrolledFor.current = highlight;
    scrollRef.current?.scrollTo({ y: Math.max(0, listY.current + y - 16), animated: true });
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      notifyError('toasts.community.addDescription', 'toasts.community.tellVitanaWhatSYourMind');
      return;
    }
    setSubmitting(true);
    try {
      const created = await submitTalkTicket(buildTalkTicketBody(text, kind));
      setText('');
      setKind('feedback');
      if (created) setLastTicket(created);
      await queryClient.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY });
    } catch {
      notifyError('toasts.community.couldnTSubmit');
    } finally {
      setSubmitting(false);
    }
  };

  const canSend = !submitting && !!text.trim();

  return (
    <KeyboardAvoidingView style={[styles.fill, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} testID="screen-talk-to-vitana" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text size="lg" weight="700" accessibilityRole="header">
          {t('screens.community.talkVitana')}
        </Text>

        <CommunitySubNav activePath={TALK_SCREEN_PATH} />

        <View testID="talk-form" style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <AiChatIcon name="MessageSquare" size={16} />
            <Text size="sm" weight="500">
              {t('screens.community.whatSYourMind')}
            </Text>
          </View>
          <View style={styles.field}>
            <Text size="xs" muted>
              {t('screens.community.topic')}
            </Text>
            <Select value={kind} onValueChange={(v) => setKind(v as TicketKind)}>
              <SelectTrigger testID="talk-kind" accessibilityLabel={t('screens.community.topic')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent testID="talk-kind-options">
                {TICKET_KINDS.map((k) => (
                  <SelectItem key={k} value={k} testID={`talk-kind-${k}`}>
                    <Text size="base" weight="500" style={styles.itemText}>
                      {t(`supportTickets.kind.${k}`)}{' '}
                      <Text size="xs" muted>
                        {t(`supportTickets.kindHint.${k}`)}
                      </Text>
                    </Text>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
          <Textarea
            testID="talk-text"
            accessibilityLabel={t('screens.community.whatSYourMind')}
            placeholder={t('screens.community.describeWhatHappenedWhatYouTried')}
            value={text}
            onChangeText={setText}
            rows={6}
            maxLength={TALK_MAX_LENGTH}
            textAlignVertical="top"
            style={styles.textarea}
          />
          <View style={styles.actions}>
            <Button testID="talk-send" disabled={!canSend} onPress={() => void handleSubmit()}>
              <ButtonIcon name="Send" />
              {submitting ? t('supportTickets.talk.sending') : t('supportTickets.talk.send')}
            </Button>
          </View>
          {lastTicket ? (
            <View testID="ticket-created" style={[styles.notice, { borderColor: colors.statusSuccess, backgroundColor: colors.statusSuccessSubtle }]}>
              <Text size="sm" weight="500">
                {t('supportTickets.submittedTitle')}
              </Text>
              <Text size="sm">{t('supportTickets.submittedNumber', { number: lastTicket.ticket_number })}</Text>
              <Pressable
                testID="ticket-created-link"
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => router.setParams({ ticket: lastTicket.id })}
              >
                <Text size="sm" color={colors.primary} style={styles.link}>
                  {t('supportTickets.viewTicket')}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <Text size="xs" muted>
            {t('screens.community.vitanaDevonSageAtlasMiraAi')}
          </Text>
        </View>

        <VitanaCardStrip screen="talk-to-vitana" />

        <View
          onLayout={(e) => {
            listY.current = e.nativeEvent.layout.y;
          }}
        >
          <TalkTicketsList headingKey="screens.community.yourReports" highlight={highlight} onHighlightLayout={onHighlightLayout} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { padding: 16, gap: 24, paddingBottom: 48 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { gap: 4 },
  itemText: { flex: 1 },
  textarea: { minHeight: 140 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  notice: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 2 },
  link: { textDecorationLine: 'underline' },
});
