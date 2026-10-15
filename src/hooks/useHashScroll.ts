/**
 * VTID-05212 — land a deep link on the right section of a long page.
 *
 * `useHashScroll({ calendar: 'connectors-mail-calendar-contacts' })`: when
 * the URL hash is one of the keys, scroll that element into view, then drop
 * the hash (path, query and state kept), so following the same link again
 * scrolls again. React Router does not scroll to a hash on its own. Same
 * consume-the-hash pattern as `useProfileEditorDeepLink`.
 *
 * Content above the target can still be loading when the page mounts, so it
 * scrolls on the next frame and once more a moment later. Lists that arrive
 * from the gateway can grow that content after both (staging: /connectors on a
 * cold load pushed the section out of view on desktop), so it also checks at
 * HASH_SCROLL_SETTLE_MS and scrolls again only if the section has drifted away
 * from the top. Any wheel, touch, key or pointer input from the member stops
 * the checks, so it never fights them.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const HASH_SCROLL_RETRY_MS = 600;
/** Later checks, for content above the target that is still growing. */
export const HASH_SCROLL_SETTLE_MS: readonly number[] = [1500, 3000];
/** The section counts as "at the top" within this many px of it (scroll-mt-4 is 16 px). */
export const HASH_SCROLL_NEAR_TOP_PX = 48;
const MEMBER_INPUT_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

export function useHashScroll(targets: Readonly<Record<string, string>>): void {
  const location = useLocation();
  const navigate = useNavigate();
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  useEffect(() => {
    const hash = location.hash.replace(/^#/, '');
    const id = targetsRef.current[hash];
    if (!id) return;
    // Not cancelled on cleanup: consuming the hash re-runs this effect at once.
    // A missing element (page left in between) makes both calls no-ops.
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestAnimationFrame(scroll);
    setTimeout(scroll, HASH_SCROLL_RETRY_MS);

    // Later checks: scroll again only when the section drifted and the member has not taken over.
    let memberMoved = false;
    const onInput = () => {
      memberMoved = true;
    };
    MEMBER_INPUT_EVENTS.forEach((name) => window.addEventListener(name, onInput, { passive: true }));
    const stopWatching = () => MEMBER_INPUT_EVENTS.forEach((name) => window.removeEventListener(name, onInput));
    HASH_SCROLL_SETTLE_MS.forEach((delay, index) => {
      setTimeout(() => {
        if (!memberMoved) {
          const el = document.getElementById(id);
          if (el && Math.abs(el.getBoundingClientRect().top) > HASH_SCROLL_NEAR_TOP_PX) el.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
        if (index === HASH_SCROLL_SETTLE_MS.length - 1) stopWatching();
      }, delay);
    });
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: location.state });
  }, [location.hash, location.pathname, location.search, location.state, navigate]);
}
