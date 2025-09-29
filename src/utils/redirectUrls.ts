/**
 * Utility for generating hardcoded redirect URLs for email confirmations
 */

/**
 * Hardcoded base URL for all email redirects
 */
export const PUBLIC_BASE_URL = "https://vitana-v1.lovable.app";

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
  maxina: '/maxina',
  alkalma: '/alkalma',
  earthlinks: '/earthlinks'
} as const;