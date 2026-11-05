/**
 * VTID-05431 (Native Wave 2, settings lane) — `/settings`, the settings hub.
 * Ledger rows SETTINGS.OVERVIEW + the 13 `?mode=` sections (notifications,
 * privacy[.visibility|.data|.security], preferences[.appearance|.language],
 * billing[.plan|.payment|.invoices|.creator]); SettingsScreen reads `mode`.
 */
import { SettingsScreen } from '../../../src/screens/settings/SettingsScreen';

export default function SettingsRoute() {
  return <SettingsScreen />;
}
