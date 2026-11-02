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
 *  - the ORB (`activateOrb(topicId)`, web `src/lib/orbActivate.ts`). The
 *    native ORB has no `focusGuidedTopic` yet, so it opens generically — the
 *    web's own fallback for a widget without that method.
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

/** web activateOrb(topicId): open Vitana (generic open on native, see above). */
export function useActivateOrb(): (topicId?: string) => void {
  const { controller } = useOrbSession();
  return () => {
    void controller?.open().catch(() => undefined);
  };
}
