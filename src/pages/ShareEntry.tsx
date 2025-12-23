import { ReactNode, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * ShareEntry
 *
 * Purpose: provide a "safe entry" for shared links that avoids deep-link 404s
 * on hosts that don't rewrite arbitrary paths to index.html.
 *
 * Usage: https://vitana.exafy.io/?share=event&slug=my-event&utm_source=...
 */
export default function ShareEntry({ fallback }: { fallback: ReactNode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
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
