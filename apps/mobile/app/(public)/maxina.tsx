/**
 * VTID-05186 (N3, plan change 16) — `/maxina` (AUTH.MAXINA_PORTAL), functional part.
 * VTID-05449 — with the mobile-web portal chrome (PortalScreen → PortalChrome).
 */
import { PortalScreen } from '../../src/screens/auth/PortalScreen';

export default function MaxinaPortal() {
  return <PortalScreen tenant="maxina" />;
}
