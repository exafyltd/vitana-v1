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
    const { query = '', category = '', page = 1, pageSize = 20 } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    console.log('Searching CJ products:', { query, category, page, pageSize });

    // Get access token
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

    // Search products from CJ
    const searchBody: any = {
      pageNum: page,
      pageSize: pageSize,
    };

    if (query) searchBody.keyword = query;
    if (category) searchBody.categoryId = category;

    const response = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
      body: JSON.stringify(searchBody),
    });

    const data = await response.json();

    if (!response.ok || !data.result || data.code !== 200) {
      console.error('CJ product search error:', data);
      throw new Error(data.message || 'Failed to search products');
    }

    // Transform and cache products
    const products = (data.data.list || []).map((p: any) => ({
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
      rating: 4.5, // CJ doesn't provide ratings, use default
      review_count: 0,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    }));

    // Upsert products to database
    if (products.length > 0) {
      const { error: upsertError } = await supabaseClient
        .from('cj_products')
        .upsert(products, { 
          onConflict: 'cj_product_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error caching products:', upsertError);
      } else {
        console.log(`Cached ${products.length} products`);
      }
    }

    return new Response(JSON.stringify({ 
      products,
      total: data.data.total || products.length,
      page,
      pageSize,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in cj-search-products:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
