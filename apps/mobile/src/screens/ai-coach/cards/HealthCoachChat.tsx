/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — twin of the web
 * `src/components/health/HealthCoachChat.tsx` `card` variant (the one
 * `/ai/companion` renders) and its `AIDataConsentDialog` (a bottom sheet on
 * phones, the web ResponsiveDialog's drawer): the AI Health Coach header with
 * the 24/7 badge and the voice / video buttons, the four quick actions that
 * fill the input, the transcript (member bubbles at the end, coach at the
 * start, polite live region), the input + send, and the bouncing typing dots.
 *
 * Send: an empty message does nothing; without AI data consent the consent
 * sheet opens; otherwise the turn goes to `POST /conversation/turn`
 * (`sendCoachMessage`, the member's language) and the reply is appended. A
 * failed reply shows the web's `screens.health.coachReplyFailed` toast.
 * The reply text is the gateway's: no sentence is composed here.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, BottomSheet, Button, IconButton, Text, notifyError, useUITheme } from '../../../ports/ui';
import { CoachIcon, Input, useCoachPalette, useReducedMotion } from '../../../ports/ai-coach';
import { useAuth } from '../../../auth/AuthProvider';
import { useCoachText } from '../text';
import { sendCoachMessage } from '../data/gateway';
import { useAIConsent } from '../data/hooks';
import { GradientTile } from './widgets';

type Turn = { role: 'user' | 'assistant'; text: string };

function TypingDot({ delay }: { delay: number }) {
  const p = useCoachPalette();
  const reduced = useReducedMotion();
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: -4, duration: 250, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.delay(500 - delay),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [reduced, delay, y]);
  return <Animated.View style={[styles.dot, { backgroundColor: p.calendarPrimary, transform: [{ translateY: y }] }]} />;
}

export function HealthCoachChat({ onSendMessage, onStartVoiceCall, onStartVideoCall, testID = 'health-coach' }: { onSendMessage?: (m: string) => void; onStartVoiceCall?: () => void; onStartVideoCall?: () => void; testID?: string }): ReactElement {
  const { t, language } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const { user } = useAuth();
  const { hasConsent, dialogOpen, setDialogOpen, grantConsent } = useAIConsent();
  const [message, setMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);

  const send = async () => {
    if (!message.trim()) return;
    if (!hasConsent) {
      setDialogOpen(true);
      return;
    }
    const text = message.trim();
    onSendMessage?.(text);
    setMessage('');
    setTurns((prev) => [...prev, { role: 'user', text }]);
    setTyping(true);
    try {
      const { reply } = await sendCoachMessage(user, text, language);
      setTurns((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      notifyError('screens.health.coachReplyFailed');
    } finally {
      setTyping(false);
    }
  };

  const quickActions = ['coachAction_logSymptoms', 'coachAction_updateMood', 'coachAction_scheduleCheckin', 'coachAction_reviewGoals'].map((k) => t(`screens.ai.${k}`));

  return (
    <>
      <AIDataConsentSheet open={dialogOpen} onClose={() => setDialogOpen(false)} onConsent={grantConsent} />
      <View testID={testID} style={[styles.card, { backgroundColor: colors.card, borderColor: p.alpha(p.calendarPrimary, 0.2) }]}>
        <View style={[styles.header, styles.between]}>
          <View style={styles.row}>
            <GradientTile icon="Brain" round id="coachChatTile" />
            <View style={styles.titleCol}>
              <Text size="lg" weight="600" accessibilityRole="header">
                {t('screens.health.aiHealthCoach')}
              </Text>
              <Badge variant="secondary">{t('screens.health.available247')}</Badge>
            </View>
          </View>
          <View style={styles.row}>
            <IconButton name="Mic" accessibilityLabel={t('aiCoachNative.chat.voice')} onPress={() => onStartVoiceCall?.()} size={16} testID={`${testID}-voice`} />
            <IconButton name="Video" accessibilityLabel={t('aiCoachNative.chat.video')} onPress={() => onStartVideoCall?.()} size={16} testID={`${testID}-video`} />
          </View>
        </View>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text size="sm" muted>
              {t('screens.health.quickActions')}
            </Text>
            <View style={styles.grid}>
              {quickActions.map((a, i) => (
                <Button key={a} size="sm" variant="outline" onPress={() => setMessage(a)} style={styles.quick} testID={`${testID}-quick-${i}`}>
                  {a}
                </Button>
              ))}
            </View>
          </View>
          <View style={styles.section}>
            {turns.length > 0 ? (
              <ScrollView style={styles.transcript} contentContainerStyle={styles.turns} accessibilityLiveRegion="polite" nestedScrollEnabled testID={`${testID}-transcript`}>
                {turns.map((turn, i) => (
                  <View
                    key={i}
                    testID={`${testID}-turn-${turn.role}`}
                    style={[styles.bubble, turn.role === 'user' ? [styles.mine, { backgroundColor: p.alpha(p.calendarPrimary, 0.1) }] : [styles.theirs, { backgroundColor: colors.muted }]]}
                  >
                    <Text size="sm">{turn.text}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.row}>
              <Input
                value={message}
                onChangeText={setMessage}
                onSubmitEditing={() => void send()}
                returnKeyType="send"
                placeholder={t('screens.health.askAboutYourHealthSymptomsGoals')}
                accessibilityLabel={t('screens.health.askAboutYourHealthSymptomsGoals')}
                style={styles.input}
                testID={`${testID}-input`}
              />
              <Button onPress={() => void send()} accessibilityLabel={t('aiCoachNative.chat.send')} testID={`${testID}-send`}>
                <CoachIcon name="Send" size={16} color={colors.primaryForeground} />
              </Button>
            </View>
            {typing ? (
              <View style={styles.row} testID={`${testID}-typing`}>
                <View style={styles.dots}>
                  <TypingDot delay={0} />
                  <TypingDot delay={100} />
                  <TypingDot delay={200} />
                </View>
                <Text size="sm" muted>
                  {t('screens.health.aiCoachTyping')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </>
  );
}

/** Web `AIDataConsentDialog`: the disclosure, then Not now / I agree (the settings lane's `settingsNative.consent.*` copy). */
export function AIDataConsentSheet({ open, onClose, onConsent }: { open: boolean; onClose: () => void; onConsent: () => void }): ReactElement {
  const { t } = useCoachText();
  const { colors } = useUITheme();
  const k = (s: string) => t(`settingsNative.consent.${s}`);
  const sent: Array<[string, string]> = [
    ['Mic', 'voiceData'],
    ['BookOpen', 'diaryData'],
    ['Brain', 'memoryData'],
    ['User', 'profileData'],
    ['Share2', 'socialData'],
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title={k('title')} testID="coach-consent">
      <View style={styles.sheet}>
        <View style={styles.row}>
          <CoachIcon name="Shield" size={20} color={colors.destructive} />
          <Text size="sm" muted style={styles.shrink}>
            {k('subtitle')}
          </Text>
        </View>
        <View style={styles.section}>
          <Text size="sm" weight="600">
            {k('whatIsSent')}
          </Text>
          {sent.map(([icon, key]) => (
            <View key={key} style={styles.row}>
              <CoachIcon name={icon} size={16} color={colors.mutedForeground} />
              <Text size="sm" muted style={styles.shrink}>
                {k(key)}
              </Text>
            </View>
          ))}
        </View>
        <View style={[styles.alert, { borderColor: colors.border }]}>
          <CoachIcon name="Heart" size={16} />
          <Text size="sm" style={styles.shrink}>
            <Text size="sm" weight="600">
              {k('recipientLabel')}
            </Text>{' '}
            {k('recipient')}
          </Text>
        </View>
        <View style={styles.section}>
          <Text size="sm" weight="600">
            {k('purposeLabel')}
          </Text>
          <View style={styles.row}>
            <CoachIcon name="Target" size={16} color={colors.mutedForeground} />
            <Text size="sm" muted style={styles.shrink}>
              {k('purpose')}
            </Text>
          </View>
        </View>
        <View style={styles.section}>
          {['notStored', 'revokeAnytime', 'gdprCompliant'].map((key) => (
            <View key={key} style={styles.row}>
              <CoachIcon name="CheckCircle" size={16} color={colors.primary} />
              <Text size="sm" style={styles.shrink}>
                {k(key)}
              </Text>
            </View>
          ))}
        </View>
        <Text size="xs" muted style={styles.center}>
          {k('agreementFooter')}
        </Text>
        <View style={styles.footer}>
          <Button variant="outline" onPress={onClose} testID="coach-consent-not-now">
            {k('notNow')}
          </Button>
          <Button onPress={onConsent} testID="coach-consent-agree">
            {k('iAgree')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 8 },
  header: { padding: 24, paddingBottom: 12 },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleCol: { gap: 2, alignItems: 'flex-start' },
  section: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quick: { flexBasis: '47%', flexGrow: 1, justifyContent: 'flex-start' },
  transcript: { maxHeight: 288 },
  turns: { gap: 8 },
  bubble: { maxWidth: '85%', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  input: { flex: 1 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sheet: { gap: 16 },
  alert: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 8, padding: 16 },
  shrink: { flexShrink: 1 },
  center: { textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
