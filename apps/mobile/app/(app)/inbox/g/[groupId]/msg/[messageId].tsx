/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — route
 * /inbox/g/:groupId/msg/:messageId (ledger exclusion row): the group chat,
 * scrolled to and highlighting that message (web src/App.tsx:1398-1402).
 */
import { useLocalSearchParams } from 'expo-router';
import { GroupChatScreen } from '../../../../../../src/screens/chat/GroupChatScreen';

export default function GroupChatMessageRoute() {
  const { groupId, messageId } = useLocalSearchParams<{ groupId?: string; messageId?: string }>();
  return <GroupChatScreen groupId={String(groupId ?? '')} scrollToMessageId={messageId ?? null} />;
}
