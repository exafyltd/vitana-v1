/**
 * VTID-05521 (Native Wave 2, ai-assistants lane) — `/assistant`, the AI
 * assistant settings screen. Ledger rows ASSISTANT.OVERVIEW + the five
 * `?tab=` panels (voice, ai, autopilot, proactive, referrals); AssistantScreen
 * reads `tab`.
 */
import { AssistantScreen } from '../../../src/screens/ai-assistants/AssistantScreen';

export default function AssistantRoute() {
  return <AssistantScreen />;
}
