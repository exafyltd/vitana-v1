/**
 * VTID-03281 / VTID-03291 — Guided Journey: activate the ORB (Vitana) from the
 * catalog.
 *
 * The ORB is the external `VitanaOrb` widget (loaded by useOrbVoiceWidget; it
 * renders the `vtorb-fab`). When a user taps a session/topic we want Vitana to
 * OPEN and TEACH that exact topic from the published knowledge base — so we call
 * `VitanaOrb.focusGuidedTopic(topicId)`, which starts a session carrying
 * `guided_topic_id`. The gateway's guided-topic-narration provider (VTID-03290)
 * picks that up and leads turn-1 with the topic.
 *
 * Fallback: when no topicId is given, or the widget is an older build without
 * `focusGuidedTopic`, we just open the ORB generically (click the FAB / show()).
 *
 * VTID-03292 (#4)'s "auto-close after the teaching turn" flag was removed
 * under VTID-03680 — it fired after just the short opener line (turn 1),
 * cutting the session before the actual multi-turn GUIDE-MODE teaching ever
 * ran. See useOrbVoiceWidget.ts / orb-widget.js for the full incident.
 */

interface VitanaOrbApi {
  focusGuidedTopic?: (topicId: string) => void;
  show?: () => void;
}

export function activateOrb(topicId?: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  const orb = (window as unknown as { VitanaOrb?: VitanaOrbApi }).VitanaOrb;

  // Preferred path: focus the orb on the tapped topic so Vitana teaches it.
  if (topicId && orb && typeof orb.focusGuidedTopic === 'function') {
    orb.focusGuidedTopic(topicId);
    return true;
  }

  // Fallback: open the ORB generically via the floating action button.
  const fab =
    (document.querySelector('.vtorb-fab') as HTMLElement | null) ||
    (document.querySelector('[class^="vtorb-fab"]') as HTMLElement | null) ||
    (document.getElementById('vitana-orb-fab') as HTMLElement | null);
  if (fab) {
    fab.click();
    return true;
  }

  // Last resort: if the widget global is present, ask it to show.
  if (orb && typeof orb.show === 'function') {
    orb.show();
    return true;
  }
  return false;
}
