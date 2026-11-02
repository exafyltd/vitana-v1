/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — route
 * /inbox/t/:threadId (ledger exclusion row): the thread form of a
 * conversation (web src/App.tsx:1370-1374 → Messages). The thread id is
 * resolved to its conversation (a legacy group thread, or a direct chat).
 */
import { useLocalSearchParams } from 'expo-router';
import { ConversationScreen } from '../../../../../src/screens/chat/ConversationScreen';

export default function ThreadRoute() {
  const { threadId } = useLocalSearchParams<{ threadId?: string }>();
  return <ConversationScreen target={{ kind: 'thread', id: String(threadId ?? '') }} />;
}
