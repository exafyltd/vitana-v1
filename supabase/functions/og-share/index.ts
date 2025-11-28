import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isCrawler(userAgent: string): boolean {
  const crawlerPatterns = [
    'WhatsApp',
    'facebookexternalhit',
    'Facebot',
    'Twitterbot',
    'LinkedInBot',
    'TelegramBot',
    'Slackbot',
    'Discordbot',
    'bot',
    'crawler',
    'spider'
  ];
  return crawlerPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL') || 'https://vitana-v1.lovable.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('[og-share] Using PUBLIC_APP_URL:', PUBLIC_APP_URL);

interface ContentData {
  title: string;
  description: string;
  image_url?: string;
  url: string;
}

function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return 'https://vitana.app/default-og-image.jpg';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${SUPABASE_URL}${url}`;
  return url;
}

function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    // Remove emojis and other problematic Unicode
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u200D\uFE0F]/g, '')         // Zero-width joiner, variation selector
    // Convert em-dash/en-dash to regular hyphen
    .replace(/[–—]/g, '-')
    // Convert smart quotes to regular quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Trim and limit length
    .trim()
    .substring(0, 200);
}

function generateOGHTML(content: ContentData, isCrawlerRequest: boolean): string {
  const title = sanitizeText(content.title);
  const description = sanitizeText(content.description);
  const imageUrl = ensureAbsoluteUrl(content.image_url);
  const appUrl = content.url;

  // Debug logging to verify clean output
  console.log('[og-share] Sanitized title:', title);
  console.log('[og-share] Sanitized description:', description);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | VITANA</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
  <meta property="og:type" content="event">
  <meta property="og:site_name" content="VITANA">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${appUrl}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  ${isCrawlerRequest ? '' : `
  <!-- Instant redirect for real users -->
  <meta http-equiv="refresh" content="0;url=${appUrl}">
  <script>
    // Immediate redirect - no delay
    window.location.replace("${appUrl}");
  </script>
  `}
</head>
<body style="${!isCrawlerRequest ? `
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
  color: #ffffff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 24px;
  text-align: center;
` : 'font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px;'}">
  ${!isCrawlerRequest ? `
  <div style="max-width: 400px;">
    <!-- Vitana Logo -->
    <div style="font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 16px; color: #60a5fa;">
      VITANA
    </div>
    
    <!-- Loading spinner -->
    <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 24px;"></div>
    
    <!-- Message -->
    <h1 style="font-size: 20px; font-weight: 500; margin: 0 0 8px; color: #ffffff;">
      Opening your event in VITANA…
    </h1>
    <p style="font-size: 14px; color: rgba(255,255,255,0.6); margin: 0 0 24px;">
      You'll be redirected automatically
    </p>
    
    <!-- Fallback link -->
    <a href="${appUrl}" style="
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      font-size: 14px;
    ">
      Open Event →
    </a>
  </div>
  
  <style>
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  ` : `
  <h1>${title}</h1>
  <p>${description}</p>
  <p><a href="${appUrl}">View on VITANA</a></p>
  `}
</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    const userAgent = req.headers.get('user-agent') || '';
    const isCrawlerRequest = isCrawler(userAgent);

    console.log(`[og-share] Request: type=${type}, id=${id}, crawler=${isCrawlerRequest}`);

    if (!type || !id) {
      return new Response('Missing type or id parameter', { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    let contentData: ContentData | null = null;

    // Fetch content based on type
    switch (type) {
      case 'event':
      case 'meetup': {
        const { data, error } = await supabase
          .from('global_community_events')
          .select('title, description, image_url, start_time, location')
          .eq('id', id)
          .single();

        if (error) {
          console.error('[og-share] Event fetch error:', error);
          throw error;
        }

        if (data) {
          contentData = {
            title: data.title,
            description: data.description || `Join us ${data.start_time ? `on ${new Date(data.start_time).toLocaleDateString()}` : ''} ${data.location ? `at ${data.location}` : ''}`,
            image_url: data.image_url,
            url: `${PUBLIC_APP_URL}/comm/events-meetups?event=${id}`
          };
        }
        break;
      }

      case 'group': {
        const { data, error } = await supabase
          .from('global_community_groups')
          .select('name, description, cover_url')
          .eq('id', id)
          .single();

        if (error) {
          console.error('[og-share] Group fetch error:', error);
          throw error;
        }

        if (data) {
          contentData = {
            title: data.name,
            description: data.description || 'Join our community on VITANA',
            image_url: data.cover_url,
            url: `${PUBLIC_APP_URL}/comm/groups/${id}`
          };
        }
        break;
      }

      case 'profile': {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, full_name, bio, avatar_url, handle')
          .eq('user_id', id)
          .single();

        if (error) {
          console.error('[og-share] Profile fetch error:', error);
          throw error;
        }

        if (data) {
          contentData = {
            title: data.display_name || data.full_name || 'VITANA User',
            description: data.bio || 'Join me on VITANA',
            image_url: data.avatar_url,
            url: `${PUBLIC_APP_URL}/profile/${data.handle || id}`
          };
        }
        break;
      }

      case 'post': {
        const { data, error } = await supabase
          .from('distribution_posts')
          .select('title, description, metadata')
          .eq('id', id)
          .single();

        if (error) {
          console.error('[og-share] Post fetch error:', error);
          throw error;
        }

        if (data) {
          const imageUrl = data.metadata && typeof data.metadata === 'object' && 'image_url' in data.metadata 
            ? (data.metadata as any).image_url 
            : null;
          
          contentData = {
            title: data.title,
            description: data.description || 'Check out this post on VITANA',
            image_url: imageUrl,
            url: `${PUBLIC_APP_URL}/sharing/posts/${id}`
          };
        }
        break;
      }

      default:
        return new Response(`Unsupported content type: ${type}`, { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
        });
    }

    if (!contentData) {
      return new Response('Content not found', { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    console.log('[og-share] Generated OG tags for:', contentData.title);

    const html = generateOGHTML(contentData, isCrawlerRequest);

    // Use TextEncoder for proper UTF-8 response
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);

    return new Response(htmlBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    });

  } catch (error) {
    console.error('[og-share] Error:', error);
    return new Response(`Error: ${error.message}`, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  }
});
