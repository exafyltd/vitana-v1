import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

// The Orb is an external widget (window.VitanaOrb) that appends a floating
// button to <body>. These are the same selectors useOrbVoiceWidget.isOrbAlive()
// uses to locate it. The widget is loaded via a deferred <script>, so it may
// not exist yet on first paint — we poll until it appears.
const FAB_SELECTOR =
  '.vtorb-fab, [class^="vtorb-fab"], .vitana-orb, #vitana-orb-fab, [data-vitana-orb="true"]';

function findFab(): HTMLElement | null {
  return document.querySelector<HTMLElement>(FAB_SELECTOR);
}

function showOrb(): void {
  const orb = (window as unknown as { VitanaOrb?: { show?: () => void } })
    .VitanaOrb;
  if (orb && typeof orb.show === "function") {
    try {
      orb.show();
    } catch {
      /* widget not ready — ignore */
    }
  }
}

type Coords = { left: number; bottom: number; fabHeight: number };

// The hint plays a recurring cycle so it keeps drawing attention to the Orb
// without ever permanently covering the page content beneath it (e.g. the
// footer links on the sign-up page): it rises above the Orb, holds briefly so
// it can be read, then slides down and shrinks "into" the Orb and disappears
// for a beat before repeating.
type Phase = "enter" | "hold" | "exit" | "gap";
const PHASE_MS: Record<Phase, number> = {
  enter: 450,
  hold: 2400,
  exit: 700,
  gap: 5000,
};
const NEXT_PHASE: Record<Phase, Phase> = {
  enter: "hold",
  hold: "exit",
  exit: "gap",
  gap: "enter",
};

/**
 * Discoverability hint for the Vitana Orb on the MAXINA intro / sign-up landing
 * pages. New visitors don't realize the floating Orb is a button, so a labeled
 * pill ("Tap here to talk to Vitana") rises above it and then animates down and
 * into the Orb, drawing the eye to it. Tapping the pill opens the Orb.
 *
 * Anchored off the live FAB's bounding rect (its position is CSS-driven and
 * differs desktop vs. mobile). Hidden while the Orb overlay is open — the widget
 * toggles `vtorb-hidden` on the FAB in that state.
 */
export default function OrbDiscoveryHint() {
  const { translate } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [coords, setCoords] = useState<Coords | null>(null);
  // FAB is present in the DOM and the Orb overlay is closed.
  const [available, setAvailable] = useState(false);
  const [phase, setPhase] = useState<Phase>("enter");
  // Dismissed once the user opens the Orb from the pill, so it doesn't reappear
  // for the rest of this page visit.
  const dismissedRef = useRef(false);
  const wasAvailableRef = useRef(false);

  useEffect(() => {
    let fab: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const sync = () => {
      if (dismissedRef.current) {
        setAvailable(false);
        return;
      }
      if (!fab || !document.body.contains(fab)) {
        fab = findFab();
        if (fab) attachObservers(fab);
      }
      if (!fab) {
        setAvailable(false);
        return;
      }
      const rect = fab.getBoundingClientRect();
      const isOpenOrHidden =
        fab.classList.contains("vtorb-hidden") ||
        rect.width === 0 ||
        rect.height === 0;
      if (isOpenOrHidden) {
        setAvailable(false);
        return;
      }
      setCoords({
        left: rect.left + rect.width / 2,
        bottom: window.innerHeight - rect.top + 12,
        fabHeight: rect.height,
      });
      setAvailable(true);
    };

    const attachObservers = (el: HTMLElement) => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      resizeObserver = new ResizeObserver(sync);
      resizeObserver.observe(el);
      // React instantly when the widget toggles vtorb-hidden (overlay open/close).
      mutationObserver = new MutationObserver(sync);
      mutationObserver.observe(el, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    };

    sync();
    // Low-frequency poll: finds the FAB once the deferred widget script loads,
    // re-acquires it if the widget tears down and recreates it on auth changes,
    // and tracks position shifts from Appilix bottom-nav CSS vars.
    const interval = window.setInterval(sync, 500);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, []);

  // Restart the cycle from the top whenever the Orb becomes available again
  // (page load, or the overlay closing), so it doesn't resume mid-animation.
  useEffect(() => {
    if (available && !wasAvailableRef.current) setPhase("enter");
    wasAvailableRef.current = available;
  }, [available]);

  // Drive the enter → hold → exit → gap cycle.
  useEffect(() => {
    if (!available || dismissedRef.current) return;
    const timer = window.setTimeout(() => {
      setPhase((p) => NEXT_PHASE[p]);
    }, PHASE_MS[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, available]);

  const handleClick = () => {
    dismissedRef.current = true;
    setAvailable(false);
    showOrb();
  };

  // During the "gap" phase the pill is fully gone so it never blocks taps on
  // the content beneath the Orb.
  if (!available || dismissedRef.current || phase === "gap" || !coords) {
    return null;
  }

  const label = translate("orbHint.tapToTalk", "Tap here to talk to Vitana");
  const isExit = phase === "exit";
  // Travel far enough that the shrinking pill visually lands on the Orb's center.
  const slideY = coords.fabHeight / 2 + 30;

  const animate = prefersReducedMotion
    ? { opacity: isExit ? 0 : 1, y: 0, scale: 1 }
    : isExit
      ? { opacity: 0, y: slideY, scale: 0.25 }
      : { opacity: 1, y: 0, scale: 1 };

  const transition = isExit
    ? { duration: prefersReducedMotion ? 0.3 : 0.7, ease: "easeIn" }
    : { duration: prefersReducedMotion ? 0.2 : 0.45, ease: "easeOut" };

  return (
    <div
      className="fixed z-50"
      style={{
        left: coords.left,
        bottom: coords.bottom,
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }}
    >
      <motion.button
        type="button"
        onClick={handleClick}
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 6, scale: 0.96 }
        }
        animate={animate}
        transition={transition}
        className="relative whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-white/20"
        style={{ pointerEvents: isExit ? "none" : "auto" }}
      >
        {label}
        {/* Speech-bubble pointer aimed down at the Orb */}
        <span
          aria-hidden
          className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] bg-primary"
        />
      </motion.button>
    </div>
  );
}
