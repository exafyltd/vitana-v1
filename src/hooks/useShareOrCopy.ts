/**
 * VTID-04993 — the one "Share" action for a link: the native share sheet where
 * the device has one, otherwise the link is copied and the member is told so.
 * A tap on a share button must always have a visible outcome (same contract as
 * useInviteFriendShare). A deliberate cancel does nothing.
 */
import { useCallback } from "react";
import { useNativeShare } from "@/hooks/useNativeShare";
import { notifySuccess, notifyError } from "@/lib/i18n-toast";

export function useShareOrCopy(options: { contentId: string; contentType: string }) {
  const { share } = useNativeShare(options);

  const shareOrCopy = useCallback(
    async (payload: { title: string; url: string; text?: string }) => {
      const result = await share(payload);
      if (result !== "failed") return result;
      try {
        await navigator.clipboard.writeText(payload.url);
        notifySuccess("toasts.sharing.linkCopied");
        return "copied" as const;
      } catch {
        notifyError("toasts.common.couldnTCopyPleaseCopyLink");
        return "failed" as const;
      }
    },
    [share],
  );

  return { shareOrCopy };
}
