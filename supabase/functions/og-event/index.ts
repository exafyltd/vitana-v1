import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isCrawler(userAgent: string): boolean {
  const crawlers = [
    'WhatsApp', 'facebookexternalhit', 'Facebot', 'Twitterbot',
    'LinkedInBot', 'Slackbot', 'TelegramBot', 'SkypeUriPreview',
    'Discordbot', 'redditbot',
  ];
  return crawlers.some(crawler => userAgent.includes(crawler));
}

function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/default-images/vitana-og-default.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative URLs should resolve to Supabase storage, not vitanaland.com
  if (url.startsWith('/storage/')) return `https://inmkhvwdcuyhnxkgfvsb.supabase.co${url}`;
  if (url.startsWith('/')) return `https://inmkhvwdcuyhnxkgfvsb.supabase.co${url}`;
  return `https://inmkhvwdcuyhnxkgfvsb.supabase.co/${url}`;
}

// Return direct public storage URL — no render transforms needed
function getOptimizedImageUrl(url: string | null | undefined): string {
  const defaultImage = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/covers/vitana-og-default.jpg';
  if (!url) return defaultImage;

  let imageUrl = ensureAbsoluteUrl(url);

  // Ensure we use /object/public/ (direct URL), not /render/image/
  if (imageUrl.includes('supabase.co/storage') && imageUrl.includes('/render/image/')) {
    imageUrl = imageUrl.replace('/render/image/public/', '/object/public/');
  }

  // Strip any query params (like format=jpeg) that may cause 400 errors
  if (imageUrl.includes('supabase.co/storage')) {
    imageUrl = imageUrl.split('?')[0];
  }

  return imageUrl;
}

function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')           // Strip HTML tags
    .replace(/[\r\n]+/g, ' ')          // Strip newlines
    .replace(/\u201C|\u201D/g, '"')    // Curly double quotes → straight
    .replace(/\u2018|\u2019/g, "'")    // Curly single quotes → straight
    .replace(/`/g, "'")               // Backticks → straight quote
    .replace(/&/g, '&amp;')           // Escape ampersand
    .replace(/"/g, '&quot;')          // Escape double quotes
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .substring(0, 160);
}

function getImageMimeType(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.png')) return 'image/png';
  if (lowerUrl.includes('.gif')) return 'image/gif';
  if (lowerUrl.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function generateFallbackHTML(): string {
  const defaultImage = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/covers/vitana-og-default.jpg';
  const homeUrl = 'https://vitanaland.com';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VITANA - Discover Events</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="VITANA" />
  <meta property="og:title" content="VITANA - Discover Events" />
  <meta property="og:description" content="Join the VITANA longevity community and discover events near you" />
  <meta property="og:image" content="${defaultImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${homeUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url=${homeUrl}">
</head>
<body><p>Redirecting to VITANA...</p><a href="${homeUrl}">Click here</a></body>
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

function generateOGHTML(event: EventData, canonicalUrl: string, destinationUrl: string): string {
  const title = sanitizeText(event.title) || 'VITANA Event';
  const description = sanitizeText(event.description) || 'Join us for this event on VITANA';
  const imageUrl = getOptimizedImageUrl(event.image_url);
  const imageMimeType = getImageMimeType(imageUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | VITANA</title>
  <meta property="og:type" content="event" />
  <meta property="og:site_name" content="VITANA" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="${imageMimeType}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta http-equiv="refresh" content="0;url=${destinationUrl}">
</head>
<body><p>Redirecting to ${title}...</p><a href="${destinationUrl}">Click here</a></body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const eventId = url.searchParams.get('id');
    const userAgent = req.headers.get('user-agent') || '';

    console.log('og-event request:', { slug, eventId, isCrawler: isCrawler(userAgent) });

    if (!slug && !eventId) {
      return new Response(generateFallbackHTML(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let event: EventData | null = null;

    if (slug) {
      const { data, error } = await supabase.rpc('resolve_event_by_slug', { identifier: slug });
      if (!error && data && Array.isArray(data) && data.length > 0) {
        const row = data[0];
        event = { id: row.id, title: row.title, description: row.description, image_url: row.image_url, slug: row.slug, start_time: row.start_time, location: row.location };
      }
    }

    if (!event && eventId) {
      const { data, error } = await supabase
        .from('global_community_events')
        .select('id, title, description, image_url, slug, start_time, location')
        .eq('id', eventId)
        .single();
      if (!error && data) event = data;
    }

    if (!event) {
      return new Response(generateFallbackHTML(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Canonical URL is always vitanaland.com/e/{slug}
    const canonicalUrl = event.slug
      ? `https://vitanaland.com/e/${event.slug}`
      : `https://vitanaland.com/pub/events/${event.id}`;

    // Destination for human redirect — use share param approach for SPA routing
    const shareParams = new URLSearchParams();
    shareParams.set('share', 'event');
    if (event.slug) shareParams.set('slug', event.slug);
    else shareParams.set('id', event.id);
    const destinationUrl = `https://vitanaland.com/?${shareParams.toString()}`;

    if (isCrawler(userAgent)) {
      return new Response(generateOGHTML(event, canonicalUrl, destinationUrl), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': destinationUrl },
    });
  } catch (error) {
    console.error('og-event error:', error);
    return new Response(generateFallbackHTML(), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
});
