import { ReactNode, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DOMAIN_TENANT_MAP } from "@/config/domain-tenant-mapping";

/**
 * ShareEntry
 *
 * Purpose: provide a "safe entry" for shared links that avoids deep-link 404s
 * on hosts that don't rewrite arbitrary paths to index.html.
 *
 * Also handles domain-based tenant redirects (e.g., vitanaland.com → /_intro/maxina)
 *
 * Usage: https://vitana.exafy.io/?share=event&slug=my-event&utm_source=...
 */
export default function ShareEntry({ fallback }: { fallback: ReactNode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    // 1. Check for domain-based tenant redirect (only on root path)
    const hostname = window.location.hostname;
    const tenantForDomain = DOMAIN_TENANT_MAP[hostname];
    
    if (tenantForDomain && window.location.pathname === '/') {
      // Preserve UTM params for attribution
      const qs = params.toString();
      navigate(`/_intro/${tenantForDomain}${qs ? `?${qs}` : ''}`, { replace: true });
      return;
    }

    // 2. Handle share links
    const share = params.get("share");
    if (!share) return;

    if (share === "event") {
      const slug = params.get("slug");
      const id = params.get("id");

      const nextPath = slug
        ? `/e/${encodeURIComponent(slug)}`
        : id
          ? `/pub/events/${encodeURIComponent(id)}`
          : null;

      if (!nextPath) return;

      // Preserve UTM params for attribution, but remove routing params.
      const nextParams = new URLSearchParams(params);
      nextParams.delete("share");
      nextParams.delete("slug");
      nextParams.delete("id");

      const qs = nextParams.toString();
      navigate(`${nextPath}${qs ? `?${qs}` : ""}`, { replace: true });
    }
  }, [navigate, params]);

  return <>{fallback}</>;
}
