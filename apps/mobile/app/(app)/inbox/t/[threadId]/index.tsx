/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — route
 * /inbox/t/:threadId (ledger exclusion row): the thread form of a
 * conversation (web src/App.tsx:1370-1374 → Messages). The thread id is
 * resolved to its conversation (a legacy group thread, or a direct chat).
 * `?context=tenant` opens the tenant ("Network") thread, as the web's
 * deep-link context parameter does (Messages.tsx:191-193, :219-221).
 */
import { useLocalSearchParams } from 'expo-router';
import { ConversationScreen } from '../../../../../src/screens/chat/ConversationScreen';

export default function ThreadRoute() {
  const { threadId, context } = useLocalSearchParams<{ threadId?: string; context?: string }>();
  return <ConversationScreen target={{ kind: 'thread', id: String(threadId ?? '') }} context={context === 'tenant' ? 'tenant' : 'global'} />;
}
