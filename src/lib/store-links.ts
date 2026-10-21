/**
 * App store listing URLs + the hosted download-flyer page shared via
 * "Invite a friend". Single source of truth — never inline these URLs.
 */

export const APP_STORE_URL = 'https://apps.apple.com/de/app/maxina/id6742813861';

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.vitanaland.app';

/**
 * Android-native Play Store deep link. play.google.com pages refuse to run
 * inside WebViews (the badge looked dead in the app), while market:// is
 * resolved by the OS straight into the Play Store app.
 */
export const PLAY_STORE_MARKET_URL = 'market://details?id=com.vitanaland.app';

/**
 * Apex domain (not window.location.origin) so recipients always land on the
 * canonical host that iOS Universal Links / Android App Links can claim,
 * regardless of which deploy (staging, PR preview) the sender was on.
 */
export const DOWNLOAD_FLYER_URL = 'https://vitanaland.com/download';

/**
 * Smart app-store redirect page (detects iOS/Android, sends the visitor
 * straight to the matching store). Same URL printed on the Team MAXINA
 * merch QR code — reused here so members can pull up an identical QR
 * in-app to show someone in person.
 */
export const MAXINA_APP_QR_URL = 'https://vitanaland.com/maxina/app';

/**
 * Third-party escape link for the ONE case this codebase cannot solve on
 * its own: iOS inside a social in-app browser (Instagram above all).
 *
 * Why this is here rather than more code: apps.apple.com answers every iOS
 * user agent with a redirect into the `itms-appss://` scheme, and the
 * webview refuses it. Four in-house routes were tried on a real iPhone and
 * all failed — see the comment block in `pages/MaxinaAppRedirect.tsx` for
 * the list, including one that stranded visitors on a blank page. Google
 * Play is unaffected because it serves ordinary HTML.
 *
 * Services like GoToApp / URLgenius / Branch keep working because they
 * chase Meta's changes continuously. That is a maintenance commitment, not
 * a clever trick, which is why it is bought rather than built.
 *
 * TO ACTIVATE: paste the generated link here (e.g.
 * 'https://maxina.gotoapp.store'). Empty string = feature off, and the page
 * falls back to the browser-menu instruction, which always works.
 *
 * Deliberately a constant, not a VITE_ env var: the AWS and Cloud Run deploy
 * workflows both overwrite `.env.production` at build time, so an env var
 * set anywhere else would be silently dropped.
 *
 * It must stay an ordinary https URL to an HTML page — that is the one kind
 * of cross-origin navigation Instagram's webview reliably allows.
 */
export const IOS_WEBVIEW_ESCAPE_URL = '';

/**
 * VTID-05242: the store links of one tenant. Every field is the tenant's own
 * value from its brand pack when present, else the Maxina constant above
 * (the compiled fallback).
 */
export interface TenantStoreLinks {
  appStoreUrl: string;
  playStoreUrl: string;
  appQrUrl: string;
  iosWebviewEscapeUrl: string;
}

export const MAXINA_STORE_LINKS: Readonly<TenantStoreLinks> = Object.freeze({
  appStoreUrl: APP_STORE_URL,
  playStoreUrl: PLAY_STORE_URL,
  appQrUrl: MAXINA_APP_QR_URL,
  iosWebviewEscapeUrl: IOS_WEBVIEW_ESCAPE_URL,
});

/** Brand-pack keys → TenantStoreLinks fields. */
const BRAND_PACK_KEYS: ReadonlyArray<[string, keyof TenantStoreLinks]> = [
  ['app_store_url', 'appStoreUrl'],
  ['play_store_url', 'playStoreUrl'],
  ['app_qr_url', 'appQrUrl'],
  ['ios_webview_escape_url', 'iosWebviewEscapeUrl'],
];

/** An absolute https URL, or undefined — a brand-pack value can never become a javascript: or relative link. */
function safeHttpsUrl(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' && !u.username && !u.password ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The store links for a tenant brand pack. The registry's brand pack does not
 * carry store URLs yet (the per-tenant field belongs to mt-native-health,
 * WS9), so today every tenant gets the Maxina links; once a brand pack carries
 * `app_store_url` / `play_store_url` / `app_qr_url` / `ios_webview_escape_url`,
 * those win. Invalid values are ignored field by field.
 */
export function storeLinksFor(brand?: Readonly<Record<string, unknown>> | null): TenantStoreLinks {
  const links: TenantStoreLinks = { ...MAXINA_STORE_LINKS };
  if (!brand || typeof brand !== 'object') return links;
  for (const [key, field] of BRAND_PACK_KEYS) {
    const url = safeHttpsUrl(brand[key]);
    if (url) links[field] = url;
  }
  return links;
}
