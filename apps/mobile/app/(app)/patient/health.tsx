/** VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/health` (src/App.tsx:1638: AuthGuard + ProtectedRoute patient). */
import { PatientGate } from '../../../src/screens/patient/PatientGate';
import { HealthScreen } from '../../../src/screens/patient/HealthScreen';

export default function PatientHealthRoute() {
  return (
    <PatientGate>
      <HealthScreen />
    </PatientGate>
  );
}
