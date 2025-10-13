import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    const { eventId, title, description, location, metadata } = await req.json();

    // Verify user is event creator
    const { data: event, error: eventError } = await supabase
      .from('global_community_events')
      .select('created_by')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    if (event.created_by !== user.id) {
      throw new Error('Only event creators can generate images');
    }

    // Build AI prompt
    const venue = metadata?.venue || 'venue';
    const category = metadata?.category || 'wellness';
    const timeOfDay = metadata?.timeOfDay || 'day';

    const venueKeywords: Record<string, string> = {
      boat: 'luxury yacht deck, Mediterranean sea view, nautical atmosphere',
      beach: 'sandy beach, ocean waves, coastal setting, palm trees',
      winery: 'vineyard landscape, wine barrels, rustic elegance, grape vines',
      hotel: 'elegant hotel interior, modern luxury, ambient lighting',
      restaurant: 'upscale dining space, culinary atmosphere, elegant table settings',
      outdoor: 'natural outdoor setting, open air, scenic landscape',
      spa: 'tranquil spa interior, zen atmosphere, wellness ambiance'
    };

    const categoryMood: Record<string, string> = {
      wellness: 'serene atmosphere, mindfulness, peaceful energy',
      fitness: 'dynamic energy, movement, active lifestyle',
      social: 'vibrant social gathering, people connecting, lively atmosphere',
      cultural: 'artistic expression, creative energy, cultural richness',
      learning: 'focused atmosphere, educational setting, intellectual engagement'
    };

    const lightingMap: Record<string, string> = {
      morning: 'soft morning golden light, sunrise glow',
      afternoon: 'bright natural daylight, clear sky',
      evening: 'warm evening light, golden hour glow',
      night: 'ambient evening lighting, atmospheric night setting'
    };

    const prompt = `Professional event photography of ${title}, ${venueKeywords[venue] || venue} in ${location || 'Mallorca'}, ${categoryMood[category] || 'welcoming atmosphere'}, ${lightingMap[timeOfDay] || 'natural lighting'}, vibrant Mediterranean colors, people enjoying activities in background, high quality, photorealistic, 4k`;

    console.log('Generating image with prompt:', prompt);

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{
          role: 'user',
          content: prompt
        }],
        modalities: ['image', 'text']
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('RATE_LIMIT');
      } else if (aiResponse.status === 402) {
        throw new Error('PAYMENT_REQUIRED');
      }
      throw new Error('AI generation failed');
    }

    const aiData = await aiResponse.json();
    const base64Image = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!base64Image) {
      throw new Error('No image generated');
    }

    // Convert base64 to blob
    const base64Data = base64Image.split(',')[1];
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to storage
    const fileName = `${user.id}/${eventId}.png`;
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload image');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('event-images')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update event with new image URL
    const { error: updateError } = await supabase
      .from('global_community_events')
      .update({ image_url: publicUrl })
      .eq('id', eventId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update event');
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        prompt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    
    let statusCode = 500;
    let message = error.message || 'Unknown error';

    if (message === 'RATE_LIMIT') {
      statusCode = 429;
      message = 'Too many requests. Please wait a moment and try again.';
    } else if (message === 'PAYMENT_REQUIRED') {
      statusCode = 402;
      message = 'AI credits depleted. Please add credits to continue.';
    }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});