import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { diaryEntryId, content } = await req.json();
    
    if (!content || !diaryEntryId) {
      throw new Error('Content and diaryEntryId are required');
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log(`[diary-insights] Extracting insights from diary entry: ${diaryEntryId}`);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.warn('[diary-insights] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ success: false, error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use Lovable AI to extract structured insights
    const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Extract key factual information from this diary entry that should be remembered long-term. Focus ONLY on:
- Personal facts (birthday, age, location, occupation, family, residence)
- Health data (conditions, medications, allergies, symptoms, treatments)
- Preferences (foods, activities, routines, sleep schedule)
- Goals (health targets, lifestyle changes, aspirations)
- Important dates and events
- Relationships and social connections

CRITICAL RULES:
1. Extract ONLY concrete, factual information
2. Skip opinions, feelings, or temporary states unless they indicate patterns
3. Each insight must be concise and specific
4. Confidence must be 0.7+ for facts explicitly stated, 0.8+ for clear patterns
5. Do NOT extract vague or generic statements

Examples of GOOD extractions:
- "Lives in Abu Dhabi, UAE from October to April"
- "Lives in Mallorca, Spain from May to September"
- "Birthday: March 15, 1990"
- "Takes medication X for condition Y daily"

Examples of BAD extractions (DO NOT EXTRACT):
- "Had a good day today"
- "Feeling tired"
- "Thinking about exercise"
- "Weather was nice"`
          },
          {
            role: 'user',
            content: `Diary Entry: ${content}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_insights',
              description: 'Extract meaningful factual information from the diary entry',
              parameters: {
                type: 'object',
                properties: {
                  insights: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['fact', 'preference', 'goal', 'pattern', 'insight'],
                          description: 'Type of memory'
                        },
                        content: {
                          type: 'string',
                          description: 'Concise fact or insight (e.g., "Lives in Abu Dhabi from October to April")'
                        },
                        confidence: {
                          type: 'number',
                          description: 'Confidence score (0.7-1.0)',
                          minimum: 0.7,
                          maximum: 1.0
                        }
                      },
                      required: ['type', 'content', 'confidence']
                    }
                  }
                },
                required: ['insights']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_insights' } }
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('[diary-insights] Extraction failed:', extractionResponse.status, errorText);
      throw new Error('Failed to extract insights');
    }

    const extractionData = await extractionResponse.json();
    const toolCall = extractionData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.log('[diary-insights] No insights extracted');
      return new Response(JSON.stringify({ success: true, insightsCount: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { insights } = JSON.parse(toolCall.function.arguments);
    
    if (!insights || insights.length === 0) {
      console.log('[diary-insights] No insights found');
      return new Response(JSON.stringify({ success: true, insightsCount: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[diary-insights] Extracted ${insights.length} insights, checking for duplicates...`);

    let storedCount = 0;
    const skippedDuplicates: string[] = [];

    for (const insight of insights) {
      // Quality filter
      if (insight.confidence < 0.7) {
        console.log(`[diary-insights] Skipped low confidence: ${insight.content} (${insight.confidence})`);
        continue;
      }

      // Check for duplicates
      const similarityKeywords = insight.content.toLowerCase().split(' ').filter((w: string) => w.length > 3);
      
      if (similarityKeywords.length > 0) {
        const { data: existingMemories } = await supabase
          .from('ai_memory')
          .select('id, content, confidence_score')
          .eq('user_id', user.id)
          .eq('memory_type', insight.type)
          .eq('is_active', true)
          .limit(10);

        // Check if content is very similar
        const isDuplicate = existingMemories?.some((existing: any) => {
          const existingLower = existing.content.toLowerCase();
          const matchCount = similarityKeywords.filter((keyword: string) => 
            existingLower.includes(keyword)
          ).length;
          return matchCount >= Math.min(3, similarityKeywords.length * 0.6);
        });

        if (isDuplicate) {
          console.log(`[diary-insights] Skipped duplicate: ${insight.content}`);
          skippedDuplicates.push(insight.content);
          continue;
        }
      }

      // Store new insight
      const { error: insertError } = await supabase.from('ai_memory').insert({
        user_id: user.id,
        memory_type: insight.type,
        content: insight.content,
        confidence_score: insight.confidence,
        is_active: true,
        metadata: {
          source: 'diary_entry',
          diary_entry_id: diaryEntryId,
          extracted_at: new Date().toISOString()
        }
      });

      if (insertError) {
        console.error(`[diary-insights] Failed to store: ${insight.content}`, insertError);
      } else {
        console.log(`[diary-insights] ✓ Stored: ${insight.type} - ${insight.content} (${insight.confidence})`);
        storedCount++;
      }
    }

    console.log(`[diary-insights] Extraction complete: stored ${storedCount}, skipped ${skippedDuplicates.length} duplicates`);

    return new Response(
      JSON.stringify({
        success: true,
        insightsCount: storedCount,
        totalExtracted: insights.length,
        skippedDuplicates: skippedDuplicates.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[diary-insights] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
