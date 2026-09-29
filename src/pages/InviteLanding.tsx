/**
 * VTID-04508 (Community Autopilot CA-7): `/i/<code>` — a friend's personal
 * invite link. Remembers the code and hands over to the community sign-up (Join tab); the
 * claim runs after the new member is signed in (InviteClaimer).
 */
import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { rememberInviteCode } from "@/lib/invite-attribution";

export default function InviteLanding() {
  const { code = "" } = useParams();
  useEffect(() => {
    rememberInviteCode(code);
  }, [code]);
  // VTID-04524: an invited friend is almost always new, so land on "Join", not "Sign in".
  return <Navigate to="/maxina?tab=signup" replace />;
}
