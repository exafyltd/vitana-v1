/**
 * Commerce Partner Onboarding, Phase 4 (VTID-03951) — this screen was a
 * fully hardcoded mock (3 fake patients, no state, no fetch, no working
 * buttons). A full patient roster (appointments, conditions, care plans)
 * has no backing data source anywhere in this codebase — building one is a
 * separate, larger feature than this phase's real deliverable ("my
 * assigned health-test orders" — see `CommerceHealthOrders.tsx`, reachable
 * via Commerce Portal for a partner org's own staff/professional members,
 * a different, independent authorization axis from this route's
 * Vitana-wide `dbRole==='professional'` gate). Deliberately not fabricated.
 */
import { Users } from "lucide-react";
import { ComingSoonPlaceholder } from "@/components/patient/ComingSoonPlaceholder";

export default function ProfessionalPatients() {
  return <ComingSoonPlaceholder icon={Users} titleKey="screens.professional.myPatients" />;
}
