/**
 * Visible "we're waiting for sign-in" banner shown while the user is
 * bounced out to the system browser for OAuth. Replaces the previous
 * silent-wait UX where tapping Connect Google could feel like nothing
 * happened until the connection appeared minutes later.
 *
 * Implementation note (2026-04-27): rebuilt as a non-modal banner after
 * the original Radix Dialog version froze the Android Appilix WebView
 * with a black-backdrop ghost on resume from Chrome. The Dialog used
 * a Portal + focus trap + `bg-black/80` overlay; on Android Appilix's
 * background→foreground transition the Portal sometimes detached its
 * content while leaving the backdrop, leaving the user staring at a
 * dark screen with no escape. A plain in-tree banner has no Portal,
 * no focus trap, no backdrop — it can never strand the user.
 *
 * State machine driven by `useOAuthBounceStore`:
 *
 *   pending     → spinner banner with "I'm back — check now" (force
 *                 refetch) and a Close (X) button.
 *   success     → green confirmation banner; auto-dismisses after 1.8s.
 *   timed_out   → amber "didn't see confirm" banner + "Check now" +
 *                 Close.
 *
 * Mounted on every page that can initiate a connector flow so the
 * banner survives navigation back to the same page after the bounce.
 * The store's lifetime is the WebView session; on a full WebView
 * reload (deep-link return) the existing `?connected=…` toast in
 * MobileConnectedAppsView still drives the success message.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOAuthBounceStore, type OAuthBounceProvider } from "@/hooks/useOAuthBounceStore";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

const PROVIDER_LABEL: Record<OAuthBounceProvider, string> = {
  google: "Google",
  youtube: "YouTube",
};

export function OAuthBouncePendingOverlay() {
  const status = useOAuthBounceStore((s) => s.status);
  const provider = useOAuthBounceStore((s) => s.provider);
  const reset = useOAuthBounceStore((s) => s.reset);
  const queryClient = useQueryClient();

  // Auto-dismiss the success banner so the screen doesn't stay
  // congested after the user is already done.
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

  // Tone presets per state — keep the visual signal obvious even on
  // tiny WebView viewports where users don't read body copy.
  const toneClass =
    status === "success"
      ? "border-green-200 bg-green-50"
      : status === "timed_out"
        ? "border-amber-200 bg-amber-50"
        : "border-border bg-card";

  return (
    <div
      data-oauth-bounce-overlay
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-xl border p-4 shadow-lg",
        "pb-[max(1rem,env(safe-area-inset-bottom))]",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
        toneClass,
      )}
    >
      <button
        type="button"
        onClick={reset}
        aria-label={t('screens.settings.dismiss')}
        className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      {status === "pending" && (
        <div className="flex flex-col gap-3 pr-6">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="font-medium leading-tight">Connecting {label}…</p>
              <p className="text-sm text-muted-foreground">
                Finish signing in in your browser, then come back to Maxina. We're checking in the background.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={checkNow} className="flex-1 min-w-[8rem]">
              I'm back — check now
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-start gap-3 pr-6">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div className="space-y-1">
            <p className="font-medium leading-tight text-green-700">{label} connected</p>
            <p className="text-sm text-green-700/80">{t('screens.settings.youReAllSet')}</p>
          </div>
        </div>
      )}

      {status === "timed_out" && (
        <div className="flex flex-col gap-3 pr-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-medium leading-tight text-amber-700">We didn't see {label} confirm</p>
              <p className="text-sm text-amber-700/80">
                If you completed sign-in, tap Check now. Otherwise, close this and tap Connect again.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={checkNow} className="flex-1 min-w-[8rem]">
              Check now
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
