import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ensure image URL is absolute — use direct public storage URLs
function getOgImageUrl(url: string | null | undefined): string {
  const defaultImage = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/covers/vitana-og-default.jpg';
  
  if (!url) return defaultImage;

  let imageUrl = url;

  // Make absolute
  if (!imageUrl.startsWith('http')) {
    imageUrl = `https://inmkhvwdcuyhnxkgfvsb.supabase.co${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  // Ensure we use /object/public/ (direct URL), not /render/image/
  if (imageUrl.includes('supabase.co/storage') && imageUrl.includes('/render/image/')) {
    imageUrl = imageUrl.replace('/render/image/public/', '/object/public/');
  }

  // Strip query params that may cause 400 errors
  if (imageUrl.includes('supabase.co/storage')) {
    imageUrl = imageUrl.split('?')[0];
  }

  return imageUrl;
}

function sanitizeDescription(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/`/g, "'")
    .trim()
    .substring(0, 160);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Missing slug parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use existing RPC to resolve event by slug
    const { data, error } = await supabase.rpc('resolve_event_by_slug', { identifier: slug });

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      console.error('Event not found for slug:', slug, error);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = Array.isArray(data) ? data[0] : data;

    const shortDescription = sanitizeDescription(event.description);

    const response = {
      title: event.title || '',
      short_description: shortDescription,
      image_url: getOgImageUrl(event.image_url),
      event_id: event.id,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    });
  } catch (err) {
    console.error('api-event-by-slug error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
