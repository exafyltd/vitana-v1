/**
 * Map Supabase/OAuth SDK errors to user-readable messages. Before this
 * lived only as `console.error(err)` in each portal — users saw a silent
 * 15-second spinner then nothing. These messages are intentionally
 * actionable ("what did I do / what should I do") rather than technical.
 */

export function friendlyOAuthError(err: unknown, provider: string): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : (err as { message?: string })?.message ?? "";

  const lc = raw.toLowerCase();
  const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);

  if (lc.includes("unsupported provider") || lc.includes("provider is not enabled")) {
    return `${providerLabel} sign-in isn't enabled yet. Please contact support or try email sign-in.`;
  }
  if (lc.includes("popup") && lc.includes("block")) {
    return "Your browser blocked the sign-in window. Allow popups for this site and try again.";
  }
  if (lc.includes("user cancelled") || lc.includes("access_denied") || lc.includes("user denied")) {
    return `You didn't finish the ${providerLabel} sign-in — give it another try when you're ready.`;
  }
  if (lc.includes("invalid_grant") || lc.includes("expired")) {
    return `The ${providerLabel} sign-in expired. Please try again.`;
  }
  if (lc.includes("network") || lc.includes("fetch failed") || lc.includes("load failed")) {
    return "We couldn't reach the sign-in service. Check your internet connection and try again.";
  }
  if (lc.includes("no auth url") || lc.includes("provider is not configured")) {
    return `${providerLabel} sign-in isn't configured on this environment. Please contact support.`;
  }

  return raw || `We couldn't sign you in with ${providerLabel}. Please try again.`;
}
