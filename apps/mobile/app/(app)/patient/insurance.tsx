/** VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/insurance` (src/App.tsx:1675: AuthGuard + ProtectedRoute patient, ComingSoonPlaceholder). */
import { PatientGate } from '../../../src/screens/patient/PatientGate';
import { ComingSoonScreen } from '../../../src/screens/patient/ComingSoonScreen';

export default function PatientInsuranceRoute() {
  return (
    <PatientGate>
      <ComingSoonScreen route="insurance" />
    </PatientGate>
  );
}
