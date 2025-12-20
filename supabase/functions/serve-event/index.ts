import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// App base URL for redirects
const APP_BASE_URL = 'https://vitana-v1.lovable.app';
const DEFAULT_IMAGE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/default-images/vitana-og-default.jpg';

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
    'Pinterest',
    'Googlebot',
    'bingbot',
  ];
  return crawlers.some(crawler => userAgent.toLowerCase().includes(crawler.toLowerCase()));
}

// Ensure URLs are absolute
function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return DEFAULT_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${APP_BASE_URL}${url}`;
  return `${APP_BASE_URL}/${url}`;
}

// Optimize image URL for social media crawlers (convert WebP to JPEG)
function getOptimizedImageUrl(url: string | null | undefined): string {
  if (!url) return DEFAULT_IMAGE;
  
  const absoluteUrl = ensureAbsoluteUrl(url);
  
  // If it's a Supabase storage URL with WebP, transform to JPEG for WhatsApp compatibility
  if (absoluteUrl.includes('supabase.co/storage/v1/object/public/') && absoluteUrl.toLowerCase().endsWith('.webp')) {
    return absoluteUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    ) + '?width=1200&height=630&format=jpeg&quality=85';
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

// Detect image MIME type from URL (handles transformed images)
function getImageMimeType(url: string): string {
  const lowerUrl = url.toLowerCase();
  
  // If URL contains format=jpeg or format=jpg, it's been transformed to JPEG
  if (lowerUrl.includes('format=jpeg') || lowerUrl.includes('format=jpg')) {
    return 'image/jpeg';
  }
  
  if (lowerUrl.endsWith('.webp')) return 'image/webp';
  if (lowerUrl.endsWith('.png')) return 'image/png';
  if (lowerUrl.endsWith('.gif')) return 'image/gif';
  if (lowerUrl.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  slug: string | null;
  start_time: string;
  location: string | null;
}

// Generate HTML with OG tags for event
function generateOGHTML(event: EventData, canonicalUrl: string): string {
  const title = sanitizeText(event.title) || 'VITANA Event';
  const description = sanitizeText(event.description) || 'Join us for this event on VITANA';
  const imageUrl = getOptimizedImageUrl(event.image_url);
  const imageMimeType = getImageMimeType(imageUrl);
  
  // Fixed dimensions for social media cards
  const imageWidth = 1200;
  const imageHeight = 630;

  console.log('Generating OG HTML:', {
    title,
    description: description.substring(0, 50) + '...',
    imageUrl,
    imageMimeType,
    canonicalUrl
  });

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
  <meta property="og:image:type" content="${imageMimeType}" />
  <meta property="og:image:width" content="${imageWidth}" />
  <meta property="og:image:height" content="${imageHeight}" />
  <meta property="og:url" content="${canonicalUrl}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Redirect for browsers that don't support meta refresh -->
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}">
  <link rel="canonical" href="${canonicalUrl}" />
</head>
<body>
  <p>Redirecting to ${title}...</p>
  <a href="${canonicalUrl}">Click here if you are not redirected</a>
</body>
</html>`;
}

// Generate fallback HTML for invalid/missing events
function generateFallbackHTML(): string {
  const homeUrl = `${APP_BASE_URL}/home`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VITANA - Discover Events</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="VITANA" />
  <meta property="og:title" content="VITANA - Discover Events" />
  <meta property="og:description" content="Join the VITANA longevity community and discover events near you" />
  <meta property="og:image" content="${DEFAULT_IMAGE}" />
  <meta property="og:image:secure_url" content="${DEFAULT_IMAGE}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${homeUrl}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="VITANA - Discover Events" />
  <meta name="twitter:description" content="Join the VITANA longevity community" />
  <meta name="twitter:image" content="${DEFAULT_IMAGE}" />
  
  <meta http-equiv="refresh" content="0;url=${homeUrl}">
</head>
<body>
  <p>Redirecting to VITANA...</p>
  <a href="${homeUrl}">Click here if you are not redirected</a>
</body>
</html>`;
}

// Extract slug from URL path: /serve-event/my-event-slug -> my-event-slug
function extractSlugFromPath(url: URL): string | null {
  const pathname = url.pathname;
  // Path format: /serve-event/slug-here or /functions/v1/serve-event/slug-here
  const segments = pathname.split('/').filter(Boolean);
  
  // Find 'serve-event' in path and get the next segment
  const funcIndex = segments.findIndex(s => s === 'serve-event');
  if (funcIndex !== -1 && segments.length > funcIndex + 1) {
    return decodeURIComponent(segments[funcIndex + 1]);
  }
  
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userAgent = req.headers.get('user-agent') || '';
    
    // Extract slug from path (primary) or query param (fallback)
    const pathSlug = extractSlugFromPath(url);
    const querySlug = url.searchParams.get('slug');
    const slug = pathSlug || querySlug;

    console.log('serve-event request:', { 
      pathname: url.pathname,
      pathSlug,
      querySlug,
      slug,
      userAgent: userAgent.substring(0, 100),
      isCrawler: isCrawler(userAgent)
    });

    if (!slug) {
      console.log('No slug provided, returning fallback');
      return new Response(generateFallbackHTML(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve event by slug (handles both slugs and UUIDs)
    console.log('Resolving event by slug:', slug);
    const { data, error } = await supabase.rpc('resolve_event_by_slug', { identifier: slug });
    
    if (error) {
      console.error('Error resolving event:', error);
      return new Response(generateFallbackHTML(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('Event not found');
      return new Response(generateFallbackHTML(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const row = data[0];
    const event: EventData = {
      id: row.id,
      title: row.title,
      description: row.description,
      image_url: row.image_url,
      slug: row.slug,
      start_time: row.start_time,
      location: row.location
    };

    // Build canonical URL (clean /e/:slug format)
    const canonicalUrl = event.slug 
      ? `${APP_BASE_URL}/e/${encodeURIComponent(event.slug)}`
      : `${APP_BASE_URL}/pub/events/${encodeURIComponent(event.id)}`;

    console.log('Event found:', { 
      id: event.id, 
      title: event.title, 
      slug: event.slug,
      canonicalUrl,
      isCrawler: isCrawler(userAgent)
    });

    // For crawlers: return OG HTML with proper tags
    if (isCrawler(userAgent)) {
      console.log('Crawler detected, returning OG HTML');
      return new Response(generateOGHTML(event, canonicalUrl), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        },
      });
    }

    // For real users: 302 redirect to clean app URL
    console.log('Real user detected, redirecting to:', canonicalUrl);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': canonicalUrl,
      },
    });

  } catch (error) {
    console.error('serve-event error:', error);
    return new Response(generateFallbackHTML(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
});
