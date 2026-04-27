/**
 * Generate a direct share URL with UTM parameters for tracking
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
  // Marketplace products use e.vitanaland.com for OG previews. Crawlers get
  // server-rendered OG meta tags (title/description/image/price) from the
  // vitanaland-og-proxy worker; human clicks 302 to the SPA detail page.
  if (type === 'product') {
    return `https://e.vitanaland.com/products/${encodeURIComponent(id)}`;
  }

  // Shorts use e.vitanaland.com for OG previews. Crawlers get server-rendered
  // OG HTML (thumbnail + title + creator) from the og-short Supabase Edge
  // Function; humans 302 to /comm/media-hub?short=<id> which auto-opens the
  // specific short.
  if (type === 'short') {
    return `https://e.vitanaland.com/shorts/${encodeURIComponent(id)}`;
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

  // Events/meetups use e.vitanaland.com for sharing (Cloudflare Worker serves OG meta)
  if (type === 'event' || type === 'meetup') {
    const canonicalBase = 'https://e.vitanaland.com';
    if (options?.slug) {
      return `${canonicalBase}/events/${encodeURIComponent(options.slug)}`;
    }
    return `${canonicalBase}/events/${encodeURIComponent(id)}`;
  }

  // Profiles use e.vitanaland.com for OG previews
  if (type === 'profile') {
    return `https://e.vitanaland.com/profiles/${encodeURIComponent(id)}`;
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
  const canonicalBase = 'https://e.vitanaland.com';
  if (slug) {
    return `${canonicalBase}/events/${encodeURIComponent(slug)}`;
  }
  if (id) {
    return `${canonicalBase}/events/${encodeURIComponent(id)}`;
  }
  return canonicalBase;
}
