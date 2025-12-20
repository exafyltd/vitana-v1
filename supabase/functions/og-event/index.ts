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

// Generate fallback HTML for invalid/missing events
function generateFallbackHTML(): string {
  const defaultImage = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/default-images/vitana-og-default.jpg';
  const homeUrl = 'https://vitana-v1.lovable.app/home';

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
  <meta property="og:image" content="${defaultImage}" />
  <meta property="og:image:secure_url" content="${defaultImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${homeUrl}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="VITANA - Discover Events" />
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
  slug: string | null;
  start_time: string;
  location: string | null;
}

// Generate HTML with OG tags for event
function generateOGHTML(event: EventData, destinationUrl: string): string {
  const title = sanitizeText(event.title) || 'VITANA Event';
  const description = sanitizeText(event.description) || 'Join us for this event on VITANA';
  const imageUrl = getOptimizedImageUrl(event.image_url);
  const imageMimeType = getImageMimeType(imageUrl);
  
  // Image dimensions for social media (WhatsApp requires these for reliability)
  const imageWidth = 1200;
  const imageHeight = 630;

  console.log('Generating OG HTML for event:', {
    title,
    description: description.substring(0, 50) + '...',
    imageUrl,
    imageMimeType,
    imageWidth,
    imageHeight,
    destinationUrl
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
  <meta property="og:url" content="${destinationUrl}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Redirect for browsers that don't support meta refresh -->
  <meta http-equiv="refresh" content="0;url=${destinationUrl}">
  <link rel="canonical" href="${destinationUrl}" />
</head>
<body>
  <p>Redirecting to ${title}...</p>
  <a href="${destinationUrl}">Click here if you are not redirected</a>
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
    const slug = url.searchParams.get('slug');
    const eventId = url.searchParams.get('id');
    const userAgent = req.headers.get('user-agent') || '';
    
    // UTM params for tracking (captured server-side)
    const utmSource = url.searchParams.get('utm_source');
    const utmMedium = url.searchParams.get('utm_medium');
    const utmCampaign = url.searchParams.get('utm_campaign');

    console.log('og-event request:', { 
      slug, 
      eventId, 
      userAgent: userAgent.substring(0, 100),
      isCrawler: isCrawler(userAgent),
      utmSource,
      utmMedium,
      utmCampaign
    });

    if (!slug && !eventId) {
      console.log('No slug or id provided, returning fallback');
      return new Response(generateFallbackHTML(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let event: EventData | null = null;

    // Try to resolve by slug first, then by ID
    if (slug) {
      console.log('Resolving event by slug:', slug);
      const { data, error } = await supabase.rpc('resolve_event_by_slug', { identifier: slug });
      
      if (error) {
        console.error('Error resolving event by slug:', error);
      } else if (data && Array.isArray(data) && data.length > 0) {
        // RPC returning TABLE returns an array - access first row
        const row = data[0];
        console.log('Resolved event data:', JSON.stringify(row));
        event = {
          id: row.id,
          title: row.title,
          description: row.description,
          image_url: row.image_url,
          slug: row.slug,
          start_time: row.start_time,
          location: row.location
        };
      } else {
        console.log('No event data returned from RPC, data:', JSON.stringify(data));
      }
    }

    // Fallback to ID lookup if slug didn't work
    if (!event && eventId) {
      console.log('Resolving event by ID:', eventId);
      const { data, error } = await supabase
        .from('global_community_events')
        .select('id, title, description, image_url, slug, start_time, location')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error fetching event by ID:', error);
      } else if (data) {
        event = data;
      }
    }

    if (!event) {
      console.log('Event not found, returning fallback');
      return new Response(generateFallbackHTML(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Build the clean destination URL (no UTMs for users)
    const appBaseUrl = 'https://vitana-v1.lovable.app';
    const destinationUrl = event.slug 
      ? `${appBaseUrl}/e/${encodeURIComponent(event.slug)}`
      : `${appBaseUrl}/pub/events/${encodeURIComponent(event.id)}`;

    console.log('Event found:', { 
      id: event.id, 
      title: event.title, 
      slug: event.slug,
      destinationUrl 
    });

    // For crawlers: return OG HTML
    if (isCrawler(userAgent)) {
      console.log('Crawler detected, returning OG HTML');
      return new Response(generateOGHTML(event, destinationUrl), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        },
      });
    }

    // For real users: redirect to clean URL
    console.log('Real user detected, redirecting to:', destinationUrl);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': destinationUrl,
      },
    });

  } catch (error) {
    console.error('og-event error:', error);
    return new Response(generateFallbackHTML(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
});
