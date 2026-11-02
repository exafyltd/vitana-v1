/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — twin of the web
 * `src/components/capture/UnifiedCaptureCard.tsx`, the voice-first capture
 * card of both Diary modes.
 *
 * Voice: the hero mic records with the native `expo-audio` recorder (port
 * `diary-capture`); on stop the recording goes to the same backend STT the
 * web uses where Web Speech is unavailable (the `transcribe-audio` edge
 * function — the web's iOS / Android WebView path), and the transcript lands
 * in the editable text area. There is no live (interim) transcription
 * natively, so the card always shows the web's "backend recording" hint
 * while recording.
 *
 * Health mode: "Save entry" writes a `voice` entry through the one diary
 * write path with the recording's duration. Bug mode (bug_report /
 * ux_improvement): report-type toggle, severity, affected screen, screenshot
 * attachments (camera or library; uploaded to `feedback-attachments`, signed
 * for a year) and "Send to team" into the unified `feedback_tickets`
 * pipeline; the confirmation shows the FB-number and links to the ticket.
 * The web's English screen-option labels come from the catalog here.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { ButtonIcon, DiaryIcon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '../../ports/diary';
import { readFileBase64, useDiaryRecorder, type PickedImage } from '../../ports/diary-capture';
import { navigateToWebPath } from '../../navigation/navigate';
import { currentUserId, saveDiaryEntry, useInvalidateDiary } from './data/entries';
import { transcribeAudio, uploadFeedbackAttachments } from './data/storage';
import { submitFeedbackTicket, type ReportType, type Severity } from './data/tickets';
import { PhotoSourceSheet, PhotoThumbs } from './components';
import { formatDuration, useDiaryText } from './text';

export type CaptureMode = 'health' | ReportType;

/** The web SCREEN_OPTIONS values, with their catalog keys (`diaryNative.screenOption.*`). */
export const SCREEN_OPTIONS: ReadonlyArray<{ value: string; key: string }> = [
  { value: 'home', key: 'home' },
  { value: 'community', key: 'community' },
  { value: 'community/events', key: 'communityEvents' },
  { value: 'discover', key: 'discover' },
  { value: 'discover/marketplace', key: 'discoverMarketplace' },
  { value: 'business-hub', key: 'businessHub' },
  { value: 'inbox', key: 'inbox' },
  { value: 'inbox/messages', key: 'inboxMessages' },
  { value: 'health', key: 'health' },
  { value: 'health/dashboard', key: 'healthDashboard' },
  { value: 'ai-assistant', key: 'aiAssistant' },
  { value: 'ai-assistant/orb', key: 'aiAssistantOrb' },
  { value: 'wallet', key: 'wallet' },
  { value: 'sharing', key: 'sharing' },
  { value: 'memory/diary', key: 'memoryDiary' },
  { value: 'memory/garden', key: 'memoryGarden' },
  { value: 'calendar', key: 'calendar' },
  { value: 'settings', key: 'settings' },
  { value: 'profile', key: 'profile' },
  { value: 'live-rooms', key: 'liveRooms' },
  { value: 'notifications', key: 'notifications' },
  { value: 'other', key: 'other' },
];

const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];

