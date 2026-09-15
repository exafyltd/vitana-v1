/**
 * Utility for generating hardcoded redirect URLs for email confirmations
 */

/**
 * Hardcoded base URL for all email redirects
 */
export const PUBLIC_BASE_URL = "https://vitanaland.com";

/**
 * Get the production URL for email redirects
 * Always returns the hardcoded public URL to ensure email links work from any device
 */
export function getProductionUrl(): string {
  return PUBLIC_BASE_URL;
}

/**
 * Generate email redirect URL for specific confirmation pages
 */
export function getEmailRedirectUrl(confirmationPath: string): string {
  return new URL(confirmationPath, PUBLIC_BASE_URL).toString();
}

/**
 * Predefined confirmation paths for each portal
 */
export const CONFIRMATION_PATHS = {
  auth: '/',
  community: '/',
  maxina: '/maxina?confirmed=true',
  // VTID-03894: a supplier who confirms their email belongs in the Commerce
  // Portal. Without its own path they land in the community app and have to
  // find their way back to a portal they have never seen.
  commerce: '/commerce?confirmed=true',
  alkalma: '/alkalma',
  earthlinks: '/earthlinks'
} as const;