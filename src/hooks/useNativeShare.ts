import { useCallback, useMemo } from "react";
import { analytics } from "@/lib/analytics";

interface NativeSharePayload {
  title: string;
  text?: string;
  url: string;
}

interface UseNativeShareOptions {
  contentId: string;
  contentType: string;
}

export function useNativeShare({ contentId, contentType }: UseNativeShareOptions) {
  const isAvailable = useMemo(
    () => typeof navigator !== "undefined" && "share" in navigator,
    []
  );

  const share = useCallback(
    async (payload: NativeSharePayload): Promise<"shared" | "cancelled" | "failed"> => {
      if (!isAvailable) return "failed";

      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        analytics.trackShare("share_completed", "web_share", contentId, contentType);
        return "shared";
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return "cancelled";
        }
        return "failed";
      }
    },
    [isAvailable, contentId, contentType]
  );

  return { isAvailable, share };
}
