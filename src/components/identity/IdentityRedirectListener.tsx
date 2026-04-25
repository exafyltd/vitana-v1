/**
 * VTID-01954 — Identity Redirect Listener
 *
 * Listens for `vitana:open-profile-edit`, `vitana:open-account-settings`,
 * and `vitana:open-app-settings` CustomEvents emitted by the brain when
 * an identity-mutation intent is detected ("change my name to X",
 * "Ändere meinen Namen", etc.) — see Plan Part 1.5.
 *
 * The brain (via Guardrail B in vitana-brain.ts) ALWAYS speaks the
 * sanctioned refusal phrasing first. This component handles the
 * deep-link side: navigate to the right screen and pass the section /
 * field hint as URL params so the page can focus the right input.
 *
 * Mount once near the top of App.tsx, inside Router.
 *
 * Pattern mirrors the G3 `vitana:open-life-compass` listener in
 * `LifeCompassPopupContext.tsx`.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const IDENTITY_PROFILE_EDIT_EVENT = "vitana:open-profile-edit";
export const IDENTITY_ACCOUNT_SETTINGS_EVENT = "vitana:open-account-settings";
export const IDENTITY_APP_SETTINGS_EVENT = "vitana:open-app-settings";

interface IdentityRedirectDetail {
  section?: string;
  field?: string | null;
}

/**
 * Build a target URL for the given event + detail. Routes:
 *   - profile-edit       → /me/profile?section=X&field=Y
 *   - account-settings   → /settings?section=X&field=Y
 *   - app-settings       → /settings/preferences?section=X
 *
 * Account/email/phone changes route to /settings (the umbrella screen)
 * because there's no dedicated /settings/account route in this app yet —
 * users land on Settings and can navigate to the right tile.
 */
function buildTargetUrl(eventName: string, detail: IdentityRedirectDetail): string {
  const params = new URLSearchParams();
  if (detail.section) params.set("section", detail.section);
  if (detail.field) params.set("field", detail.field);
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : "";

  switch (eventName) {
    case IDENTITY_PROFILE_EDIT_EVENT:
      return `/me/profile${suffix}`;
    case IDENTITY_ACCOUNT_SETTINGS_EVENT:
      // No dedicated /settings/account route — land on /settings and let
      // the user pick the right tile. Section/field still surface as
      // query params so a future dedicated screen can pre-focus.
      return `/settings${suffix}`;
    case IDENTITY_APP_SETTINGS_EVENT:
      return `/settings/preferences${suffix}`;
    default:
      return `/settings${suffix}`;
  }
}

export function IdentityRedirectListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleEvent = (eventName: string) => (e: Event) => {
      const detail: IdentityRedirectDetail =
        (e as CustomEvent<IdentityRedirectDetail>).detail || {};
      const target = buildTargetUrl(eventName, detail);
      console.log(
        `[VTID-01954] Identity redirect → ${target} (event=${eventName}, section=${detail.section}, field=${detail.field})`
      );
      navigate(target);
    };

    const profileHandler = handleEvent(IDENTITY_PROFILE_EDIT_EVENT);
    const accountHandler = handleEvent(IDENTITY_ACCOUNT_SETTINGS_EVENT);
    const appHandler = handleEvent(IDENTITY_APP_SETTINGS_EVENT);

    window.addEventListener(IDENTITY_PROFILE_EDIT_EVENT, profileHandler);
    window.addEventListener(IDENTITY_ACCOUNT_SETTINGS_EVENT, accountHandler);
    window.addEventListener(IDENTITY_APP_SETTINGS_EVENT, appHandler);

    return () => {
      window.removeEventListener(IDENTITY_PROFILE_EDIT_EVENT, profileHandler);
      window.removeEventListener(IDENTITY_ACCOUNT_SETTINGS_EVENT, accountHandler);
      window.removeEventListener(IDENTITY_APP_SETTINGS_EVENT, appHandler);
    };
  }, [navigate]);

  // Renders nothing — pure side-effect component.
  return null;
}

/**
 * Fire-and-forget global helper for non-React callers (voice intent
 * handlers, tool-call adapters). Safe to call from anywhere on window.
 */
export function requestIdentityRedirect(
  event: string,
  payload?: IdentityRedirectDetail
) {
  if (typeof window !== "undefined" && event.startsWith("vitana:open-")) {
    window.dispatchEvent(new CustomEvent(event, { detail: payload || {} }));
  }
}
