/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — `/professional/tools`
 * (src/App.tsx, `ProtectedRoute requiredRole="professional"` around the web's
 * `ComingSoonPlaceholder`).
 */
import { ProfessionalComingSoonScreen } from '../../../src/screens/professional/ComingSoonScreen';

export default function ProfessionalToolsRoute() {
  return <ProfessionalComingSoonScreen route="tools" />;
}
