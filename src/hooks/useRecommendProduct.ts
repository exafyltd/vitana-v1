/**
 * VTID-02950: "Recommend & Earn" — recommend a Discover product to others.
 *
 * Silently records the recommendation (find-or-create, idempotent on the
 * backend) and confirms with a toast. Sharing the resulting link is a
 * separate, on-demand action from the Business profile tab — see the
 * per-row share button in MobileBusinessCard.tsx / DesktopBusinessCard.tsx.
 */

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createProductRecommendation, useMyRecommendations } from "@/hooks/useMarketplace";
import { notifySuccess, notifyError } from "@/lib/i18n-toast";

export function useRecommendProduct(productId: string) {
  const [isRecommending, setIsRecommending] = useState(false);
  const queryClient = useQueryClient();
  const { data } = useMyRecommendations();
  const isRecommended = (data?.items ?? []).some((item) => item.product_id === productId);

  const recommendProduct = useCallback(async () => {
    if (isRecommended) return;
    setIsRecommending(true);
    try {
      await createProductRecommendation(productId);
      notifySuccess("discover.recommendAdded");
      await queryClient.invalidateQueries({ queryKey: ["my-recommendations"] });
    } catch {
      notifyError("discover.recommendFailed");
    } finally {
      setIsRecommending(false);
    }
  }, [productId, isRecommended, queryClient]);

  return { recommendProduct, isRecommending, isRecommended };
}
