/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — route
 * /inbox/g/:groupId (ledger INBOX.GROUP, web `/inbox/g/:chat_group_id`): the
 * group chat (web src/App.tsx:1393-1397 → GroupChat).
 */
import { useLocalSearchParams } from 'expo-router';
import { GroupChatScreen } from '../../../../../src/screens/chat/GroupChatScreen';

export default function GroupChatRoute() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  return <GroupChatScreen groupId={String(groupId ?? '')} />;
}
