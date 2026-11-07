/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — the two app-wide
 * services My Journey calls into but does not own:
 *
 *  - the Audiobook player (`useAudiobookPlayer()`, web
 *    `src/context/AudiobookPlayerProvider.tsx`, VTID-04761). The native player
 *    is the `autopilot-audiobook` lane's (plan decision 3); until it provides
 *    one, `useJourneyAudiobook()` is null and every caller takes the web's own
 *    no-player branch (AutopilotDashboard.tsx:308-311 falls through to the ORB;
 *    GuidedJourneyCatalog.tsx:294-297 opens the lesson; :383 hides the play badge).
 *  - the Guided view's mount slots (`JourneySlotsContext`): the
 *    `AudiobookReminderControl` the web draws between "how it works" and the
 *    catalog (AutopilotDashboard.tsx:435, VTID-04763). Its native twin
 *    (`apps/mobile/src/screens/audiobook/AudiobookReminderControl.tsx`) is the
 *    `autopilot-audiobook` lane's (tasks.md autopilot-audiobook task 2); that
 *    lane provides the component here and My Journey mounts it in place.
 *  - the ORB (`activateOrb(topicId)`, web `src/lib/orbActivate.ts`) through
 *    `JourneyOrbBridgeContext`: the native ORB has no `focusGuidedTopic` or
 *    teaching-end signal yet, so the default bridge is a no-op and Vitana
 *    opens generically — the web's own fallback for a widget without that method.
 */
import { createContext, useContext, type ComponentType } from 'react';
import { useOrbSession } from '../../orb/ui/OrbProvider';

export interface JourneyAudiobook {
  active: boolean;
  start: (opts?: { episode?: number }) => Promise<void>;
}

export const JourneyAudiobookContext = createContext<JourneyAudiobook | null>(null);

export function useJourneyAudiobook(): JourneyAudiobook | null {
  return useContext(JourneyAudiobookContext);
}

/** Components other lanes mount into My Journey's Guided view. */
export interface JourneySlots {
  /** web `<AudiobookReminderControl />` (AutopilotDashboard.tsx:435). */
  AudiobookReminderControl?: ComponentType;
}

export const JourneySlotsContext = createContext<JourneySlots>({});

export function useJourneySlots(): JourneySlots {
  return useContext(JourneySlotsContext);
}

/**
 * The ORB hook point the ORB lane wires later (follow-up in verification.md):
 *  - `focusGuidedTopic(topicId)` — web `VitanaOrb.focusGuidedTopic` (orbActivate.ts:79-83):
 *    start a session that teaches that topic;
 *  - `onGuidedTopicTeachingComplete(cb)` — web window event
 *    `vitana:guided-topic-teaching-complete` `{ topicId, reason }`
 *    (GuidedJourneyCatalog.tsx:200-237); returns the unsubscribe.
 * The default bridge does neither (no-op subscriber, no focus), so the screen
 * keeps the web's fallback: a plain ORB open.
 */
export interface JourneyOrbBridge {
  focusGuidedTopic?: (topicId: string) => void;
  onGuidedTopicTeachingComplete: (cb: (detail: { topicId: string | null; reason: string | null }) => void) => () => void;
}

export const NOOP_ORB_BRIDGE: JourneyOrbBridge = { onGuidedTopicTeachingComplete: () => () => undefined };
export const JourneyOrbBridgeContext = createContext<JourneyOrbBridge>(NOOP_ORB_BRIDGE);

export function useJourneyOrbBridge(): JourneyOrbBridge {
  return useContext(JourneyOrbBridgeContext);
}

/** web activateOrb(topicId): focus the topic when the bridge can, else open Vitana generically (orbActivate.ts:79-93). */
export function useActivateOrb(): (topicId?: string) => void {
  const { controller } = useOrbSession();
  const bridge = useJourneyOrbBridge();
  return (topicId?: string) => {
    if (topicId && bridge.focusGuidedTopic) {
      bridge.focusGuidedTopic(topicId);
      return;
    }
    void controller?.open().catch(() => undefined);
  };
}
