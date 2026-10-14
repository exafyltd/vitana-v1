/** VTID-05186 (N3, plan change 16) — `/alkalma` (AUTH.ALKALMA_PORTAL), functional part. */
import { PortalScreen } from '../../src/screens/auth/PortalScreen';

export default function AlkalmaPortal() {
  return <PortalScreen tenant="alkalma" />;
}
