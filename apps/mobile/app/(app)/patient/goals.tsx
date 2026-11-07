/** VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/goals` (src/App.tsx:1668: AuthGuard + ProtectedRoute patient, ComingSoonPlaceholder). */
import { PatientGate } from '../../../src/screens/patient/PatientGate';
import { ComingSoonScreen } from '../../../src/screens/patient/ComingSoonScreen';

export default function PatientGoalsRoute() {
  return (
    <PatientGate>
      <ComingSoonScreen route="goals" />
    </PatientGate>
  );
}
