/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — `/professional/education`
 * (src/App.tsx, `ProtectedRoute requiredRole="professional"` around the web's
 * `ComingSoonPlaceholder`).
 */
import { ProfessionalComingSoonScreen } from '../../../src/screens/professional/ComingSoonScreen';

export default function ProfessionalEducationRoute() {
  return <ProfessionalComingSoonScreen route="education" />;
}
