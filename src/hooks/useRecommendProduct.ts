/**
 * VTID-02950: "Recommend & Earn" — recommend a Discover product to others.
 *
 * Mirrors useInviteFriendShare.ts's share pattern: native share dialog first,
 * clipboard-copy + toast fallback where no share dialog exists.
 */

import { useCallback, useState } from "react";
import { useNativeShare } from "@/hooks/useNativeShare";
import { createProductRecommendation } from "@/hooks/useMarketplace";
import { t, notifySuccess, notifyError } from "@/lib/i18n-toast";

export function useRecommendProduct() {
  const [isRecommending, setIsRecommending] = useState(false);
  const { share } = useNativeShare({ contentId: "product-recommend", contentType: "product_recommendation" });

  const recommendProduct = useCallback(
    async (productId: string) => {
      setIsRecommending(true);
      try {
        const { share_url, product_title } = await createProductRecommendation(productId);
        const title = t("discover.recommendShareTitle", { product: product_title });

        const result = await share({ title, url: share_url });
        if (result === "failed") {
          try {
            await navigator.clipboard.writeText(share_url);
            notifySuccess("discover.recommendLinkCopied");
          } catch {
            notifyError("toasts.common.couldnTCopyPleaseCopyLink");
          }
        }
      } catch {
        notifyError("discover.recommendFailed");
      } finally {
        setIsRecommending(false);
      }
    },
    [share]
  );

  return { recommendProduct, isRecommending };
}
