/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — `/professional/patients`
 * (src/App.tsx, `ProtectedRoute requiredRole="professional"` around
 * src/pages/professional/Patients.tsx, which renders the `ComingSoonPlaceholder`).
 */
import { ProfessionalComingSoonScreen } from '../../../src/screens/professional/ComingSoonScreen';

export default function ProfessionalPatientsRoute() {
  return <ProfessionalComingSoonScreen route="patients" />;
}
