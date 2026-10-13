/** VTID-05186 (N3, plan change 16) — `/maxina` (AUTH.MAXINA_PORTAL), functional part. */
import { PortalScreen } from '../../src/screens/auth/PortalScreen';

export default function MaxinaPortal() {
  return <PortalScreen tenant="maxina" />;
}
