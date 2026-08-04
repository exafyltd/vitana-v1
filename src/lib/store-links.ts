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
