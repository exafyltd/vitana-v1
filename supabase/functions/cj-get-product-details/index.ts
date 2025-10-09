import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();

    if (!productId) {
      throw new Error('Product ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    console.log('Getting product details for:', productId);

    // Check cache first
    const { data: cachedProduct } = await supabaseClient
      .from('cj_products')
      .select('*')
      .eq('cj_product_id', productId)
      .single();

    // If cache is fresh (less than 24 hours), return it
    if (cachedProduct && cachedProduct.last_synced_at) {
      const lastSync = new Date(cachedProduct.last_synced_at);
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSync < 24) {
        console.log('Returning cached product details');
        return new Response(JSON.stringify({ product: cachedProduct }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get fresh data from CJ
    const tokenResponse = await fetch(`${req.headers.get("origin")}/functions/v1/cj-get-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get CJ access token');
    }

    const { token } = await tokenResponse.json();

    const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
      body: JSON.stringify({ pid: productId }),
    });

    const data = await response.json();

    if (!response.ok || !data.result || data.code !== 200) {
      console.error('CJ product details error:', data);
      throw new Error(data.message || 'Failed to get product details');
    }

    const p = data.data;
    const product = {
      cj_product_id: p.pid,
      name: p.productNameEn,
      description: p.description || p.productNameEn,
      category: p.categoryName || 'Supplements',
      price: parseFloat(p.sellPrice || 0),
      list_price: parseFloat(p.originalPrice || p.sellPrice || 0),
      image_url: p.productImage,
      images: p.productImages || [],
      brand: p.brand || 'CJ',
      variants: p.variants || [],
      inventory_count: p.inventory || 0,
      weight: p.productWeight || null,
      dimensions: p.productDimensions || null,
      shipping_info: {
        shippingTime: p.shippingTime || '3-14 days',
      },
      rating: 4.5,
      review_count: 0,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    };

    // Update cache
    await supabaseClient
      .from('cj_products')
      .upsert([product], { onConflict: 'cj_product_id' });

    console.log('Product details fetched and cached');

    return new Response(JSON.stringify({ product }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in cj-get-product-details:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
