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
 * scrolls on the next frame and once more a moment later.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const HASH_SCROLL_RETRY_MS = 600;

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
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: location.state });
  }, [location.hash, location.pathname, location.search, location.state, navigate]);
}
