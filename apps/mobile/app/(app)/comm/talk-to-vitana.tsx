/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — route /comm/talk-to-vitana.
 * Ledger row COMM.TALK_TO_VITANA. The screen reads the `ticket` search param.
 */
import { TalkToVitanaScreen } from '../../../src/screens/ai-chat/TalkToVitanaScreen';

export default function TalkToVitanaRoute() {
  return <TalkToVitanaScreen />;
}
