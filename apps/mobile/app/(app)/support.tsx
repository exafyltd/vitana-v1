/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — `/support`
 * (SETTINGS.SUPPORT) and its `?tab=contact|community|faqs` rows
 * (SETTINGS.SUPPORT_CONTACT / _COMMUNITY / _FAQ). SupportScreen reads the
 * `tab` (and `ticket`) search params, as the web `MobileSupport` does.
 */
import { SupportScreen } from '../../src/screens/support/SupportScreen';

export default function SupportRoute() {
  return <SupportScreen />;
}
