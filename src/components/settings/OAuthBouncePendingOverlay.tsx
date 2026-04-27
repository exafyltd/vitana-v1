/**
 * Visible "we're waiting for sign-in" overlay shown while the user is
 * bounced out to the system browser for OAuth. Replaces the previous
 * silent-wait UX where tapping Connect Google could feel like nothing
 * happened until the connection appeared minutes later.
 *
 * State machine driven by `useOAuthBounceStore`:
 *
 *   pending     → spinner, "I'm back, check now" (force refetch),
 *                 "Cancel" (dismiss + stop poller).
 *   success     → green check, auto-dismisses after 1.8s.
 *   timed_out   → "Didn't see Google confirm" + "Check now" + "Close".
 *
 * Mounted on every page that can initiate a connector flow so the
 * overlay survives navigation back to the same page after the bounce.
 * The store's lifetime is the WebView session; if the WebView reloads
 * (full deep-link return) the overlay won't reappear, but at that
 * point the gateway's `?connected=…` URL param drives a success toast
 * via the existing `MobileConnectedAppsView` effect.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOAuthBounceStore, type OAuthBounceProvider } from "@/hooks/useOAuthBounceStore";

const PROVIDER_LABEL: Record<OAuthBounceProvider, string> = {
  google: "Google",
  youtube: "YouTube",
};

export function OAuthBouncePendingOverlay() {
  const status = useOAuthBounceStore((s) => s.status);
  const provider = useOAuthBounceStore((s) => s.provider);
  const reset = useOAuthBounceStore((s) => s.reset);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== "success") return;
    const timer = window.setTimeout(reset, 1800);
    return () => window.clearTimeout(timer);
  }, [status, reset]);

  if (status === "idle" || !provider) return null;

  const label = PROVIDER_LABEL[provider];

  const checkNow = () => {
    void queryClient.invalidateQueries({ queryKey: ["social-connections"] });
    void queryClient.invalidateQueries({ queryKey: ["social-accounts", "google", "verify"] });
  };

  return (
    <Dialog open onOpenChange={(open) => (!open ? reset() : undefined)}>
      <DialogContent className="sm:max-w-md">
        {status === "pending" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Connecting {label}…
              </DialogTitle>
              <DialogDescription>
                Finish signing in with {label} in your browser, then come back to Maxina. We're checking in the background — you don't need to do anything.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 flex flex-col gap-2">
              <Button onClick={checkNow}>I'm back — check now</Button>
              <Button variant="ghost" onClick={reset}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {status === "success" && (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              {label} connected
            </DialogTitle>
            <DialogDescription>You're all set.</DialogDescription>
          </DialogHeader>
        )}

        {status === "timed_out" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                We didn't see {label} confirm
              </DialogTitle>
              <DialogDescription>
                If you completed sign-in, tap "Check now". Otherwise, close this and tap Connect again.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 flex flex-col gap-2">
              <Button onClick={checkNow}>Check now</Button>
              <Button variant="ghost" onClick={reset}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
