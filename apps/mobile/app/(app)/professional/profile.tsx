/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — `/professional/profile`
 * (src/App.tsx, `ProtectedRoute requiredRole="professional"` around the web's
 * `ComingSoonPlaceholder`).
 */
import { ProfessionalComingSoonScreen } from '../../../src/screens/professional/ComingSoonScreen';

export default function ProfessionalProfileRoute() {
  return <ProfessionalComingSoonScreen route="profile" />;
}
