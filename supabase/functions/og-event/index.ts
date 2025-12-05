import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Detect if the request is from a social media crawler
function isCrawler(userAgent: string): boolean {
  const crawlers = [
    'WhatsApp',
    'facebookexternalhit',
    'Facebot',
    'Twitterbot',
    'LinkedInBot',
    'Slackbot',
    'TelegramBot',
    'SkypeUriPreview',
    'Discordbot',
    'redditbot',
  ];
  return crawlers.some(crawler => userAgent.includes(crawler));
}

// Ensure URLs are absolute
function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/default-images/vitana-og-default.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `https://vitana-v1.lovable.app${url}`;
  return `https://vitana-v1.lovable.app/${url}`;
}

// Optimize image URL for social media crawlers (convert WebP to JPEG)
function getOptimizedImageUrl(url: string | null | undefined): string {
  const defaultImage = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/default-images/vitana-og-default.jpg';
  
  if (!url) return defaultImage;
  
  // Make URL absolute first
  const absoluteUrl = ensureAbsoluteUrl(url);
  
  // If it's a Supabase storage URL with WebP, transform to JPEG for WhatsApp compatibility
  if (absoluteUrl.includes('supabase.co/storage/v1/object/public/') && absoluteUrl.toLowerCase().endsWith('.webp')) {
    const transformedUrl = absoluteUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    ) + '?width=1200&height=630&format=jpeg&quality=85';
    return transformedUrl;
  }
  
  return absoluteUrl;
}

// Sanitize text for meta tags
function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .substring(0, 160);
}

// Detect image MIME type from URL
function getImageMimeType(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.webp')) return 'image/webp';
  if (lowerUrl.endsWith('.png')) return 'image/png';
  if (lowerUrl.endsWith('.gif')) return 'image/gif';
  if (lowerUrl.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

// Generate fallback HTML for invalid/missing events
function generateFallbackHTML(): string {
  const defaultImage = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/default-images/vitana-og-default.jpg';
  const homeUrl = 'https://vitana-v1.lovable.app/home';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VITANA - Your Longevity Community</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="VITANA" />
  <meta property="og:title" content="VITANA - Your Longevity Community" />
  <meta property="og:description" content="Join the VITANA longevity community and discover your path to optimal health" />
  <meta property="og:image" content="${defaultImage}" />
  <meta property="og:image:secure_url" content="${defaultImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${homeUrl}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="VITANA - Your Longevity Community" />
  <meta name="twitter:description" content="Join the VITANA longevity community" />
  <meta name="twitter:image" content="${defaultImage}" />
  
  <meta http-equiv="refresh" content="0;url=${homeUrl}">
</head>
<body>
  <p>Redirecting to VITANA...</p>
  <a href="${homeUrl}">Click here if you are not redirected</a>
</body>
</html>`;
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  location: string | null;
  start_time: string | null;
}

// Format date for display
function formatEventDate(startTime: string | null): string {
  if (!startTime) return '';
  try {
    const date = new Date(startTime);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

// Generate HTML with OG tags for events
function generateOGHTML(event: EventData): string {
  const title = sanitizeText(event.title);
  const dateStr = formatEventDate(event.start_time);
  const locationStr = event.location ? ` • ${sanitizeText(event.location)}` : '';
  const description = sanitizeText(event.description) || `${dateStr}${locationStr}`;
  
  const imageUrl = getOptimizedImageUrl(event.image_url);
  const imageType = getImageMimeType(imageUrl);
  const eventUrl = `https://vitana-v1.lovable.app/pub/events/${event.id}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | VITANA</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="event" />
  <meta property="og:site_name" content="VITANA" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="${imageType}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${eventUrl}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- WhatsApp -->
  <meta property="og:image:alt" content="${title}" />
  
  <meta http-equiv="refresh" content="0;url=${eventUrl}">
</head>
<body>
  <p>Redirecting to event page...</p>
  <a href="${eventUrl}">Click here if you are not redirected</a>
</body>
</html>`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('id');
    const userAgent = req.headers.get('user-agent') || '';

    console.log(`og-event: Request from user-agent: ${userAgent}`);
    console.log(`og-event: Event ID: ${eventId}`);
    console.log(`og-event: Is crawler: ${isCrawler(userAgent)}`);

    if (!eventId) {
      console.error('og-event: Missing event ID');
      const html = generateFallbackHTML();
      return new Response(html, { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        }
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      console.error('og-event: Invalid UUID format:', eventId);
      const html = generateFallbackHTML();
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch event data using RPC
    const { data: eventData, error } = await supabase
      .rpc('get_public_event_details', { event_id: eventId });

    if (error || !eventData || eventData.length === 0) {
      console.error('og-event: Event not found or error:', error);
      const html = generateFallbackHTML();
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    const event: EventData = eventData[0];
    console.log(`og-event: Fetched event: ${event.title}`);

    // For crawlers, return HTML with OG tags
    if (isCrawler(userAgent)) {
      console.log('og-event: Returning OG HTML for crawler');
      const html = generateOGHTML(event);
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // For real users, redirect to the app
    const redirectUrl = `https://vitana-v1.lovable.app/pub/events/${eventId}`;
    console.log(`og-event: Redirecting user to: ${redirectUrl}`);
    
    return Response.redirect(redirectUrl, 302);

  } catch (error) {
    console.error('og-event: Unexpected error:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
