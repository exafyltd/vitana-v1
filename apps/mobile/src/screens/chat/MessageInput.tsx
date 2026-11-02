/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the
 * composer, native twin of web `src/components/messages/MessageInput.tsx` on
 * a touch device:
 *
 *  - Enter adds a new line; only the send button sends (VTID-04966 /
 *    VTID-05229: `sendsOnEnter` is false without a real keyboard, L111-115).
 *  - the send button shows once there is text (L794-803); the composer clears
 *    at once and is restored with "Message failed" if the send throws (L193-263).
 *  - typing start on input, stop 1.5 s after the last keystroke or on blur (L154-191).
 *  - @mentions when the screen passes candidates (group chat, L119-127):
 *    suggestions for the token at the caret, a pick inserts "@Name ", the
 *    mentions still in the text go along as `contentData.mentions` (L205-239).
 *  - the reply preview above the composer (ReplyPreview).
 * The emoji picker (the OS keyboard has emoji), the attachment menu / file
 * picker / upload, and the voice recorder are not part of this port (see
 * docs/validation/VTID-05458/verification.md).
 */
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from 'react-native';
import { Avatar, Button, notifyError, Text, useUITheme } from '../../ports/ui';
import { addMention, ChatIcon, filterLocalCandidates, findActiveMentionToken, insertMention, pruneMentions, Textarea, type Mention } from '../../ports/chat';
import { useI18n } from '../../i18n/I18nProvider';
import { ReplyPreview } from './components';
import type { ChatViewMessage } from './data/types';

export type MentionCandidate = Mention & { avatar_url?: string | null };

export interface MessageInputProps {
  onSend: (content: string, messageType: string, contentData: Record<string, unknown> | null, replyToId?: string) => Promise<void>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder: string;
  disabled?: boolean;
  replyingTo?: ChatViewMessage | null;
  onCancelReply?: () => void;
  currentUserId?: string;
  mentionCandidates?: MentionCandidate[];
}

export const TYPING_IDLE_MS = 1500;

export function MessageInput({ onSend, onTypingStart, onTypingStop, placeholder, disabled, replyingTo, onCancelReply, currentUserId, mentionCandidates }: MessageInputProps) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [caret, setCaret] = useState(0);
  const composing = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lock = useRef(false);

  const stopTyping = () => {
    if (idle.current) clearTimeout(idle.current);
    idle.current = null;
    if (composing.current) onTypingStop?.();
    composing.current = false;
  };

  const onChange = (next: string) => {
    setText(next);
    setCaret(next.length);
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

  const send = async () => {
    const raw = text;
    const body = raw.trim();
    if (!body || disabled || lock.current) return;
    const rawMentions = mentions;
    const picked = pruneMentions(body, mentions);
    lock.current = true;
    setText('');
    setMentions([]);
    stopTyping();
    try {
      await onSend(body, 'text', picked.length > 0 ? { mentions: picked } : null, replyingTo?.id);
    } catch {
      setText(raw);
      setMentions(rawMentions);
      notifyError('toasts.messages.messageFailed');
    } finally {
      lock.current = false;
    }
  };

  const canSend = text.trim().length > 0;

  return (
    <View style={styles.root} testID="message-input">
      {replyingTo && onCancelReply ? <ReplyPreview message={replyingTo} currentUserId={currentUserId} onCancel={onCancelReply} /> : null}
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
        <View style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
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
        {canSend ? (
          <Button size="icon" onPress={() => void send()} accessibilityLabel={t('screens.messages.sendMessage')} testID="message-send" style={[styles.send, { backgroundColor: colors.primary }]}>
            <ChatIcon name="Send" size={16} color={colors.primaryForeground} />
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 8, paddingTop: 2, paddingBottom: 4 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  pill: { flex: 1, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 },
  field: { minHeight: 40, maxHeight: 120, borderWidth: 0, fontSize: 16 },
  send: { width: 36, height: 36, borderRadius: 18 },
  suggestions: { borderWidth: 1, borderRadius: 12, marginBottom: 8, paddingVertical: 4 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
});
