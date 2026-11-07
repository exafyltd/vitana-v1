/** VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/notifications` (src/App.tsx:1682: AuthGuard + ProtectedRoute patient, ComingSoonPlaceholder). */
import { PatientGate } from '../../../src/screens/patient/PatientGate';
import { ComingSoonScreen } from '../../../src/screens/patient/ComingSoonScreen';

export default function PatientNotificationsRoute() {
  return (
    <PatientGate>
      <ComingSoonScreen route="notifications" />
    </PatientGate>
  );
}
