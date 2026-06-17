import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * URL-addressable tab state for desktop pages.
 *
 * Reads the active tab from `?<param>=` (falling back to `defaultValue` when the
 * param is absent) and writes it back when the tab changes — so a tab is
 * deep-linkable, back/forward-button friendly, and reachable by the Vitana
 * Navigator (which can only route to a URL, not to React state).
 *
 * Drop-in replacement for `const [tab, setTab] = useState(defaultValue)`:
 *   const [tab, setTab] = useUrlTab("tab", "overview");
 *
 * The default value is kept OUT of the URL (a bare `/health` stays clean and
 * still resolves to the default tab).
 */
export function useUrlTab(
  param: string,
  defaultValue: string,
): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(param) || defaultValue;

  const setValue = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (!next || next === defaultValue) params.delete(param);
          else params.set(param, next);
          return params;
        },
        { replace: true },
      );
    },
    [param, defaultValue, setSearchParams],
  );

  return [value, setValue];
}
