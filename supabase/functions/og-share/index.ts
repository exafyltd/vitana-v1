import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .substring(0, 200);
}

function generateOGHTML(content: ContentData): string {
  const title = sanitizeText(content.title);
  const description = sanitizeText(content.description);
  const imageUrl = ensureAbsoluteUrl(content.image_url);
  const appUrl = content.url;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | VITANA</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
  <meta property="og:type" content="website">
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
  
  <!-- Redirect real users to actual app -->
  <meta http-equiv="refresh" content="0;url=${appUrl}">
  <script>
    window.location.href = "${appUrl}";
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px;">
  <h1>Redirecting to VITANA...</h1>
  <p>If you're not redirected automatically, <a href="${appUrl}">click here</a>.</p>
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

    console.log(`[og-share] Request: type=${type}, id=${id}`);

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
            url: `${SUPABASE_URL.replace('.supabase.co', '.lovable.app')}/comm/events-meetups?event=${id}`
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
            url: `${SUPABASE_URL.replace('.supabase.co', '.lovable.app')}/comm/groups/${id}`
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
            url: `${SUPABASE_URL.replace('.supabase.co', '.lovable.app')}/profile/${data.handle || id}`
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
            url: `${SUPABASE_URL.replace('.supabase.co', '.lovable.app')}/sharing/posts/${id}`
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

    const html = generateOGHTML(contentData);

    return new Response(html, {
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
