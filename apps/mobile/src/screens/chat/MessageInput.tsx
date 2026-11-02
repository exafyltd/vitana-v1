/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the
 * composer, native twin of web `src/components/messages/MessageInput.tsx` on
 * a touch device:
 *
 *  - Enter adds a new line; only the send button sends (VTID-04966 /
 *    VTID-05229: `sendsOnEnter` is false without a real keyboard).
 *  - the pill holds the emoji picker, the attachment trigger and the text: a
 *    DM opens the AttachmentMenu (Send Funds, Request Payment, Calendar invite,
 *    Attach file); a group's paperclip opens the library directly (L700-716).
 *  - picked files upload at once with real progress ("Uploading n%"); a failed
 *    upload stays as a chip with Retry / remove and blocks sending (VTID-05316);
 *    removing an uploaded file deletes it again; files go out as an
 *    `attachment` message, the caption may be empty (L208-226).
 *  - send shows once there is text or a file; without either the mic opens the
 *    voice recorder in place of the bar (L686-694, L794-818); a recording is
 *    uploaded and sent as `🎤 Voice message (Ns)` / type `voice` (L469-501).
 *  - the composer clears at once and is restored with "Message failed" if the
 *    send throws (L193-263); typing start on input, stop 1.5 s after the last
 *    keystroke or on blur; @mentions in a group (L119-127, L205-239).
 */
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from 'react-native';
import { Avatar, Button, notifyError, Spinner, Text, useUITheme } from '../../ports/ui';
import { addMention, ChatIcon, filterLocalCandidates, findActiveMentionToken, insertMention, pruneMentions, Textarea, type Mention } from '../../ports/chat';
import { getChatDevice, type PickedFile } from '../../ports/chat-device';
import { useI18n } from '../../i18n/I18nProvider';
import { ReplyPreview } from './components';
import { AttachmentMenu, type Recipient } from './AttachmentMenu';
import { EmojiPicker } from './EmojiPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { attachmentKind, deleteChatAttachment, formatFileSize, uploadChatAttachment, uploadVoiceMessage, validateFile, type AttachmentData } from './data/upload';
import type { ChatViewMessage } from './data/types';

export type MentionCandidate = Mention & { avatar_url?: string | null };

export interface MessageInputProps {
  onSend: (content: string, messageType: string, contentData: Record<string, unknown> | null, replyToId?: string, actionButtons?: unknown[]) => Promise<void>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder: string;
  disabled?: boolean;
  replyingTo?: ChatViewMessage | null;
  onCancelReply?: () => void;
  currentUserId?: string;
  mentionCandidates?: MentionCandidate[];
  /** The conversation the uploads belong to (storage path `{me}/{threadId}/…`). */
  threadId?: string | null;
  conversationType?: 'direct' | 'group' | null;
  /** The DM peer (wallet dialogs). */
  recipient?: Recipient | null;
}

export const TYPING_IDLE_MS = 1500;

let uploadSeq = 0;

