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

    const { eventId } = await req.json();

    // Verify user is event creator OR co-creator and fetch full event details
    const { data: event, error: eventError } = await supabase
      .from('global_community_events')
      .select('created_by, title, description, location, metadata')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Check if user is the creator
    const isCreator = event.created_by === user.id;

    // Check if user is a co-creator
    const { data: coCreator } = await supabase
      .from('event_co_creators')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    const isCoCreator = !!coCreator;

    if (!isCreator && !isCoCreator) {
      throw new Error('Only event creators and co-creators can generate images');
    }

    // Extract event details from database
    const { title, description, location, metadata } = event;

    // Build AI prompt with contextual intelligence
    const venue = metadata?.venue || 'outdoor';
    const category = metadata?.category || 'wellness';
    const timeOfDay = metadata?.timeOfDay || 'day';

    // Extract key themes from event content
    const extractEventThemes = (title: string, description: string): string => {
      const combined = `${title} ${description || ''}`.toLowerCase();
      
      const themeKeywords: Record<string, string> = {
        yoga: 'yoga mats, meditation poses, peaceful stretching, wellness practice',
        meditation: 'peaceful meditation, mindful sitting, zen atmosphere, inner peace',
        dance: 'dynamic movement, flowing dance, joyful expression, rhythmic energy',
        fitness: 'active exercise, energetic workout, fitness equipment, physical activity',
        cooking: 'culinary preparation, fresh ingredients, cooking together, food creation',
        art: 'creative artwork, artistic expression, colorful materials, creative process',
        music: 'musical instruments, live performance, harmonious gathering, sound and rhythm',
        wine: 'wine tasting, vineyard setting, elegant glasses, sophisticated atmosphere',
        sailing: 'sailboat, open sea, Mediterranean waters, nautical adventure',
        hiking: 'mountain trails, nature walk, outdoor adventure, scenic paths',
        brunch: 'elegant breakfast table, fresh fruits, social dining, morning gathering',
        networking: 'people connecting, conversation, collaborative atmosphere, social interaction',
        planning: 'collaborative workspace, ideas brainstorming, creative meeting, strategy session',
        growth: 'inspirational setting, learning environment, development atmosphere, personal evolution',
        'lets dance': 'cozy gathering, entertainment atmosphere, social viewing, relaxed setting',
        sailing: 'sailboat deck, azure Mediterranean waters, sailing adventure, nautical scene',
        beach: 'sandy coastline, ocean setting, beach activities, coastal atmosphere',
        wellness: 'holistic health, balanced living, mindful practices, wellbeing focus'
      };
      
      for (const [keyword, visual] of Object.entries(themeKeywords)) {
        if (combined.includes(keyword)) {
          return visual;
        }
      }
      
      return 'welcoming community gathering, people connecting authentically, inclusive atmosphere';
    };

    const venueKeywords: Record<string, string> = {
      boat: 'luxury yacht deck, Mediterranean sea view, nautical atmosphere, sailing context',
      beach: 'sandy beach, ocean waves, coastal setting, palm trees, shoreline',
      winery: 'vineyard landscape, wine barrels, rustic elegance, grape vines',
      hotel: 'elegant hotel interior, modern luxury, ambient lighting, sophisticated space',
      restaurant: 'upscale dining space, culinary atmosphere, elegant table settings',
      outdoor: 'natural outdoor setting, open air, scenic landscape, nature environment',
      spa: 'tranquil spa interior, zen atmosphere, wellness ambiance, peaceful setting'
    };

    const categoryMood: Record<string, string> = {
      wellness: 'serene atmosphere, mindfulness, peaceful energy, holistic wellbeing',
      fitness: 'dynamic energy, movement, active lifestyle, physical vitality',
      social: 'vibrant social gathering, people connecting, lively atmosphere, community bonding',
      cultural: 'artistic expression, creative energy, cultural richness, expressive atmosphere',
      learning: 'focused atmosphere, educational setting, intellectual engagement, growth mindset'
    };

    const lightingMap: Record<string, string> = {
      morning: 'soft morning golden light, sunrise glow, fresh daybreak atmosphere',
      afternoon: 'bright natural daylight, clear sky, vibrant afternoon light',
      evening: 'warm evening light, golden hour glow, sunset ambiance',
      night: 'ambient evening lighting, atmospheric night setting, warm interior glow'
    };

    // VITANA brand aesthetic
    const brandGuidelines = 'warm Mediterranean aesthetic, natural wellness vibe, authentic community feeling, soft organic textures, calming color palette with touches of terracotta and sage green, professional yet approachable, documentary-style photography';

    // Extract event-specific visuals
    const eventSpecificVisuals = extractEventThemes(title, description || '');

    // Add composition variety
    const compositionVariants = [
      'wide angle establishing shot showing the full scene',
      'intimate medium shot focusing on human connection',
      'natural candid perspective capturing authentic moments',
      'environmental portrait style with context and atmosphere'
    ];
    const randomComposition = compositionVariants[Math.floor(Math.random() * compositionVariants.length)];

    // Build contextual prompt
    const contextualPrompt = `
Create a professional wellness community event image for "${title}".

Event context: ${description || 'Community wellness gathering'}

Visual requirements:
- Main focus: ${eventSpecificVisuals}
- Setting: ${venueKeywords[venue] || venue} in ${location || 'Mallorca, Mediterranean setting'}
- Atmosphere: ${categoryMood[category] || 'welcoming, authentic community vibe'}
- Lighting: ${lightingMap[timeOfDay] || 'natural, warm lighting'}
- Brand style: ${brandGuidelines}
- Composition: ${randomComposition}
- People: Include diverse people authentically engaging in the activity, natural candid moments, not staged or stock-photo-like
- Quality: High-resolution, photorealistic, magazine-quality wellness photography

Style: Natural documentary photography meets wellness editorial, authentic moments over perfection, Mediterranean warmth throughout, emphasis on genuine human connection and wellbeing.
    `.trim();

    // Aurora migration B7 (VTID-03764 chain / AURORA-B7-EDGE-FUNCTIONS-
    // INVENTORY.md's 2026-08-29 addendum): AI_BRIDGE_PROVIDER lets this
    // function move off calling Vertex Imagen directly onto the gateway's
    // Bedrock/Titan bridge (see _shared/bedrock-bridge-client.ts's
    // generateImage()), without touching anything below this block — both
    // paths converge on the same `base64ImageData` variable. Defaults to
    // 'vertex' so behavior is byte-for-byte unchanged until someone
    // deliberately sets the edge function secret to 'bedrock' — this ships
    // the seam, it does not flip it.
    const aiBridgeProvider = Deno.env.get('AI_BRIDGE_PROVIDER') || 'vertex';
    let base64ImageData: string | undefined;

    if (aiBridgeProvider === 'bedrock') {
      console.log('Generating contextual image with the Bedrock/Titan bridge');
      console.log('Prompt preview:', contextualPrompt.substring(0, 200) + '...');

      const { generateImage } = await import('../_shared/bedrock-bridge-client.ts');
      const bridgeResult = await generateImage(contextualPrompt, { width: 1280, height: 720 });
      base64ImageData = bridgeResult.imageBase64;

      if (!base64ImageData) {
        console.error('No image in bridge response:', JSON.stringify(bridgeResult));
        throw new Error('No image generated by the AI bridge');
      }
    } else {
      console.log('Generating contextual image with Google Imagen');
      console.log('Prompt preview:', contextualPrompt.substring(0, 200) + '...');

      // Get Google Cloud configuration
      const rawProjectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID') || '';
      const projectId = rawProjectId.trim();
      const rawRegion = Deno.env.get('GOOGLE_CLOUD_REGION') || 'us-central1';
      const region = rawRegion.trim();
      const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON');

      if (!projectId || !serviceAccountJson) {
        throw new Error('Google Cloud credentials not configured');
      }

      console.log('🔐 Obtaining Vertex AI access token...');

      // Parse service account
      const serviceAccount = JSON.parse(serviceAccountJson);

      // Create JWT for Google OAuth2
      const header = {
        alg: "RS256",
        typ: "JWT",
      };

      const now = Math.floor(Date.now() / 1000);
      const claim = {
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      };

      // Encode header and claim
      const encoder = new TextEncoder();
      const headerB64 = btoa(JSON.stringify(header))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const claimB64 = btoa(JSON.stringify(claim))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

      const signatureInput = `${headerB64}.${claimB64}`;

      // Import private key for signing
      const privateKey = serviceAccount.private_key;
      const pemHeader = "-----BEGIN PRIVATE KEY-----";
      const pemFooter = "-----END PRIVATE KEY-----";

      // Extract base64 content between PEM markers and remove all whitespace
      const pemContents = privateKey
        .replace(pemHeader, '')
        .replace(pemFooter, '')
        .replace(/[\r\n\s]/g, '');

      const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

      const key = await crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        encoder.encode(signatureInput)
      );

      const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

      const jwt = `${signatureInput}.${signatureB64}`;

      // Exchange JWT for access token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("❌ Token exchange failed:", error);
        throw new Error('Failed to authenticate with Google Cloud');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      console.log('✅ Access token obtained, calling Imagen API...');

      // Call Google Imagen API
      const imagenEndpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/imagen-3.0-fast-generate-001:predict`;

      const imagenResponse = await fetch(imagenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{
            prompt: contextualPrompt
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            addWatermark: false,
            enhancePrompt: true,
            language: "en",
            personGeneration: "allow_adult",
            safetySetting: "block_medium_and_above"
          }
        })
      });

      if (!imagenResponse.ok) {
        const errorText = await imagenResponse.text();
        console.error('❌ Imagen API error:', imagenResponse.status, errorText);

        if (imagenResponse.status === 429) {
          throw new Error('RATE_LIMIT');
        } else if (imagenResponse.status === 403) {
          throw new Error('Google Cloud quota exceeded or API not enabled');
        }
        throw new Error('Image generation failed');
      }

      const imagenData = await imagenResponse.json();
      console.log('✅ Imagen response received');

      // Extract base64 image from response
      base64ImageData = imagenData.predictions?.[0]?.bytesBase64Encoded;

      if (!base64ImageData) {
        console.error('No image in response:', JSON.stringify(imagenData));
        throw new Error('No image generated by Imagen');
      }
    }

    // Convert base64 to data URL format for consistency
    const base64Image = `data:image/png;base64,${base64ImageData}`;

    if (!base64Image) {
      throw new Error('No image generated');
    }

    // Convert base64 to blob
    const base64Data = base64Image.split(',')[1];
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to storage with unique filename to prevent cache issues
    const fileName = `${user.id}/${eventId}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('covers')
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
      .from('covers')
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
        imageUrl: publicUrl
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