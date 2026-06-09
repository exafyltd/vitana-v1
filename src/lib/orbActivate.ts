/**
 * VTID-03281 — Guided Journey: activate the ORB (Vitana) from the catalog (P6).
 *
 * The ORB is the external `vtorb-fab` widget (loaded by useOrbVoiceWidget).
 * There is no public "speak this exact script" API, so we activate Vitana by
 * clicking the FAB — the same affordance the user taps — which opens the voice
 * session. The on-screen Topic Explanation carries the text; Vitana goes live
 * alongside it.
 *
 * FOLLOW-UP: precise per-topic narration (Vitana speaking the topic's
 * vitanaVoiceScript verbatim, then redirecting) needs an ORB session-seed
 * channel in the gateway orb-live bridge — a separate ORB-bridge change. This
 * util is the client seam for that; today it opens the ORB generically.
 */

export function activateOrb(): boolean {
  if (typeof document === 'undefined') return false;
  const fab =
    (document.querySelector('.vtorb-fab') as HTMLElement | null) ||
    (document.querySelector('[class^="vtorb-fab"]') as HTMLElement | null) ||
    (document.getElementById('vitana-orb-fab') as HTMLElement | null);
  if (fab) {
    fab.click();
    return true;
  }
  return false;
}
