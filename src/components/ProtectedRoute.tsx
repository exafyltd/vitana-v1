import { ReactElement } from "react";
import { useRole, UserRole } from "@/hooks/useRole";
import { useAuth } from "@/context/AuthProvider";
import NotAuthorized from "@/pages/NotAuthorized";
import { DelayedLoader } from "@/components/ui/DelayedLoader";

interface ProtectedRouteProps {
  children: ReactElement;
  requiredRole: UserRole;
}

// VTID-05081: "settled" lives in module scope, per user, for this page
// session. Every tab switch mounts a fresh ProtectedRoute; with a per-instance
// ref, a role query with no data yet (e.g. its RPC failed) put the loader's
// spinner up again on every return. A hard reload starts fresh, so the
// VTID-03909 first-load gate below is unchanged.
let settledFor: string | null = null;

/** Test helper. */
export function __resetProtectedRouteSettled(): void {
  settledFor = null;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { hasPermission, isLoading } = useRole();
  const { user } = useAuth();
  const owner = user?.id ?? "";

  // VTID-04867: the loader is for the first resolution only. A role query that
  // has never succeeded goes back to "pending" on every refetch (React Query
  // resets status when there is no data), and the page's own useRole() refetches
  // when it mounts — so a failed get_role_preference used to swap the page for
  // the loader, remount it, refetch, and loop: the page flickered in and out
  // for as long as the RPC kept failing. Once settled, keep the page mounted.
  if (!isLoading) settledFor = owner;

  // VTID-03909: on a fresh page load (e.g. the hard reload the role switcher
  // does after confirming a switch) the role preference query starts out
  // loading, and hasPermission() falls back to the "community" default while
  // it does — which used to render "Access Denied" for a flash on every
  // role-gated route before the real role arrived and this re-rendered.
  if (isLoading && settledFor !== owner) {
    return <DelayedLoader fullscreen source="protected-route" />;
  }

  if (!hasPermission(requiredRole)) {
    return <NotAuthorized />;
  }

  return children;
}
