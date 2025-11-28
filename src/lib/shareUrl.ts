/**
 * Generate a direct share URL with UTM parameters for tracking
 * 
 * @param type Content type (event, meetup, group, profile, post)
 * @param id Content ID
 * @param options Optional UTM parameters for tracking
 * @returns Direct app URL with UTM parameters
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
  // Events and meetups use og-share edge function for rich social previews
  if (type === 'event' || type === 'meetup') {
    const supabaseUrl = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('id', id);
    // Cache-buster to force platforms like WhatsApp to re-fetch OG tags
    params.set('v', '2');
    
    // Add UTM parameters if provided
    if (options?.utm_source) params.set('utm_source', options.utm_source);
    if (options?.utm_medium) params.set('utm_medium', options.utm_medium);
    if (options?.utm_campaign) params.set('utm_campaign', options.utm_campaign);
    
    return `${supabaseUrl}/functions/v1/og-share?${params.toString()}`;
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
