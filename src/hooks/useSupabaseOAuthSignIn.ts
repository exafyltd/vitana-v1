/**
 * WebView-aware wrapper around `supabase.auth.signInWithOAuth()`.
 *
 * Supabase's default behavior is to do an inline `window.location.href =
 * <oauth-url>` which dies inside the Appilix Android WebView because the
 * embedded WebView isolates third-party OAuth cookies. That's why Apple
 * sign-in (and social Google sign-in) freezes after email selection on
 * mobile.
 *
 * This hook uses the documented `skipBrowserRedirect: true` option to
 * fetch the authorization URL without redirecting, then routes it through
 * the shared `redirectViaSystemBrowser()` helper — same detour pattern
 * Google data-connector OAuth already uses. The `/oauth/complete` landing
 * page handles session handoff back to the WebView.
 *
 * Works identically off-mobile: when `isAppilixWebView()` is false the
 * hook lets Supabase do its normal inline redirect.
 */

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isAppilixWebView, redirectViaSystemBrowser } from "@/lib/webview";
import { PUBLIC_BASE_URL } from "@/utils/redirectUrls";

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
      const mobile = isAppilixWebView();
      const mobileRedirect = `${PUBLIC_BASE_URL}/oauth/complete?return=mobile&provider=${provider}&next=${encodeURIComponent(redirectTo)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: mobile ? mobileRedirect : redirectTo,
          skipBrowserRedirect: mobile,
          queryParams,
        },
      });
      if (error) throw error;

      if (mobile) {
        if (!data?.url) {
          throw new Error(
            "Supabase returned no auth URL — check that the provider is enabled in the Supabase dashboard.",
          );
        }
        redirectViaSystemBrowser(data.url);
      }
      return data;
    },
  });
}
