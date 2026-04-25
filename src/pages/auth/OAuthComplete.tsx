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

        // In-app (WebView) pass: session is now stored in the WebView's
        // localStorage. We force a FULL PAGE LOAD (not React Router
        // navigate) so AuthProvider re-initializes from scratch with the
        // fresh session in localStorage. Without this, the original page
        // that started the OAuth flow can race the auth-state-change
        // event and render with user=null long enough that the redirect
        // useEffect doesn't fire — producing an endless spinner that
        // only resolves when the user kills + reopens the app.
        if (inWebView) {
          // Build an absolute URL so window.location.href triggers a
          // hard navigation. Same-origin is guaranteed by the
          // nextPath normalization above.
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
            <h1 className="text-xl font-semibold">Finishing sign-in…</h1>
            <p className="text-muted-foreground">Please wait a moment.</p>
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
              Return to Vitana
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Sign-in couldn't complete</h1>
            <p className="text-muted-foreground break-words">{message}</p>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={() => window.history.back()}>
                Go back and try again
              </Button>
              <Button variant="ghost" onClick={() => navigate("/maxina")}>
                Return to Vitana
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
