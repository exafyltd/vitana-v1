/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — route
 * /inbox/u/:recipientId/msg/:messageId (ledger exclusion row): the 1:1
 * conversation, scrolled to and highlighting that message (web
 * src/App.tsx:1380-1384, reaction / search deep link).
 */
import { useLocalSearchParams } from 'expo-router';
import { ConversationScreen } from '../../../../../../src/screens/chat/ConversationScreen';

export default function ConversationMessageRoute() {
  const { recipientId, messageId } = useLocalSearchParams<{ recipientId?: string; messageId?: string }>();
  return <ConversationScreen target={{ kind: 'recipient', id: String(recipientId ?? '') }} scrollToMessageId={messageId ?? null} />;
}
