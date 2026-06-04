/**
 * VTID-03300 — open the ORB focused on a specific "My Journey" Foundation step.
 *
 * The external VitanaOrb widget (loaded cross-origin from the gateway as
 * orb-widget.js) starts a voice session as soon as the overlay opens. By
 * pre-arming a one-shot `journey_focus_step` before opening, the gateway's
 * journey-guide provider LEADS with that exact step ("Let's get your Profile
 * set up…") instead of the sequentially-computed next step.
 *
 * Prefers the dedicated `focusJourneyStep` method; falls back to
 * `updateContext` + `show` for older cached widget builds. If the widget isn't
 * loaded yet, returns false so the caller can degrade gracefully.
 */
type OrbWidget = {
  focusJourneyStep?: (stepKey: string) => void;
  updateContext?: (ctx: { journey_focus_step?: string }) => void;
  show?: () => void;
};

function getOrb(): OrbWidget | null {
  const orb = (window as unknown as { VitanaOrb?: OrbWidget }).VitanaOrb;
  return orb ?? null;
}

/**
 * Pre-arm the focus on the widget WITHOUT opening it. Used when a consent
 * dialog must be shown first — the focus persists until the post-consent
 * `show()` consumes it (one-shot on the widget side).
 */
export function armJourneyStepFocus(stepKey: string): void {
  const orb = getOrb();
  if (orb && typeof orb.updateContext === "function") {
    orb.updateContext({ journey_focus_step: stepKey });
  }
}

/** Open the orb and start a session focused on `stepKey`. Returns false if the widget is unavailable. */
export function focusJourneyStepInOrb(stepKey: string): boolean {
  const orb = getOrb();
  if (!orb) return false;
  if (typeof orb.focusJourneyStep === "function") {
    orb.focusJourneyStep(stepKey);
    return true;
  }
  // Fallback for widget builds predating focusJourneyStep.
  if (typeof orb.updateContext === "function") {
    orb.updateContext({ journey_focus_step: stepKey });
  }
  if (typeof orb.show === "function") {
    orb.show();
    return true;
  }
  return false;
}
