/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) — the
 * My Journey parts the Audiobook lane uses, owned by the `journey` lane
 * (VTID-05461, plan decision 3: the dashboard has one owner, this lane
 * consumes it through a port and never duplicates it):
 *
 *  - `JourneyScreen` — the `/autopilot` dashboard the `/autopilot/audiobook`
 *    deep link renders (web App.tsx:1544-1548 renders `AutopilotDashboard`);
 *  - the seams the player plugs into: `JourneyAudiobookContext` (the player
 *    My Journey calls) and `JourneySlotsContext` (the Guided view's
 *    `AudiobookReminderControl` slot, AutopilotDashboard.tsx:435);
 *  - the journey's Guided mode provider (the deep link switches to Guided,
 *    AutopilotDashboard.tsx:180) and the ORB opener (`activateOrb`);
 *  - the class-B data calls the web player shares with My Journey
 *    (`communityFetch`, the curriculum, the journey state cache, the listen
 *    record, `practiceTargetAction`) — the same functions, so the player and
 *    the dashboard hit the same requests and React Query keys.
 */
export { JourneyScreen } from '../screens/journey/JourneyScreen';
export { JourneyAudiobookContext, JourneySlotsContext, useActivateOrb, type JourneyAudiobook, type JourneySlots } from '../screens/journey/seams';
export { GuidedModeProvider, useGuidedMode } from '../screens/journey/providers/GuidedModeProvider';
export { communityFetch, type JsonResponse } from '../screens/journey/data/client';
export {
  fetchJourneyChecklist,
  journeyChecklistQueryKey,
  practiceTargetAction,
  recordSessionListened,
  type PublicTopic,
} from '../screens/journey/data/journey';
export { JOURNEY_STATE_QUERY_KEY, fetchJourneyState, markSessionListenedInJourneyState } from '../screens/journey/hooks/useGuidedJourneyProgress';
