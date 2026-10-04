import { ReactElement, useRef } from "react";
import { useRole, UserRole } from "@/hooks/useRole";
import NotAuthorized from "@/pages/NotAuthorized";
import { DelayedLoader } from "@/components/ui/DelayedLoader";

interface ProtectedRouteProps {
  children: ReactElement;
  requiredRole: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { hasPermission, isLoading } = useRole();

  // VTID-04867: the loader is for the first resolution only. A role query that
  // has never succeeded goes back to "pending" on every refetch (React Query
  // resets status when there is no data), and the page's own useRole() refetches
  // when it mounts — so a failed get_role_preference used to swap the page for
  // the loader, remount it, refetch, and loop: the page flickered in and out
  // for as long as the RPC kept failing. Once settled, keep the page mounted.
  const settled = useRef(false);
  if (!isLoading) settled.current = true;

  // VTID-03909: on a fresh page load (e.g. the hard reload the role switcher
  // does after confirming a switch) the role preference query starts out
  // loading, and hasPermission() falls back to the "community" default while
  // it does — which used to render "Access Denied" for a flash on every
  // role-gated route before the real role arrived and this re-rendered.
  if (isLoading && !settled.current) {
    return <DelayedLoader fullscreen />;
  }

  if (!hasPermission(requiredRole)) {
    return <NotAuthorized />;
  }

  return children;
}
