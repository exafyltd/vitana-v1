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
