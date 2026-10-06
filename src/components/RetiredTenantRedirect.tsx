import { Navigate, useLocation } from "react-router-dom";
import { retiredTenantRedirectPath } from "@/lib/retired-tenants";

/**
 * VTID-04836 — old links into a retired tenant portal (/earthlinks,
 * /earthlinks/confirmed?…) land on the successor tenant's equivalent
 * (/maxina, /maxina/confirmed?…), keeping the rest of the path, the query
 * and the hash. Mounted in App.tsx on `/earthlinks/*`.
 */
export function RetiredTenantRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={retiredTenantRedirectPath(pathname, search, hash) ?? "/maxina"} replace />;
}

export default RetiredTenantRedirect;
