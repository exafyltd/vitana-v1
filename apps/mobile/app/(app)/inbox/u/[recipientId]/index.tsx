/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — route
 * /inbox/u/:recipientId (ledger INBOX.CONVERSATION, web `/inbox/u/:recipient_id`):
 * the 1:1 conversation with that member (web src/App.tsx:1365-1369 → Messages).
 */
import { useLocalSearchParams } from 'expo-router';
import { ConversationScreen } from '../../../../../src/screens/chat/ConversationScreen';

export default function ConversationRoute() {
  const { recipientId } = useLocalSearchParams<{ recipientId?: string }>();
  return <ConversationScreen target={{ kind: 'recipient', id: String(recipientId ?? '') }} />;
}
