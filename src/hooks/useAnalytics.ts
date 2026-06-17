/**
 * useAnalytics (BOOTSTRAP-PRODUCT-ANALYTICS)
 *
 * Thin React-friendly wrapper around the product analytics client
 * (src/lib/product-analytics/client.ts). Components call
 * `const { track } = useAnalytics()` and emit metadata-only events; the
 * client batches and ships them to the gateway.
 */

import { useCallback } from "react";
import { track as trackEvent } from "@/lib/product-analytics/client";
import type { TrackOptions } from "@/lib/product-analytics/types";

export function useAnalytics() {
  const track = useCallback((eventName: string, options?: TrackOptions) => {
    trackEvent(eventName, options);
  }, []);

  return { track };
}

export default useAnalytics;