export function MessageInput({
  onSend,
  onTypingStart,
  onTypingStop,
  placeholder,
  disabled,
  replyingTo,
  onCancelReply,
  currentUserId,
  mentionCandidates,
  threadId,
  conversationType,
  recipient,
}: MessageInputProps) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [caret, setCaret] = useState(0);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState<Array<{ id: string; file: PickedFile }>>([]);
  const [recording, setRecording] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const composing = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lock = useRef(false);
  const active = useRef(0);

  // Another conversation: a failed upload of this one neither blocks it nor retries into it.
  useEffect(() => setFailed([]), [threadId]);

  const uploading = Object.keys(progress).length > 0 || voiceBusy;

  const stopTyping = () => {
    if (idle.current) clearTimeout(idle.current);
    idle.current = null;
    if (composing.current) onTypingStop?.();
    composing.current = false;
  };

  const onChange = (next: string) => {
    setText(next);
    setCaret(next.length);
    if (!next.trim()) {
      stopTyping();
      return;
    }
    if (!composing.current) {
      composing.current = true;
      onTypingStart?.();
    }
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      onTypingStop?.();
      composing.current = false;
    }, TYPING_IDLE_MS);
  };

  const token = mentionCandidates ? findActiveMentionToken(text, caret) : null;
  const suggestions = token && token.query.length >= 1 && mentionCandidates ? filterLocalCandidates(mentionCandidates, token.query) : [];

  const pick = (c: MentionCandidate) => {
    if (!token) return;
    const out = insertMention(text, token, caret, c);
    setText(out.text);
    setCaret(out.caret);
    setMentions((prev) => addMention(prev, c));
  };

  const uploadOne = async (file: PickedFile) => {
    if (!threadId) return;
    uploadSeq += 1;
    const id = `${Date.now()}_${uploadSeq}_${file.name}`;
    active.current += 1;
    setProgress((prev) => ({ ...prev, [id]: 0 }));
    try {
      const result = await uploadChatAttachment(file, (p) => setProgress((prev) => (id in prev ? { ...prev, [id]: p.percentage } : prev)), threadId);
      const kind = attachmentKind(result.type, result.name);
      setAttachments((prev) => [...prev, { type: kind, url: result.url, path: result.path, name: result.name, filename: result.name, size: result.size, mime: result.type }]);
    } catch {
      notifyError('toasts.messages.uploadFailed');
      setFailed((prev) => [...prev, { id, file }]);
    } finally {
      setProgress((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      active.current = Math.max(0, active.current - 1);
    }
  };

  const attachFiles = async () => {
    if (!threadId) {
      notifyError('toasts.messages.openConversation', 'toasts.messages.selectOpenConversationBeforeAttachingFiles');
      return;
    }
    const picked = await getChatDevice().pickMedia();
    if (picked.status !== 'picked') return;
    if (picked.files.some((f) => !validateFile(f))) {
      notifyError('toasts.messages.fileNotAllowed');
      return;
    }
    for (const f of picked.files) await uploadOne(f);
  };

  const removeAttachment = (index: number) => {
    const file = attachments[index];
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    if (file?.path) void deleteChatAttachment(file.path).catch(() => undefined);
  };

  const send = async () => {
    const raw = text;
    const body = raw.trim();
    if ((!body && attachments.length === 0) || disabled || uploading || failed.length > 0 || lock.current) return;
    const rawMentions = mentions;
    const rawAttachments = attachments;
    const picked = pruneMentions(body, mentions);
    lock.current = true;
    setText('');
    setMentions([]);
    setAttachments([]);
    stopTyping();
    try {
      let messageType = 'text';
      let contentData: Record<string, unknown> | null = null;
      if (rawAttachments.length > 0) {
        messageType = 'attachment';
        contentData = { attachments: rawAttachments };
      }
      if (picked.length > 0) contentData = { ...(contentData ?? {}), mentions: picked };
      await onSend(body, messageType, contentData, replyingTo?.id);
    } catch {
      setText(raw);
      setMentions(rawMentions);
      setAttachments(rawAttachments);
      notifyError('toasts.messages.messageFailed');
    } finally {
      lock.current = false;
    }
  };

  const sendVoice = async (rec: { uri: string; mimeType: string }, duration: number) => {
    setVoiceBusy(true);
    try {
      const result = await uploadVoiceMessage(rec, duration);
      const safe = Number.isFinite(duration) ? Math.round(duration) : 0;
      await onSend(`🎤 Voice message (${safe}s)`, 'voice', {
        attachments: [{ type: 'voice', url: result.url, path: result.path, duration: result.duration, size: result.size, name: result.name }],
      });
      setRecording(false);
    } catch {
      notifyError('toasts.messages.failedSendVoiceMessage', 'toasts.messages.thereErrorSendingYourVoiceMessage');
    } finally {
      setVoiceBusy(false);
    }
  };

  const sendCard = (content: string, messageType: string, contentData: Record<string, unknown> | null, actionButtons?: unknown[]) => onSend(content, messageType, contentData, undefined, actionButtons);

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !uploading && failed.length === 0 && !disabled;
  const showStrip = attachments.length > 0 || Object.keys(progress).length > 0 || failed.length > 0;

  return (
    <View style={styles.root} testID="message-input">
      {replyingTo && onCancelReply ? <ReplyPreview message={replyingTo} currentUserId={currentUserId} onCancel={onCancelReply} /> : null}
      {showStrip ? (
        <View style={styles.strip} testID="attachment-status">
          {attachments.map((a, i) => (
            <View key={`${a.path ?? a.url}-${i}`} style={[styles.chip, { backgroundColor: colors.secondary }]} testID="attachment-chip">
              {a.type === 'image' ? <Image source={{ uri: a.url }} style={styles.thumb} /> : <ChatIcon name="Paperclip" size={16} color={colors.mutedForeground} />}
              <View style={styles.chipText}>
                <Text numberOfLines={1} style={styles.bold}>
                  {a.filename}
                </Text>
                <Text muted style={styles.small}>
                  {formatFileSize(a.size)}
                </Text>
              </View>
              <Pressable onPress={() => removeAttachment(i)} accessibilityRole="button" accessibilityLabel={t('chatNative.composer.removeFile', { name: a.filename ?? '' })} style={styles.chipX} testID={`attachment-remove-${i}`}>
                <ChatIcon name="X" size={12} />
              </Pressable>
            </View>
          ))}
          {Object.entries(progress).map(([id, pct]) => (
            <View key={id} style={[styles.chip, { backgroundColor: colors.secondary }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} testID="upload-progress">
              <Spinner />
              <Text muted style={styles.small}>
                {t('screens.messages.uploadingPercentage', { percentage: pct })}
              </Text>
            </View>
          ))}
          {failed.map(({ id, file }) => (
            <View key={id} style={[styles.chip, { borderColor: colors.destructive, borderWidth: 1 }]} testID="upload-failed">
              <ChatIcon name="AlertCircle" size={16} color={colors.destructive} />
              <View style={styles.chipText}>
                <Text numberOfLines={1} style={styles.bold}>
                  {file.name}
                </Text>
                <Text style={[styles.small, { color: colors.destructive }]}>{t('inbox.media.uploadFailed')}</Text>
              </View>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setFailed((prev) => prev.filter((f) => f.id !== id));
                  void uploadOne(file);
                }}
                accessibilityLabel={t('inbox.media.retryUpload', { name: file.name })}
                testID="upload-retry"
              >
                {t('inbox.media.retry')}
              </Button>
              <Pressable onPress={() => setFailed((prev) => prev.filter((f) => f.id !== id))} accessibilityRole="button" accessibilityLabel={t('chatNative.composer.removeFile', { name: file.name })} style={styles.chipX} testID="upload-failed-remove">
                <ChatIcon name="X" size={12} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {suggestions.length > 0 ? (
        <View style={[styles.suggestions, { backgroundColor: colors.popover, borderColor: colors.border }]} testID="mention-suggestions" accessibilityRole="menu">
          {suggestions.map((c) => (
            <Pressable key={c.user_id} onPress={() => pick(c)} accessibilityRole="menuitem" style={styles.suggestion} testID={`mention-option-${c.user_id}`}>
              <Avatar uri={c.avatar_url} fallback={(c.display_name[0] ?? '?').toUpperCase()} size={24} />
              <Text>{c.display_name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.bar}>
        {recording ? (
          <View style={[styles.pill, styles.recorder, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <VoiceRecorder onComplete={(rec, d) => void sendVoice(rec, d)} onCancel={() => setRecording(false)} disabled={voiceBusy} />
          </View>
        ) : (
          <>
            <View style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <EmojiPicker userId={currentUserId} disabled={disabled} onSelect={(emoji) => onChange(text + emoji)} />
              {conversationType === 'group' ? (
                <Pressable onPress={() => void attachFiles()} disabled={disabled || uploading} accessibilityRole="button" accessibilityLabel={t('screens.messages.attach')} style={styles.icon} testID="attach-paperclip">
                  <ChatIcon name="Paperclip" size={16} />
                </Pressable>
              ) : (
                <AttachmentMenu onFileAttach={() => void attachFiles()} onSend={sendCard} recipient={recipient ?? null} userId={currentUserId} disabled={disabled || uploading} />
              )}
              <View style={styles.fieldBox}>
                <Textarea
                  value={text}
                  onChangeText={onChange}
                  onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => setCaret(e.nativeEvent.selection.end)}
                  onBlur={stopTyping}
                  placeholder={placeholder}
                  editable={!disabled}
                  multiline
                  rows={1}
                  accessibilityLabel={t('screens.messages.messageComposer')}
                  testID="message-input-field"
                  style={[styles.field, { backgroundColor: colors.muted }]}
                />
              </View>
            </View>
            {canSend ? (
              <Button size="icon" onPress={() => void send()} accessibilityLabel={t('screens.messages.sendMessage')} testID="message-send" style={[styles.send, { backgroundColor: colors.primary }]}>
                <ChatIcon name="Send" size={16} color={colors.primaryForeground} />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onPress={() => setRecording(true)}
                disabled={uploading || disabled}
                accessibilityLabel={t('screens.messages.recordVoiceMessage')}
                testID="message-mic"
                style={styles.send}
              >
                <ChatIcon name="Mic" size={16} />
              </Button>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 8, paddingTop: 2, paddingBottom: 4 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 6 },
  recorder: { alignItems: 'center' },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fieldBox: { flex: 1, minWidth: 0 },
  field: { minHeight: 40, maxHeight: 120, borderWidth: 0, fontSize: 16 },
  send: { width: 36, height: 36, borderRadius: 18 },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 8, paddingBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 260 },
  chipText: { flexShrink: 1, maxWidth: 140 },
  chipX: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 32, height: 32, borderRadius: 4 },
  bold: { fontWeight: '600', fontSize: 13 },
  small: { fontSize: 12 },
  suggestions: { borderWidth: 1, borderRadius: 12, marginBottom: 8, paddingVertical: 4 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
});
