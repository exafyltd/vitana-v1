/**
 * AnalyticsTracker (BOOTSTRAP-PRODUCT-ANALYTICS)
 *
 * Renders nothing. Lives INSIDE <BrowserRouter> (next to
 * AppHooksInitializer) and:
 *  1. feeds tenant / hashed-user / locale context into the product
 *     analytics client, and
 *  2. emits a `screen_viewed` journey event on every route change.
 *
 * The user id is SHA-256-hashed here, in the browser, before it ever
 * reaches the analytics client — the raw id is never part of an event.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { getI18nLocale } from "@/lib/i18n-toast";
import {
  noteRouteChange,
  setAnalyticsContext,
  track,
} from "@/lib/product-analytics/client";

async function sha256Hex(value: string): Promise<string | null> {
  try {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null; // non-secure context — track anonymously rather than leak the id
  }
}

export default function AnalyticsTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const { activeTenantId } = useTenant();

  useEffect(() => {
    setAnalyticsContext({ tenantId: activeTenantId ?? null, language: getI18nLocale() });
  }, [activeTenantId]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setAnalyticsContext({ userIdHash: null, consent: "anonymous" });
      return;
    }
    void sha256Hex(user.id).then((hash) => {
      if (!cancelled) setAnalyticsContext({ userIdHash: hash, consent: "granted" });
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const previous = noteRouteChange(location.pathname);
    if (previous === location.pathname) return;
    track("screen_viewed", {
      event_type: "journey",
      properties: {
        previous_route: previous,
        search_present: Boolean(location.search),
      },
    });
  }, [location.pathname, location.search]);

  return null;
}
