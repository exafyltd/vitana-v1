/**
 * Generate a direct share URL with UTM parameters for tracking.
 *
 * Share URLs for shorts/products/events/profiles route through the apex
 * (vitanaland.com) so iOS Universal Links + Android App Links fire on
 * the recipient's tap and hand off to the Maxina app instead of opening
 * WhatsApp/Telegram's in-app browser. Appilix's Deep Link UI only
 * accepts ONE host in the entitlement, and the app claims
 * `vitanaland.com` — anything served from `e.vitanaland.com` would not
 * trigger the app handoff. The `vitanaland-og-proxy` Cloudflare worker
 * is bound to `vitanaland.com/(shorts|products|events|profiles)/*` and
 * handles the same crawler-vs-human split that previously ran on
 * `e.vitanaland.com`: crawlers get OG HTML, humans 302 to the SPA
 * destination.
 *
 * `e.vitanaland.com` is intentionally still resolvable and the worker
 * still binds it, so older shared links already in flight (WhatsApp
 * messages from before this change) keep working.
 *
 * @param type Content type (event, meetup, group, profile, post)
 * @param id Content ID
 * @param options Optional UTM parameters and slug for clean URLs
 * @returns Direct app URL with UTM parameters
 */
export function getShareUrl(
  type: 'event' | 'meetup' | 'group' | 'profile' | 'post' | 'campaign' | 'product' | 'short',
  id: string,
  options?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    slug?: string; // Event slug for clean URLs
  }
): string {
  if (type === 'product') {
    return `https://vitanaland.com/products/${encodeURIComponent(id)}`;
  }

  if (type === 'short') {
    return `https://vitanaland.com/shorts/${encodeURIComponent(id)}`;
  }

  // Campaigns use clean app URLs for sharing
  // OG previews work via client-side meta tag injection
  if (type === 'campaign') {
    const appUrl = window.location.origin;
    const path = `/pub/campaigns/${encodeURIComponent(id)}`;

    const params = new URLSearchParams();
    if (options?.utm_source) params.set('utm_source', options.utm_source);
    if (options?.utm_medium) params.set('utm_medium', options.utm_medium);
    if (options?.utm_campaign) params.set('utm_campaign', options.utm_campaign);

    const queryString = params.toString();
    return `${appUrl}${path}${queryString ? '?' + queryString : ''}`;
  }

  if (type === 'event' || type === 'meetup') {
    const canonicalBase = 'https://vitanaland.com';
    if (options?.slug) {
      return `${canonicalBase}/events/${encodeURIComponent(options.slug)}`;
    }
    return `${canonicalBase}/events/${encodeURIComponent(id)}`;
  }

  if (type === 'profile') {
    return `https://vitanaland.com/profiles/${encodeURIComponent(id)}`;
  }
  
  // Other content types use direct app URLs
  const appUrl = window.location.origin;
  const routeMap: Record<'group' | 'profile' | 'post', string> = {
    group: `/comm/groups/${encodeURIComponent(id)}`,
    profile: `/profile/${encodeURIComponent(id)}`,
    post: `/sharing/posts/${encodeURIComponent(id)}`,
  };
  
  const path = routeMap[type as 'group' | 'profile' | 'post'];
  const params = new URLSearchParams();

  // Add UTM parameters if provided
  if (options?.utm_source) params.set('utm_source', options.utm_source);
  if (options?.utm_medium) params.set('utm_medium', options.utm_medium);
  if (options?.utm_campaign) params.set('utm_campaign', options.utm_campaign);
  
  const queryString = params.toString();
  return `${appUrl}${path}${queryString ? '?' + queryString : ''}`;
}

/**
 * Generate a reseller-specific share URL with attribution UTM parameters
 * 
 * @param type Content type (event or campaign)
 * @param id Content ID
 * @param resellerCode Unique reseller code for attribution
 * @param slug Optional event slug for clean URLs
 * @returns Share URL with reseller attribution parameters
 */
export function getResellerShareUrl(
  type: 'event' | 'campaign',
  id: string,
  resellerCode: string,
  slug?: string
): string {
  return getShareUrl(type, id, {
    utm_source: `reseller_${resellerCode}`,
    utm_medium: 'reseller',
    utm_campaign: id,
    slug
  });
}

/**
 * Generate a clean event URL without UTM parameters (for display/copying)
 * 
 * @param slug Event slug
 * @param id Event ID (fallback if no slug)
 * @returns Clean event URL
 */
export function getCleanEventUrl(slug?: string | null, id?: string): string {
  const canonicalBase = 'https://vitanaland.com';
  if (slug) {
    return `${canonicalBase}/events/${encodeURIComponent(slug)}`;
  }
  if (id) {
    return `${canonicalBase}/events/${encodeURIComponent(id)}`;
  }
  return canonicalBase;
}
