/**
 * VTID-05431 (Native Wave 2, settings lane) — `/settings/preferences`
 * (SETTINGS.PREFERENCES_ACCESSIBILITY `?section=accessibility`). On the phone
 * the web redirects to the hub (`MobileSettingsSection`, src/App.tsx:700-713):
 * `?section=<slug>` → `/settings?mode=preferences.<slug>`. `accessibility` is
 * not a valid section, so the hub falls back to notifications — today's
 * mobile-web behaviour (requirements R1.5); no new section is invented.
 */
import { PreferencesRedirect } from '../../../src/screens/settings/PreferencesRedirect';

export default function SettingsPreferencesRoute() {
  return <PreferencesRedirect />;
}
