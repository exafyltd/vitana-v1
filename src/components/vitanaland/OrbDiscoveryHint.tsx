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

type Coords = { left: number; bottom: number };

/**
 * Discoverability hint for the Vitana Orb on the MAXINA intro / sign-up landing
 * pages. New visitors don't realize the floating Orb is a button, so we anchor
 * a labeled pill above it ("Tap here to talk to Vitana") that points at the Orb
 * and pulses gently. Tapping it opens the Orb.
 *
 * Anchored off the live FAB's bounding rect (its position is CSS-driven and
 * differs desktop vs. mobile). Hidden while the Orb overlay is open — the widget
 * toggles `vtorb-hidden` on the FAB in that state.
 */
export default function OrbDiscoveryHint() {
  const { translate } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [visible, setVisible] = useState(false);
  // Dismissed once the user opens the Orb from the pill, so it doesn't flicker
  // back in the moment the overlay closes again on the same page visit.
  const dismissedRef = useRef(false);

  useEffect(() => {
    let fab: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const sync = () => {
      if (dismissedRef.current) {
        setVisible(false);
        return;
      }
      if (!fab || !document.body.contains(fab)) {
        fab = findFab();
        if (fab) attachObservers(fab);
      }
      if (!fab) {
        setVisible(false);
        return;
      }
      const rect = fab.getBoundingClientRect();
      const isOpenOrHidden =
        fab.classList.contains("vtorb-hidden") ||
        rect.width === 0 ||
        rect.height === 0;
      if (isOpenOrHidden) {
        setVisible(false);
        return;
      }
      setCoords({
        left: rect.left + rect.width / 2,
        bottom: window.innerHeight - rect.top + 12,
      });
      setVisible(true);
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

  const handleClick = () => {
    dismissedRef.current = true;
    setVisible(false);
    showOrb();
  };

  if (!visible || !coords) return null;

  const label = translate("orbHint.tapToTalk", "Tap here to talk to Vitana");

  return (
    <div
      className="fixed z-50"
      style={{
        left: coords.left,
        bottom: coords.bottom,
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }}
      aria-hidden={false}
    >
      <motion.button
        type="button"
        onClick={handleClick}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 1, y: 0, scale: [1, 1.04, 1] }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0.2 }
            : {
                opacity: { duration: 0.35 },
                y: { duration: 0.35 },
                scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
              }
        }
        className="relative whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-white/20"
        style={{ pointerEvents: "auto" }}
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
