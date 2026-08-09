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
 * VTID-03292 (#4): a guided-topic open should AUTO-CLOSE the overlay once Vitana
 * finishes the teaching turn, so the underlying Topic drawer's next-step buttons
 * are usable. activateOrb(topicId) arms a one-shot flag the ORB-widget hook
 * consumes in its onTurnComplete handler (see useOrbVoiceWidget).
 */

interface VitanaOrbApi {
  focusGuidedTopic?: (topicId: string) => void;
  show?: () => void;
}

// VTID-03292 (#4): one-shot "close after the teaching turn" flag, set when the
// ORB was opened by tapping a guided topic. Consumed by the widget's
// onTurnComplete handler in useOrbVoiceWidget.
let _guidedAutoClose = false;

/** Consume (read + reset) the one-shot guided auto-close flag. */
export function consumeGuidedAutoClose(): boolean {
  const v = _guidedAutoClose;
  _guidedAutoClose = false;
  return v;
}

export function activateOrb(topicId?: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  const orb = (window as unknown as { VitanaOrb?: VitanaOrbApi }).VitanaOrb;

  // Preferred path: focus the orb on the tapped topic so Vitana teaches it.
  if (topicId && orb && typeof orb.focusGuidedTopic === 'function') {
    _guidedAutoClose = true; // arm auto-close after the teaching turn (#4)
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
