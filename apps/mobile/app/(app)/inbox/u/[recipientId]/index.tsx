/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — route
 * /inbox/u/:recipientId (ledger INBOX.CONVERSATION, web `/inbox/u/:recipient_id`):
 * the 1:1 conversation with that member (web src/App.tsx:1365-1369 → Messages).
 * `?context=tenant` opens the tenant ("Network") thread, as the web's
 * deep-link context parameter does (Messages.tsx:191-193, :219-221).
 */
import { useLocalSearchParams } from 'expo-router';
import { ConversationScreen } from '../../../../../src/screens/chat/ConversationScreen';

export default function ConversationRoute() {
  const { recipientId, context } = useLocalSearchParams<{ recipientId?: string; context?: string }>();
  return <ConversationScreen target={{ kind: 'recipient', id: String(recipientId ?? '') }} context={context === 'tenant' ? 'tenant' : 'global'} />;
}
