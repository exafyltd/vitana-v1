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
  const appUrl = window.location.origin;
  
  // Map content types to app routes
  const routeMap: Record<typeof type, string> = {
    event: `/comm/events-meetups?event=${encodeURIComponent(id)}`,
    meetup: `/comm/events-meetups?event=${encodeURIComponent(id)}`,
    group: `/comm/groups/${encodeURIComponent(id)}`,
    profile: `/profile/${encodeURIComponent(id)}`,
    post: `/sharing/posts/${encodeURIComponent(id)}`,
  };
  
  const path = routeMap[type];
  const params = new URLSearchParams();

  // Add UTM parameters if provided
  if (options?.utm_source) params.set('utm_source', options.utm_source);
  if (options?.utm_medium) params.set('utm_medium', options.utm_medium);
  if (options?.utm_campaign) params.set('utm_campaign', options.utm_campaign);
  
  const queryString = params.toString();
  return `${appUrl}${path}${queryString ? '&' + queryString : ''}`;
}
