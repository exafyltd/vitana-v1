/**
 * Utility for generating environment-aware redirect URLs for email confirmations
 */

/**
 * Get the production URL for email redirects
 * This ensures email confirmation links work correctly regardless of where they're sent from
 */
export function getProductionUrl(): string {
  // In development, we still want to use localhost for testing
  if (import.meta.env.DEV) {
    return window.location.origin;
  }
  
  // For production, we need to determine the correct Lovable project URL
  // If we're already on a .lovableproject.com domain, use that
  if (window.location.hostname.includes('lovableproject.com')) {
    return window.location.origin;
  }
  
  // If we're on a custom domain or other production environment, use current origin
  return window.location.origin;
}

/**
 * Generate email redirect URL for specific confirmation pages
 */
export function getEmailRedirectUrl(confirmationPath: string): string {
  const baseUrl = getProductionUrl();
  return `${baseUrl}${confirmationPath}`;
}

/**
 * Predefined confirmation paths for each portal
 */
export const CONFIRMATION_PATHS = {
  auth: '/auth/confirmed',
  maxina: '/maxina/confirmed',
  alkalma: '/alkalma/confirmed',
  earthlinks: '/earthlinks/confirmed',
  community: '/community/confirmed'
} as const;