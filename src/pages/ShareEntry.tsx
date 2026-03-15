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

  // Check for share links FIRST (highest priority)
  const shareType = params.get("share");
  const hasShareLink = !!shareType;

  // Only consider domain redirect if NO share link present
  const hostname = window.location.hostname;
  const tenantForDomain = DOMAIN_TENANT_MAP[hostname];
  const shouldRedirectForDomain = !hasShareLink && tenantForDomain && window.location.pathname === '/';

  useEffect(() => {
    // 1. Handle share links FIRST (takes priority over domain redirect)
    if (shareType === "event") {
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
      return;
    }

    if (shareType === "match") {
      const id = params.get("id");
      if (!id) return;

      const nextParams = new URLSearchParams(params);
      nextParams.delete("share");
      nextParams.delete("id");

      const qs = nextParams.toString();
      navigate(`/discover?m=${encodeURIComponent(id)}${qs ? `&${qs}` : ""}`, { replace: true });
      return;
    }

    // 2. Handle domain-based tenant redirect (only if no share link)
    if (shouldRedirectForDomain && tenantForDomain) {
      const qs = params.toString();
      navigate(`/_intro/${tenantForDomain}${qs ? `?${qs}` : ''}`, { replace: true });
      return;
    }
  }, [navigate, params, shareType, shouldRedirectForDomain, tenantForDomain]);

  // Don't render fallback if we're about to redirect for domain or share link
  if (shouldRedirectForDomain || hasShareLink) {
    return null;
  }

  return <>{fallback}</>;
}
