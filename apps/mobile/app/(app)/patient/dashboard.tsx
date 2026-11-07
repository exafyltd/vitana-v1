/** VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/dashboard` (src/App.tsx:1631: AuthGuard + ProtectedRoute patient). */
import { PatientGate } from '../../../src/screens/patient/PatientGate';
import { DashboardScreen } from '../../../src/screens/patient/DashboardScreen';

export default function PatientDashboardRoute() {
  return (
    <PatientGate>
      <DashboardScreen />
    </PatientGate>
  );
}
