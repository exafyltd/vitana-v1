import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  userId: string;
  platform: 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'x';
  profileUrl: string;
  bioText?: string;
}

interface ParsedData {
  [key: string]: any;
}

serve(async (req) => {
  console.log('[social-media-import] Function invoked');
  
  if (req.method === 'OPTIONS') {
    console.log('[social-media-import] CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[social-media-import] Request body:', JSON.stringify(body));
    
    const { userId, platform, profileUrl, bioText }: ImportRequest = body;

    console.log(`[social-media-import] Processing ${platform} import for user ${userId}`);

    if (!userId || !platform || !profileUrl) {
      const errorMsg = 'Missing required fields: userId, platform, or profileUrl';
      console.error('[social-media-import] Validation error:', errorMsg);
      throw new Error(errorMsg);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let updateData: any = {
      [`${platform}_url`]: profileUrl,
      [`${platform}_synced_at`]: new Date().toISOString(),
    };

    // If bioText provided, use AI to parse it
    if (bioText && bioText.trim()) {
      console.log(`Parsing ${platform} bio with AI`);
      
      const systemPrompts: Record<string, string> = {
        linkedin: "You are a professional profile analyzer. Extract headline, summary, and skills from LinkedIn bios.",
        instagram: "You are a social media analyzer. Extract bio, interests, and themes from Instagram profiles.",
        tiktok: "You are a content analyzer. Extract bio, content themes, and personality traits from TikTok profiles.",
        youtube: "You are a video content analyzer. Extract description, content categories, and expertise from YouTube channels.",
        facebook: "You are a social profile analyzer. Extract bio, interests, and community involvement from Facebook profiles.",
        x: "You are a micro-content analyzer. Extract bio, topics of interest, and communication style from X/Twitter profiles."
      };

      const userPrompt = `Analyze this ${platform} profile text and extract structured data:\n\n${bioText}`;

      try {
        // Aurora migration B7 (VTID-03764 chain): see generate-enhanced-
        // recommendations/index.ts for the full rationale. Defaults to
        // 'gemini' — unchanged behavior until a deployment opts into 'bedrock'.
        const aiBridgeProvider = Deno.env.get('AI_BRIDGE_PROVIDER') || 'gemini';
        const { generateContent, extractFunctionCall } = await import(
          aiBridgeProvider === 'bedrock' ? '../_shared/bedrock-bridge-client.ts' : '../_shared/gemini-client.ts'
        );
        const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');

        if (aiBridgeProvider === 'gemini' && !GEMINI_API_KEY) {
          console.error('GOOGLE_GEMINI_API_KEY not configured');
        } else {
          const aiResponse = await generateContent(
            GEMINI_API_KEY ?? '',
            [
              { role: 'system', content: systemPrompts[platform] },
              { role: 'user', content: userPrompt }
            ],
            { temperature: 0.3 },
            [{
              name: "extract_profile_data",
              description: `Extract structured data from ${platform} profile`,
              parameters: getPlatformSchema(platform)
            }]
          );

          const functionCall = extractFunctionCall(aiResponse);
          if (functionCall) {
            const parsedData = functionCall.args;
            console.log('Parsed data:', parsedData);
            
            // Map parsed data to database columns
            updateData = { ...updateData, ...mapParsedData(platform, parsedData) };
          }
        }
      } catch (aiError) {
        console.error('AI parsing error:', aiError);
        // Continue with basic update even if AI parsing fails
      }
    }

    // Update profile in database
    console.log('[social-media-import] Updating database with:', JSON.stringify(updateData));
    
    const { data, error } = await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    // Explicit check for no matching profile
    if (!data && !error) {
      console.error(`[social-media-import] No profile found for user ${userId}`);
      throw new Error(`No profile found for user ID: ${userId}. Please ensure you have a profile.`);
    }

    if (error) {
      console.error(`[social-media-import] Database update error for ${platform}:`, error);
      throw error;
    }

    console.log(`[social-media-import] ${platform} import successful for user ${userId}`, data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[social-media-import] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getPlatformSchema(platform: string): any {
  const schemas: Record<string, any> = {
    linkedin: {
      type: "object",
      properties: {
        headline: { type: "string", description: "Professional headline" },
        summary: { type: "string", description: "Professional summary" },
        skills: { type: "array", items: { type: "string" }, description: "Professional skills" }
      },
      required: ["headline"],
      additionalProperties: false
    },
    instagram: {
      type: "object",
      properties: {
        bio: { type: "string", description: "Instagram bio" },
        followers_count: { type: "integer", description: "Estimated follower count if mentioned" },
        interests: { type: "array", items: { type: "string" }, description: "Interests and themes" }
      },
      required: ["bio"],
      additionalProperties: false
    },
    tiktok: {
      type: "object",
      properties: {
        bio: { type: "string", description: "TikTok bio" },
        followers_count: { type: "integer", description: "Estimated follower count if mentioned" },
        content_themes: { type: "array", items: { type: "string" }, description: "Content themes" }
      },
      required: ["bio"],
      additionalProperties: false
    },
    youtube: {
      type: "object",
      properties: {
        description: { type: "string", description: "Channel description" },
        subscribers_count: { type: "integer", description: "Estimated subscriber count if mentioned" },
        content_categories: { type: "array", items: { type: "string" }, description: "Content categories" }
      },
      required: ["description"],
      additionalProperties: false
    },
    facebook: {
      type: "object",
      properties: {
        bio: { type: "string", description: "Facebook bio" },
        interests: { type: "array", items: { type: "string" }, description: "Interests" }
      },
      required: ["bio"],
      additionalProperties: false
    },
    x: {
      type: "object",
      properties: {
        bio: { type: "string", description: "X/Twitter bio" },
        followers_count: { type: "integer", description: "Estimated follower count if mentioned" },
        topics: { type: "array", items: { type: "string" }, description: "Topics of interest" }
      },
      required: ["bio"],
      additionalProperties: false
    }
  };

  return schemas[platform];
}

function mapParsedData(platform: string, parsed: ParsedData): any {
  const mappings: Record<string, any> = {
    linkedin: {
      linkedin_headline: parsed.headline,
      linkedin_summary: parsed.summary,
      professional_skills: parsed.skills
    },
    instagram: {
      instagram_bio: parsed.bio,
      instagram_followers_count: parsed.followers_count,
      instagram_interests: parsed.interests
    },
    tiktok: {
      tiktok_bio: parsed.bio,
      tiktok_followers_count: parsed.followers_count,
      tiktok_content_themes: parsed.content_themes
    },
    youtube: {
      youtube_description: parsed.description,
      youtube_subscribers_count: parsed.subscribers_count,
      youtube_content_categories: parsed.content_categories
    },
    facebook: {
      facebook_bio: parsed.bio,
      facebook_interests: parsed.interests
    },
    x: {
      x_bio: parsed.bio,
      x_followers_count: parsed.followers_count,
      x_topics: parsed.topics
    }
  };

  return mappings[platform] || {};
}
