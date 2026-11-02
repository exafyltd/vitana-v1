/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — route
 * /inbox/u/:recipientId/msg/:messageId (ledger exclusion row): the 1:1
 * conversation, scrolled to and highlighting that message (web
 * src/App.tsx:1380-1384, reaction / search deep link).
 * `?context=tenant` opens the tenant ("Network") thread, as the web's
 * deep-link context parameter does (Messages.tsx:191-193, :219-221).
 */
import { useLocalSearchParams } from 'expo-router';
import { ConversationScreen } from '../../../../../../src/screens/chat/ConversationScreen';

export default function ConversationMessageRoute() {
  const { recipientId, messageId, context } = useLocalSearchParams<{ recipientId?: string; messageId?: string; context?: string }>();
  return <ConversationScreen target={{ kind: 'recipient', id: String(recipientId ?? '') }} scrollToMessageId={messageId ?? null} context={context === 'tenant' ? 'tenant' : 'global'} />;
}
