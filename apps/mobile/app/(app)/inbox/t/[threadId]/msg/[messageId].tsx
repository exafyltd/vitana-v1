/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — route
 * /inbox/t/:threadId/msg/:messageId (ledger exclusion row): the thread's
 * conversation, scrolled to and highlighting that message (web
 * src/App.tsx:1385-1389).
 */
import { useLocalSearchParams } from 'expo-router';
import { ConversationScreen } from '../../../../../../src/screens/chat/ConversationScreen';

export default function ThreadMessageRoute() {
  const { threadId, messageId } = useLocalSearchParams<{ threadId?: string; messageId?: string }>();
  return <ConversationScreen target={{ kind: 'thread', id: String(threadId ?? '') }} scrollToMessageId={messageId ?? null} />;
}
