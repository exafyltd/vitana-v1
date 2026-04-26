/**
 * WebView-aware wrapper around `supabase.auth.signInWithOAuth()`.
 *
 * iOS WKWebView is strict about preserving the user-gesture context
 * across `await` boundaries — by the time `supabase.auth.signInWithOAuth`
 * returns the auth URL, the gesture has been consumed and naive
 * `window.location.href = url` is silently blocked. To work around this
 * we open a placeholder window *synchronously* during the click via
 * `window.open('about:blank', '_blank')` (which keeps the gesture alive)
 * and then retarget that window after the await. This is the same trick
 * Stripe Checkout, Auth0, etc. use for mobile WebView OAuth.
 */

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isAppilixWebView, redirectViaSystemBrowser } from "@/lib/webview";
import { PUBLIC_BASE_URL } from "@/utils/redirectUrls";
import { unlockIOSAudioPlayback } from "@/lib/iosAudioUnlock";

export type SupportedOAuthProvider = "apple" | "google" | "facebook" | "azure";

interface SignInInput {
  provider: SupportedOAuthProvider;
  /** Where Supabase should redirect after the OAuth callback when NOT inside a WebView. */
  redirectTo: string;
  /** Extra query params forwarded to the provider consent screen (e.g. `tenant_slug`). */
  queryParams?: Record<string, string>;
}

export function useSupabaseOAuthSignIn() {
  return useMutation({
    mutationFn: async ({ provider, redirectTo, queryParams }: SignInInput) => {
      // SYNCHRONOUS, must run before any await: bank an iOS audio
      // unlock so the proactive greeting that fires ~5s after the post-
      // OAuth landing can play. Without this, iOS WKWebView silently
      // rejects the audio.play() call on the greeting because there's
      // no fresh user gesture by the time the greeting fires.
      unlockIOSAudioPlayback();

      const mobile = isAppilixWebView();
      const mobileRedirect = `${PUBLIC_BASE_URL}/oauth/complete?return=mobile&provider=${provider}&next=${encodeURIComponent(redirectTo)}`;

      // CRITICAL: open the placeholder window NOW, while we still have the
      // user gesture. iOS WKWebView consumes the gesture across the
      // upcoming `await` and would otherwise silently block any
      // navigation we try afterwards. Holding a window reference allows
      // us to set its location post-await without re-asking for a
      // gesture. Off-mobile this is a no-op.
      let preOpenedWindow: Window | null = null;
      if (mobile) {
        try {
          preOpenedWindow = window.open("about:blank", "_blank");
        } catch {
          preOpenedWindow = null;
        }
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: mobile ? mobileRedirect : redirectTo,
          skipBrowserRedirect: mobile,
          queryParams,
        },
      });
      if (error) {
        if (preOpenedWindow) try { preOpenedWindow.close(); } catch {}
        throw error;
      }

      if (mobile) {
        if (!data?.url) {
          if (preOpenedWindow) try { preOpenedWindow.close(); } catch {}
          throw new Error(
            "Supabase returned no auth URL — check that the provider is enabled in the Supabase dashboard.",
          );
        }
        // 1st preference: retarget the pre-opened window (iOS gesture trick).
        if (preOpenedWindow) {
          try {
            preOpenedWindow.location.href = data.url;
            return data;
          } catch {
            // fallthrough to redirectViaSystemBrowser
          }
        }
        // 2nd preference: full system-browser detour (Android bridge,
        // _system, intent URL, etc.).
        redirectViaSystemBrowser(data.url);
      }
      return data;
    },
  });
}