export function CaptureCard({
  mode,
  onModeChange,
  onSaveComplete,
  onSubmitted,
}: {
  mode: CaptureMode;
  onModeChange?: (mode: ReportType) => void;
  onSaveComplete?: () => void;
  onSubmitted?: () => void;
}): ReactElement {
  const x = useDiaryText();
  const { t } = x;
  const { colors } = useUITheme();
  const recorder = useDiaryRecorder();
  const invalidate = useInvalidateDiary();
  const isHealth = mode === 'health';

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [severity, setSeverity] = useState<Severity>('medium');
  const [affectedScreen, setAffectedScreen] = useState('');
  const [attachments, setAttachments] = useState<PickedImage[]>([]);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState<{ ticketNumber: string | null } | null>(null);

  const hasContent = recording || transcribing || transcript.length > 0;

  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  // Leaving the screen mid-recording drops the recording and the timer (web unmount cleanup).
  useEffect(
    () => () => {
      clearTimer();
      recorder.cancel();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const start = async () => {
    try {
      const r = await recorder.start();
      if (r === 'denied') {
        notifyError('diaryNative.permissions.deniedTitle', 'diaryNative.permissions.deniedMicrophone');
        return;
      }
      setRecording(true);
      setDuration(0);
      setTranscript('');
      setConfirmation(null);
      clearTimer();
      timer.current = setInterval(() => setDuration((d) => d + 1), 1000);
      if (isHealth) notify('capture.recordingStarted', 'capture.recordingStartedDesc');
    } catch {
      setRecording(false);
      notifyError('capture.recognitionError', 'capture.recognitionErrorDesc');
    }
  };

  const stop = async () => {
    clearTimer();
    setRecording(false);
    setTranscribing(true);
    try {
      const file = await recorder.stop();
      if (!file) {
        notifyError('capture.recognitionError', 'capture.recognitionErrorDesc');
        return;
      }
      const text = await transcribeAudio(await readFileBase64(file.uri), x.language, file.mimeType);
      if (text) setTranscript((prev) => (prev ? `${prev} ${text}` : text));
      if (isHealth) notify('capture.recordingStopped', 'capture.recordingStoppedDesc');
    } catch {
      notifyError('capture.recognitionError', 'capture.recognitionErrorDesc');
    } finally {
      setTranscribing(false);
    }
  };

  const saveEntry = async () => {
    if (!transcript.trim()) {
      notifyError('capture.noContent', 'capture.noContentDesc');
      return;
    }
    try {
      await saveDiaryEntry({ text: transcript.trim(), source: 'voice', tags: ['diary', 'voice'], duration });
      setTranscript('');
      setDuration(0);
      invalidate();
      onSaveComplete?.();
      notify('capture.entrySaved', 'capture.entrySavedDesc');
    } catch {
      notifyError('capture.saveFailed', 'capture.saveFailedDesc');
    }
  };

  const send = async () => {
    if (!transcript.trim()) {
      notifyError('capture.noContent', 'capture.noContentBugDesc');
      return;
    }
    setSending(true);
    try {
      const userId = await currentUserId();
      const urls = await uploadFeedbackAttachments(userId, attachments);
      const result = await submitFeedbackTicket({
        transcript: transcript.trim(),
        reportType: mode as ReportType,
        severity,
        affectedScreen: affectedScreen || undefined,
        attachments: urls,
        source: 'capture_card',
      });
      setTranscript('');
      setDuration(0);
      setAttachments([]);
      setAffectedScreen('');
      setSeverity('medium');
      setConfirmation({ ticketNumber: result.ticket_number ?? null });
      onSubmitted?.();
    } catch {
      notifyError('capture.sendFailed', 'capture.sendFailedDesc');
    } finally {
      setSending(false);
    }
  };

  if (!isHealth && confirmation) {
    const n = confirmation.ticketNumber;
    return (
      <View testID="capture-confirmation" style={[styles.card, styles.confirm, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.confirmIcon, { backgroundColor: colors.statusSuccessSubtle }]}>
          <DiaryIcon name="CheckCircle2" size={32} color={colors.statusSuccess} />
        </View>
        <Text size="lg" weight="600">
          {t('capture.reportSent')}
        </Text>
        {n ? (
          <Text weight="600" testID="created-ticket-number">
            {t('supportTickets.submittedNumber', { number: n })}
          </Text>
        ) : null}
        {n ? (
          <Button variant="link" testID="capture-view-ticket" onPress={() => navigateToWebPath(`/support?tab=tickets&ticket=${encodeURIComponent(n)}`)}>
            {t('supportTickets.viewTicket')}
          </Button>
        ) : null}
        <Text muted size="sm" style={styles.centerText}>
          {t('capture.reportSentDesc')}
        </Text>
        <Button variant="outline" testID="capture-send-another" onPress={() => setConfirmation(null)}>
          {t('capture.sendAnother')}
        </Button>
      </View>
    );
  }

  const micBg = recording ? colors.destructive : isHealth ? colors.muted : colors.statusWarningSubtle;
  const micFg = recording ? colors.destructiveForeground : isHealth ? colors.primary : colors.statusWarning;

  return (
    <View testID={`capture-card-${isHealth ? 'health' : 'bugs'}`} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.hero}>
        <Button
          testID="capture-mic"
          variant="ghost"
          accessibilityLabel={recording ? t('diaryNative.stopRecording') : t('diaryNative.startRecording')}
          disabled={transcribing}
          onPress={() => void (recording ? stop() : start())}
          style={[styles.mic, { backgroundColor: micBg }]}
        >
          <DiaryIcon name={recording ? 'Square' : transcribing ? 'Loader2' : 'Mic'} size={recording ? 32 : 36} color={micFg} />
        </Button>
        {recording ? (
          <View style={styles.row}>
            <Badge variant="destructive">{t('capture.recording')}</Badge>
            <Text size="xl" weight="700" color={colors.destructive} testID="capture-duration">
              {formatDuration(duration)}
            </Text>
          </View>
        ) : transcribing ? (
          <Text muted size="sm" testID="capture-transcribing">
            {t('capture.transcribing')}
          </Text>
        ) : !hasContent ? (
          <Text muted size="sm">
            {isHealth ? t('capture.tapToRecord') : t('capture.tapToDescribe')}
          </Text>
        ) : null}
      </View>

      {hasContent ? (
        <View style={styles.body}>
          <View style={styles.between}>
            <Text variant="label" muted>
              {recording ? t('capture.recording') : isHealth ? t('capture.yourVoiceEntry') : t('capture.yourFeedback')}
            </Text>
            {!recording && duration > 0 ? <Badge variant="outline">{formatDuration(duration)}</Badge> : null}
          </View>
          {recording ? (
            <View style={[styles.hint, { borderColor: colors.statusWarning, backgroundColor: colors.statusWarningSubtle }]}>
              <Text size="xs" color={colors.statusWarning}>
                {t('capture.backendRecordingHint')}
              </Text>
            </View>
          ) : null}
          <Textarea
            testID="capture-transcript"
            value={transcript}
            onChangeText={(v) => (recording ? undefined : setTranscript(v))}
            placeholder={recording ? t('capture.startSpeaking') : t('capture.editOrType')}
            disabled={recording || transcribing}
            rows={3}
          />

          {!isHealth ? (
            <>
              <View style={styles.row}>
                <Button variant="outline" size="xs" testID="capture-attach" onPress={() => setSourceOpen(true)}>
                  <ButtonIcon name="Paperclip" size={14} />
                  {t('capture.attach')}
                </Button>
              </View>
              {attachments.length > 0 ? <PhotoThumbs images={attachments} size={56} testID="capture-attachment" onRemove={(i) => setAttachments((prev) => prev.filter((_, j) => j !== i))} /> : null}
              <View style={styles.row}>
                <Button testID="capture-type-bug" size="xs" style={styles.fill} variant={mode === 'bug_report' ? 'default' : 'outline'} accessibilityState={{ selected: mode === 'bug_report' }} onPress={() => onModeChange?.('bug_report')}>
                  <ButtonIcon name="Bug" size={14} />
                  {t('capture.bugReport')}
                </Button>
                <Button testID="capture-type-ux" size="xs" style={styles.fill} variant={mode === 'ux_improvement' ? 'default' : 'outline'} accessibilityState={{ selected: mode === 'ux_improvement' }} onPress={() => onModeChange?.('ux_improvement')}>
                  <ButtonIcon name="Lightbulb" size={14} />
                  {t('capture.uxImprovement')}
                </Button>
              </View>
              <View style={styles.row}>
                <View style={styles.fill}>
                  <Text size="xs" muted>
                    {t('capture.severity')}
                  </Text>
                  <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
                    <SelectTrigger testID="capture-severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent testID="capture-severity-options">
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`capture.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </View>
                <View style={styles.fill}>
                  <Text size="xs" muted>
                    {t('capture.affectedScreen')}
                  </Text>
                  <Select value={affectedScreen} onValueChange={setAffectedScreen}>
                    <SelectTrigger testID="capture-screen">
                      <SelectValue placeholder={t('capture.select')} />
                    </SelectTrigger>
                    <SelectContent testID="capture-screen-options">
                      {SCREEN_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {t(`diaryNative.screenOption.${s.key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </View>
              </View>
              <PhotoSourceSheet open={sourceOpen} onClose={() => setSourceOpen(false)} onPicked={(picked) => setAttachments((prev) => [...prev, ...picked])} testID="capture-photo-source" />
            </>
          ) : null}

          {transcript.trim() && !recording ? (
            isHealth ? (
              <Button testID="capture-save" size="sm" onPress={() => void saveEntry()}>
                <ButtonIcon name="Save" />
                {t('capture.saveEntry')}
              </Button>
            ) : (
              <Button testID="capture-send" size="sm" disabled={sending} onPress={() => void send()}>
                <ButtonIcon name="Send" />
                {sending ? t('capture.sending') : t('capture.sendToTeam')}
              </Button>
            )
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, minHeight: 340 },
  confirm: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  confirmIcon: { padding: 16, borderRadius: 999 },
  centerText: { textAlign: 'center' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 32, paddingBottom: 16, gap: 16 },
  mic: { width: 80, height: 80, borderRadius: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  hint: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  fill: { flex: 1, gap: 4 },
});
