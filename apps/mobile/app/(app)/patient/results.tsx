/** VTID-05525 (Native Wave 2, role-modes patient lane) — `/patient/results` (src/App.tsx:1656: AuthGuard only, VTID-03988). */
import { ResultsScreen } from '../../../src/screens/patient/ResultsScreen';

export default function PatientResultsRoute() {
  return <ResultsScreen />;
}
