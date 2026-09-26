/**
 * VTID-04508 (Community Autopilot CA-7): once a member is signed in, claim a
 * stored invite code (from `/i/<code>`) exactly once. Renders nothing.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { claimStoredInvite, readInviteCode } from "@/lib/invite-attribution";

export function InviteClaimer() {
  const { user } = useAuth();
  const tried = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.id || tried.current === user.id || !readInviteCode()) return;
    tried.current = user.id;
    void claimStoredInvite();
  }, [user?.id]);
  return null;
}

export default InviteClaimer;
