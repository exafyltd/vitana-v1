/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — `/settings/connected-apps`
 * (SETTINGS.CONNECTED_APPS). Mirrors the web route
 * (`src/App.tsx` `RedirectPreservingSearch to="/connectors"`): a redirect to
 * `/connectors` that keeps the query string (OAuth callbacks such as
 * `?connected=google` or `?app=gmail` land here and must reach the screen).
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ConnectedAppsRoute() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  return <Redirect href={{ pathname: '/connectors', params }} />;
}
