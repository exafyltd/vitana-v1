import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CJ_EMAIL = Deno.env.get('CJ_EMAIL');
    const CJ_PASSWORD = Deno.env.get('CJ_PASSWORD');

    if (!CJ_EMAIL || !CJ_PASSWORD) {
      throw new Error('CJ credentials not configured');
    }

    console.log('Requesting CJ access token...');

    const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: CJ_EMAIL,
        password: CJ_PASSWORD,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.result || data.code !== 200) {
      console.error('CJ auth error:', data);
      throw new Error(data.message || 'Failed to authenticate with CJ');
    }

    console.log('CJ access token obtained successfully');

    return new Response(JSON.stringify({ 
      token: data.data.accessToken,
      expiresIn: data.data.expiresIn || 86400 // 24 hours default
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in cj-get-token:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
