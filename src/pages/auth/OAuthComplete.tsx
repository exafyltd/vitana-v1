/**
 * OAuth completion landing page — shared between gateway-driven (Google data
 * connectors) and Supabase Auth (Apple sign-in, social Google) flows.
 *
 * This page runs twice in the WebView path:
 *   (1) First in the OS system browser (Chrome / Safari) after the provider
 *       redirects back with session tokens in the URL hash. We call
 *       `exchangeCodeForSession()` / `setSession()` here too, but the
 *       resulting session lands in the system browser's localStorage —
 *       invisible to the Appilix WebView.
 *   (2) Second inside the WebView, triggered by the Appilix universal link
 *       which re-opens the app on the same URL with the hash preserved.
 *       `exchangeCodeForSession()` runs again, this time populating the
 *       WebView's localStorage, and then we `navigate(next)`.
 *
 * Off-mobile (plain web): we just call setSession and redirect to `next`.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { isAppilixWebView } from "@/lib/webview";
import { t } from '@/lib/i18n-toast';

type Status = "processing" | "success" | "error";

export default function OAuthComplete() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState<string>("");

  const provider = searchParams.get("provider") ?? "your account";
  // The `next` param can arrive as either a relative path (`/maxina`) or a
  // full URL (`https://vitanaland.com/maxina`). React Router's
  // `navigate()` treats anything without a leading `/` as a path-relative
  // value, so passing a full URL produces a malformed path like
  // `/oauth/complete/https://vitanaland.com/maxina`. Normalize to an
  // absolute path on this origin; treat external/cross-origin values as
  // an error (fall back to the safe default).
  const nextPath = (() => {
    const raw = searchParams.get("next") ?? "/maxina";
    try {
      if (/^https?:\/\//i.test(raw)) {
        const u = new URL(raw);
        if (typeof window !== "undefined" && u.origin === window.location.origin) {
          return u.pathname + u.search + u.hash;
        }
        return "/maxina";
      }
      return raw.startsWith("/") ? raw : `/${raw}`;
    } catch {
      return "/maxina";
    }
  })();
  const gatewayError = searchParams.get("error");
  const gatewayErrorDetail = searchParams.get("error_detail");
  const inWebView = isAppilixWebView();

  // When we're still in the system browser and need to hand back to the
  // Appilix app, we redirect to a universal-link URL that keeps the
  // current hash intact so the WebView's second pass through this page
  // can complete setSession() against its own localStorage.
  const deepLinkHref = useMemo(() => {
    const { hash, search } = window.location;
    return `https://vitanaland.com/oauth/complete${search}${hash}`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Hard timeout: if neither the session-write nor the navigation has
    // completed in 10 seconds, fall through to error state. Prevents the
    // "endless spinner" failure mode reported on iOS WKWebView when
    // setSession or exchangeCodeForSession silently hangs.
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setStatus("error");
      setMessage("Sign-in is taking longer than expected. Please try again.");
    }, 10_000);

    (async () => {
      if (gatewayError) {
        window.clearTimeout(timeoutId);
        setStatus("error");
        setMessage(gatewayErrorDetail || gatewayError.replace(/_/g, " "));
        return;
      }

      try {
        const hash = window.location.hash || "";
        const hasHashTokens = /access_token=|refresh_token=/.test(hash);
        const code = searchParams.get("code");

        if (hasHashTokens) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (cancelled) return;
        window.clearTimeout(timeoutId);

        // In-app (WebView) pass: the session is now persisted in
        // localStorage. Two return paths depending on how this page got
        // loaded:
        //
        //   (a) We're a popup the parent app opened via window.open
        //       (the iOS WKWebView gesture-preservation trick from
        //       useSupabaseOAuthSignIn). The parent sees the storage
        //       write via Supabase's built-in cross-tab sync AND a
        //       postMessage we send below, then drives its own redirect.
        //       We just close ourselves so the layered popup UI doesn't
        //       sit on top of the parent.
        //
        //   (b) We were a full-screen navigation (no opener). Force a
        //       hard reload of the parent route so AuthProvider
        //       re-initializes with the fresh session — avoids the
        //       endless-spinner race we saw on iPhone first-attempt.
        const hasOpener = (() => {
          try {
            return Boolean(window.opener && !window.opener.closed);
          } catch {
            return false;
          }
        })();

        if (inWebView && hasOpener) {
          try {
            // Notify the parent explicitly. Storage events alone are
            // sometimes throttled inside iOS WKWebView, so a direct
            // postMessage gives the parent a deterministic signal.
            window.opener.postMessage(
              { type: "vitana:oauth-complete", provider, nextPath },
              window.location.origin,
            );
          } catch {
            /* noop — parent's storage listener is the fallback */
          }
          try {
            window.close();
            return;
          } catch {
            /* fall through to same-window replace */
          }
        }

        if (inWebView) {
          window.location.replace(window.location.origin + nextPath);
          return;
        }

        // System-browser pass: try the deep link immediately so the user
        // barely sees this page. If the universal-link isn't caught by
        // Appilix, the button below is the manual fallback.
        setStatus("success");
        setMessage(`${providerLabel(provider)} connected — returning you to Vitana…`);
        setTimeout(() => {
          try {
            window.location.href = deepLinkHref;
          } catch {
            // ignore — the manual button covers this
          }
        }, 350);
      } catch (err) {
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "We couldn't finish signing you in.");
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [deepLinkHref, gatewayError, gatewayErrorDetail, inWebView, navigate, nextPath, provider, searchParams]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-gradient-to-b from-primary/5 to-background text-center">
      <div className="max-w-md w-full space-y-4">
        {status === "processing" && (
          <>
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <h1 className="text-xl font-semibold">{t('screens.auth.finishingSignin')}</h1>
            <p className="text-muted-foreground">{t('screens.auth.pleaseWaitMoment')}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
            <h1 className="text-xl font-semibold">{message}</h1>
            <p className="text-muted-foreground">
              If you aren't sent back automatically, tap below — or just switch to the Vitana app and it'll
              catch up within a few seconds.
            </p>
            <Button size="lg" className="w-full" onClick={() => (window.location.href = deepLinkHref)}>
              {t('screens.auth.returnVitana')}
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">{t('screens.auth.signinCouldnTComplete')}</h1>
            <p className="text-muted-foreground break-words">{message}</p>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={() => window.history.back()}>
                {t('screens.auth.goBackTryAgain')}
              </Button>
              <Button variant="ghost" onClick={() => navigate("/maxina")}>
                {t('screens.auth.returnVitana')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function providerLabel(p: string): string {
  if (!p) return "Your account";
  return p.charAt(0).toUpperCase() + p.slice(1);
}
