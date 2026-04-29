/**
 * VTID-02601 — One-tap "Enable Reminders" prompt.
 *
 * Surfaces on the /reminders page (and on demand) to explain why we want
 * notification permission and to trigger the OS prompt with a single user
 * gesture. Three states:
 *
 *   default       → friendly card with [Allow] button (one tap → OS popup)
 *   granted       → render nothing (the user already enabled)
 *   denied        → recovery hint pointing at browser settings
 *
 * Appilix WebView detection: the Maxina installed app cannot deliver web
 * push (no Notification API in the WebView, plus the Appilix native push
 * pipeline has been broken since mid-March 2026 — see memory). When we
 * detect that runtime we skip the prompt entirely and show a one-line note
 * that opens the app in Chrome instead.
 */

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { isAppilix } from "@/lib/appilix";
import { pushNotificationManager } from "@/lib/pushNotifications";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function readPermission(): PermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return (Notification.permission as PermissionState) || "default";
}

const DISMISS_KEY = "vitana.reminders.permission_prompt_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // re-ask after a week

function isDismissed(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() - parseInt(v, 10) < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export const EnableRemindersPrompt: React.FC = () => {
  const [permission, setPermission] = useState<PermissionState>(() => readPermission());
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissedState] = useState(() => isDismissed());

  // Re-read permission state on mount + when the tab regains focus (user may
  // have flipped it in browser settings).
  useEffect(() => {
    const refresh = () => setPermission(readPermission());
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const handleAllow = async () => {
    setBusy(true);
    try {
      // initialize() registers the SW; subscribe() triggers the OS prompt
      // (via Notification.requestPermission inside requestFCMToken) and
      // registers the FCM token with the gateway. Single user gesture.
      const ok = await pushNotificationManager.initialize();
      if (!ok) {
        toast.error("Notifications aren't supported in this browser.");
        setPermission("unsupported");
        return;
      }
      const token = await pushNotificationManager.subscribe();
      const newPerm = readPermission();
      setPermission(newPerm);
      if (token) {
        toast.success("Reminders enabled — you'll get notified even when the app is closed.");
      } else if (newPerm === "denied") {
        toast.error("Notifications were blocked. You can re-enable them in browser settings.");
      } else {
        toast.error("Couldn't enable notifications. Try again in a moment.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Couldn't enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  const handleNotNow = () => {
    setDismissed();
    setDismissedState(true);
  };

  // ── Appilix Maxina installed app — web push is unsupported here ─────────
  if (isAppilix()) {
    if (dismissed) return null;
    const currentUrl = typeof window !== "undefined" ? window.location.href : "https://vitanaland.com/reminders";
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            For closed-app reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Reminders work in the Maxina app while you're using it. To also get notified when the app
            is closed or your phone is locked, open Vitana in Chrome on this phone (one-time setup).
          </p>
          <div className="flex gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <a
                href={currentUrl.replace(/^https?:\/\//, "intent://").concat("#Intent;scheme=https;package=com.android.chrome;end")}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open in Chrome
              </a>
            </Button>
            <Button size="sm" variant="ghost" onClick={handleNotNow}>
              Not now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (permission === "granted" || permission === "unsupported") return null;
  if (dismissed) return null;

  if (permission === "denied") {
    return (
      <Card className="border-amber-200/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BellOff className="h-4 w-4 text-muted-foreground" />
            Notifications are blocked
          </CardTitle>
          <CardDescription className="text-xs">
            Reminders only fire while you have the app open.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            To get notified when the app is closed, tap the lock icon in your browser's address bar →
            Site settings → Notifications → <strong>Allow</strong>. Then reload this page.
          </p>
          <Button size="sm" variant="ghost" onClick={handleNotNow}>
            Not now
          </Button>
        </CardContent>
      </Card>
    );
  }

  // default — the friendly one-tap card
  return (
    <Card className="border-primary/40 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Get reminded even when the app is closed
        </CardTitle>
        <CardDescription className="text-xs">
          One tap — Vitana will chime and surface the reminder on your phone at the scheduled time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={handleAllow} disabled={busy} size="sm">
            {busy ? "Enabling…" : "Allow"}
          </Button>
          <Button onClick={handleNotNow} disabled={busy} size="sm" variant="ghost">
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnableRemindersPrompt;
