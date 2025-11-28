/**
 * Generate a share URL with Open Graph support for rich previews on social media
 * 
 * @param type Content type (event, meetup, group, profile, post)
 * @param id Content ID
 * @param options Optional UTM parameters for tracking
 * @returns Share URL that serves OG tags for crawlers and redirects users to app
 */
export function getShareUrl(
  type: 'event' | 'meetup' | 'group' | 'profile' | 'post',
  id: string,
  options?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }
): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
  const baseUrl = `${supabaseUrl}/functions/v1/og-share`;
  
  const params = new URLSearchParams({
    type,
    id,
  });

  // Add UTM parameters if provided
  if (options?.utm_source) params.set('utm_source', options.utm_source);
  if (options?.utm_medium) params.set('utm_medium', options.utm_medium);
  if (options?.utm_campaign) params.set('utm_campaign', options.utm_campaign);
  
  return `${baseUrl}?${params.toString()}`;
}
