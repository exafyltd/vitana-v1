import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const crawlers = [
    'whatsapp', 'facebookexternalhit', 'facebot', 'twitterbot',
    'linkedinbot', 'slackbot', 'telegrambot', 'skypeuripreview',
    'discordbot', 'redditbot', 'bot', 'crawler', 'spider',
  ];
  return crawlers.some((crawler) => ua.includes(crawler));
}

function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/covers/vitana-og-default.jpg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/storage/')) return `https://inmkhvwdcuyhnxkgfvsb.supabase.co${url}`;
  if (url.startsWith('/')) return `https://inmkhvwdcuyhnxkgfvsb.supabase.co${url}`;
  return `https://inmkhvwdcuyhnxkgfvsb.supabase.co/${url}`;
}

function getOptimizedImageUrl(url: string | null | undefined): string {
  const defaultImage = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/covers/vitana-og-default.jpg';
  if (!url) return defaultImage;

  let imageUrl = ensureAbsoluteUrl(url).split('?')[0];

  if (imageUrl.includes('/storage/v1/render/image/public/')) {
    imageUrl = imageUrl.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/');
  }

  if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
    imageUrl = imageUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    imageUrl += '?width=1200&height=630&resize=cover';
  }

  return imageUrl;
}

function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")
    .replace(/`/g, "'")
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .substring(0, 200);
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
  const homeUrl = 'https://vitanaland.com/comm/media-hub';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MAXINA - Shorts</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MAXINA" />
  <meta property="og:title" content="MAXINA - Shorts" />
  <meta property="og:description" content="Discover health and wellness shorts on MAXINA" />
  <meta property="og:image" content="${defaultImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${homeUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url=${homeUrl}">
</head>
<body><p>Redirecting to MAXINA...</p><a href="${homeUrl}">Click here</a></body>
</html>`;
}

interface ShortData {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  user_id: string | null;
}

function generateOGHTML(short: ShortData, creatorName: string, canonicalUrl: string, destinationUrl: string): string {
  const title = sanitizeText(short.title) || 'MAXINA Short';
  const description =
    sanitizeText(short.description) ||
    sanitizeText(`A short by ${creatorName} on MAXINA`);
  const imageUrl = getOptimizedImageUrl(short.thumbnail_url);
  const imageMimeType = getImageMimeType(imageUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | MAXINA</title>
  <meta property="og:type" content="video.other" />
  <meta property="og:site_name" content="MAXINA" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:url" content="${imageUrl}" />
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
</head>
<body><p>${title}</p><a href="${destinationUrl}">Open short</a></body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shortId = url.searchParams.get('id');
    const userAgent = req.headers.get('user-agent') || '';

    console.log('og-short request:', { shortId, isCrawler: isCrawler(userAgent) });

    if (!shortId) {
      const h = new Headers();
      h.set('Content-Type', 'text/html; charset=utf-8');
      h.set('X-Content-Type-Options', 'nosniff');
      h.set('Access-Control-Allow-Origin', '*');
      h.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
      return new Response(generateFallbackHTML(), { headers: h });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: video, error: videoError } = await supabase
      .from('media_videos')
      .select('id, title, description, thumbnail_url, user_id, status')
      .eq('id', shortId)
      .eq('status', 'published')
      .maybeSingle();

    if (videoError || !video) {
      const h = new Headers();
      h.set('Content-Type', 'text/html; charset=utf-8');
      h.set('X-Content-Type-Options', 'nosniff');
      h.set('Access-Control-Allow-Origin', '*');
      h.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
      return new Response(generateFallbackHTML(), { headers: h });
    }

    let creatorName = 'a member';
    if (video.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, full_name')
        .eq('user_id', video.user_id)
        .maybeSingle();
      if (profile) {
        creatorName = profile.display_name || profile.full_name || 'a member';
      }
    }

    const canonicalUrl = `https://vitanaland.com/comm/media-hub?short=${encodeURIComponent(video.id)}`;
    const destinationUrl = canonicalUrl;

    if (isCrawler(userAgent)) {
      const h = new Headers();
      h.set('Content-Type', 'text/html; charset=utf-8');
      h.set('X-Content-Type-Options', 'nosniff');
      h.set('Cache-Control', 'public, max-age=120, s-maxage=120');
      h.set('Access-Control-Allow-Origin', '*');
      h.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
      return new Response(generateOGHTML(video, creatorName, canonicalUrl, destinationUrl), { headers: h });
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': destinationUrl },
    });
  } catch (error) {
    console.error('og-short error:', error);
    const h = new Headers();
    h.set('Content-Type', 'text/html; charset=utf-8');
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('Access-Control-Allow-Origin', '*');
    h.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    return new Response(generateFallbackHTML(), { headers: h });
  }
});
