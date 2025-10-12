import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[analyze-patterns] Starting pattern analysis for user: ${user.id}`);

    // Collect system data for analysis
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get automation execution data
    const { data: executions, error: execError } = await supabase
      .from('automation_executions')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(500);

    if (execError) {
      console.error('[analyze-patterns] Error fetching executions:', execError);
    }

    // Get user activity patterns (signups, active times)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (profileError) {
      console.error('[analyze-patterns] Error fetching profiles:', profileError);
    }

    // Aggregate data for AI analysis
    const executionsByStatus = (executions || []).reduce((acc, exec) => {
      acc[exec.status] = (acc[exec.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const executionsByHour = (executions || []).reduce((acc, exec) => {
      const hour = new Date(exec.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const signupsByDayOfWeek = (profiles || []).reduce((acc, profile) => {
      const day = new Date(profile.created_at).getDay();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const dataSnapshot = {
      period: '7 days',
      executions: {
        total: executions?.length || 0,
        byStatus: executionsByStatus,
        byHour: executionsByHour,
      },
      users: {
        newSignups: profiles?.length || 0,
        signupsByDayOfWeek,
      },
      timestamp: now.toISOString(),
    };

    console.log('[analyze-patterns] Data snapshot:', JSON.stringify(dataSnapshot, null, 2));

    // Call Lovable AI Gateway with structured output tool
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a behavioral pattern analyst for an automation system. Analyze the provided system data to discover recurring patterns, trends, and automation opportunities.

Focus on:
- Temporal patterns (when do things happen)
- User behavior patterns (what users do)
- Communication patterns (message frequency, timing)
- Workflow inefficiencies that could be automated
- Health/wellness engagement patterns

Be specific, data-driven, and actionable. Suggest automations that would genuinely help users.`;

    const userPrompt = `Analyze this system data and discover behavioral patterns:

${JSON.stringify(dataSnapshot, null, 2)}

Identify patterns with high confidence (>70%) that occur frequently and could benefit from automation. For each pattern discovered, provide specific triggers, conditions, and suggested actions.`;

    const aiPayload = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'discover_patterns',
            description: 'Return discovered behavioral patterns with automation suggestions',
            parameters: {
              type: 'object',
              properties: {
                patterns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      pattern_type: {
                        type: 'string',
                        enum: ['user_behavior', 'temporal', 'communication', 'workflow', 'health_metric']
                      },
                      pattern_name: { type: 'string' },
                      pattern_description: { type: 'string' },
                      confidence_level: { type: 'number', minimum: 0, maximum: 1 },
                      sample_size: { type: 'integer', minimum: 0 },
                      occurrence_rate: { type: 'number', minimum: 0, maximum: 1 },
                      triggers: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      conditions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: { type: 'string' },
                            operator: { type: 'string' },
                            value: { type: 'string' }
                          }
                        }
                      },
                      suggested_actions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string' },
                            config: { type: 'object' }
                          }
                        }
                      },
                      expected_impact: { type: 'string' }
                    },
                    required: ['pattern_type', 'pattern_name', 'pattern_description', 'confidence_level', 'sample_size']
                  }
                }
              },
              required: ['patterns']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'discover_patterns' } }
    };

    console.log('[analyze-patterns] Calling Lovable AI Gateway...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiPayload),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('Rate limits exceeded, please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required, please add funds to your Lovable AI workspace.');
      }
      const errorText = await aiResponse.text();
      console.error('[analyze-patterns] AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    console.log('[analyze-patterns] AI response:', JSON.stringify(aiResult, null, 2));

    // Extract patterns from tool call
    const choice = aiResult.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    
    let patternsData;
    if (toolCall?.function?.arguments) {
      try {
        patternsData = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('[analyze-patterns] Failed to parse tool call arguments:', e);
        throw new Error('Failed to parse AI response');
      }
    } else {
      console.error('[analyze-patterns] No tool call in response');
      throw new Error('AI did not return structured pattern data');
    }

    const patterns = patternsData.patterns || [];
    console.log(`[analyze-patterns] Discovered ${patterns.length} patterns`);

    // Insert patterns into database
    const insertPromises = patterns.map(async (pattern: any) => {
      const { error: insertError } = await supabase
        .from('pattern_discoveries')
        .insert({
          created_by: user.id,
          pattern_type: pattern.pattern_type,
          pattern_name: pattern.pattern_name,
          pattern_description: pattern.pattern_description,
          confidence_level: pattern.confidence_level,
          sample_size: pattern.sample_size,
          occurrence_rate: pattern.occurrence_rate || 0.5,
          triggers: pattern.triggers || [],
          conditions: pattern.conditions || [],
          suggested_actions: pattern.suggested_actions || [],
          expected_impact: pattern.expected_impact || 'Improved automation efficiency',
          data_snapshot: dataSnapshot,
          status: 'discovered',
        });

      if (insertError) {
        console.error('[analyze-patterns] Error inserting pattern:', insertError);
      }
    });

    await Promise.all(insertPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        patterns_discovered: patterns.length,
        patterns: patterns.map((p: any) => ({
          name: p.pattern_name,
          type: p.pattern_type,
          confidence: p.confidence_level
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analyze-patterns] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Pattern analysis failed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
