/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — `/inbox`
 * (INBOX.OVERVIEW): the conversation list. The conversation routes under
 * `inbox/u`, `inbox/g` and `inbox/t` belong to the conversation-chat lane.
 */
import { InboxScreen } from '../../../src/screens/inbox/InboxScreen';

export default function InboxRoute() {
  return <InboxScreen />;
}
