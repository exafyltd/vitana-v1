/** VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/care-team` (src/App.tsx:1661: AuthGuard + ProtectedRoute patient, ComingSoonPlaceholder). */
import { PatientGate } from '../../../src/screens/patient/PatientGate';
import { ComingSoonScreen } from '../../../src/screens/patient/ComingSoonScreen';

export default function PatientCareTeamRoute() {
  return (
    <PatientGate>
      <ComingSoonScreen route="care-team" />
    </PatientGate>
  );
}
