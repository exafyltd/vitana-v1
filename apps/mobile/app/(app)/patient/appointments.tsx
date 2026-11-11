/** VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/appointments` (src/App.tsx:1645: AuthGuard + ProtectedRoute patient). */
import { PatientGate } from '../../../src/screens/patient/PatientGate';
import { AppointmentsScreen } from '../../../src/screens/patient/AppointmentsScreen';

export default function PatientAppointmentsRoute() {
  return (
    <PatientGate>
      <AppointmentsScreen />
    </PatientGate>
  );
}
