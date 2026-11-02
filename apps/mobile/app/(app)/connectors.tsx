/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — `/connectors`
 * (SETTINGS.SOCIAL) and its eight `?tab=` category rows (CONNECTORS.AGENT, AI,
 * FITNESS, HEALTH, MEDIA, OTHER, PRODUCTIVITY, SOCIAL). ConnectorsScreen reads
 * the `tab` search param, as the web `MobileConnectedAppsView` does.
 */
import { ConnectorsScreen } from '../../src/screens/support/ConnectorsScreen';

export default function ConnectorsRoute() {
  return <ConnectorsScreen />;
}
