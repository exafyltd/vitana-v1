/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — `/professional/billing`
 * (src/App.tsx, `ProtectedRoute requiredRole="professional"` around the web's
 * `ComingSoonPlaceholder`).
 */
import { ProfessionalComingSoonScreen } from '../../../src/screens/professional/ComingSoonScreen';

export default function ProfessionalBillingRoute() {
  return <ProfessionalComingSoonScreen route="billing" />;
}
