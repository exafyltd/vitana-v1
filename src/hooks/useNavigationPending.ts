import { useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * VTID-05106 — true while a navigation has started but its screen has not
 * committed yet.
 *
 * With `future={{ v7_startTransition: true }}` on <BrowserRouter>, history is
 * updated at once while React keeps the old screen until the new route (and
 * its lazy chunk) can render. During that window the browser URL is ahead of
 * the router's committed location; that gap is the pending state. A data
 * router's useNavigation() is not available under <BrowserRouter>.
 *
 * The browser URL is re-read on popstate, on the Navigation API's
 * currententrychange (fires for pushState/replaceState where supported) and
 * after any click. Without the Navigation API a pushState-only navigation is
 * not observed, so the progress bar simply does not show — never a stuck bar.
 */
function browserPath(basename: string): string {
  if (typeof window === 'undefined') return '';
  let path = window.location.pathname;
  const base = basename.replace(/\/+$/, '');
  if (base && path.startsWith(base)) path = path.slice(base.length) || '/';
  return path + window.location.search;
}

type NavigationLike = EventTarget;

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const nav = (window as Window & { navigation?: NavigationLike }).navigation;
  // After the whole click dispatch (a microtask could run before the router's
  // own bubble-phase handler has pushed the new URL).
  const afterClick = () => setTimeout(onChange, 0);
  window.addEventListener('popstate', onChange);
  window.addEventListener('click', afterClick, true);
  nav?.addEventListener?.('currententrychange', onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('click', afterClick, true);
    nav?.removeEventListener?.('currententrychange', onChange);
  };
}

export function useNavigationPending(basename: string = import.meta.env.BASE_URL ?? '/'): boolean {
  const location = useLocation();
  const current = useSyncExternalStore(
    subscribe,
    () => browserPath(basename),
    () => '',
  );
  if (!current) return false;
  return current !== location.pathname + location.search;
}
