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
  if (url.startsWith('/')) return `https://vitana.app${url}`;
  return `https://vitana.app/${url}`;
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

// Generate fallback HTML for invalid/missing campaigns
function generateFallbackHTML(): string {
  const defaultImage = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/default-images/vitana-og-default.jpg';
  const homeUrl = 'https://vitana.app/home';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VITANA - Your Wellness Journey</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="VITANA" />
  <meta property="og:title" content="VITANA - Your Wellness Journey" />
  <meta property="og:description" content="Join the VITANA wellness community and discover your path to optimal health" />
  <meta property="og:image" content="${defaultImage}" />
  <meta property="og:image:secure_url" content="${defaultImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${homeUrl}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="VITANA - Your Wellness Journey" />
  <meta name="twitter:description" content="Join the VITANA wellness community" />
  <meta name="twitter:image" content="${defaultImage}" />
  
  <meta http-equiv="refresh" content="0;url=${homeUrl}">
</head>
<body>
  <p>Redirecting to VITANA...</p>
  <a href="${homeUrl}">Click here if you are not redirected</a>
</body>
</html>`;
}

interface CampaignData {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
}

// Generate HTML with OG tags
function generateOGHTML(campaign: CampaignData): string {
  const title = sanitizeText(campaign.name);
  const description = sanitizeText(campaign.description);
  const imageUrl = ensureAbsoluteUrl(campaign.cover_image_url);
  const campaignUrl = `https://vitana.app/pub/campaigns/${campaign.id}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | VITANA</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="VITANA" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${campaignUrl}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- WhatsApp -->
  <meta property="og:image:alt" content="${title}" />
  
  <meta http-equiv="refresh" content="0;url=${campaignUrl}">
</head>
<body>
  <p>Redirecting to campaign page...</p>
  <a href="${campaignUrl}">Click here if you are not redirected</a>
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
    const campaignId = url.searchParams.get('id');
    const userAgent = req.headers.get('user-agent') || '';

    console.log(`og-campaign: Request from user-agent: ${userAgent}`);
    console.log(`og-campaign: Campaign ID: ${campaignId}`);
    console.log(`og-campaign: Is crawler: ${isCrawler(userAgent)}`);

    if (!campaignId) {
      console.error('og-campaign: Missing campaign ID');
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
    if (!uuidRegex.test(campaignId)) {
      console.error('og-campaign: Invalid UUID format:', campaignId);
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

    // Fetch campaign data using RPC
    const { data: campaign, error } = await supabase
      .rpc('get_public_campaign_details', { campaign_id: campaignId });

    if (error || !campaign) {
      console.error('og-campaign: Campaign not found or error:', error);
      const html = generateFallbackHTML();
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    console.log(`og-campaign: Fetched campaign: ${campaign.name}`);

    // For crawlers, return HTML with OG tags
    if (isCrawler(userAgent)) {
      console.log('og-campaign: Returning OG HTML for crawler');
      const html = generateOGHTML(campaign);
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // For real users, redirect to the app
    const redirectUrl = `https://vitana.app/pub/campaigns/${campaignId}`;
    console.log(`og-campaign: Redirecting user to: ${redirectUrl}`);
    
    return Response.redirect(redirectUrl, 302);

  } catch (error) {
    console.error('og-campaign: Unexpected error:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
