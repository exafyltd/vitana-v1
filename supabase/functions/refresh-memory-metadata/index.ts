import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORY_TARGETS: Record<string, number> = {
  "personal-identity": 10,
  "health-wellness": 15,
  "lifestyle-routines": 12,
  "business-projects": 10,
  "network-relationships": 15,
  "learning-knowledge": 12,
  "finance-assets": 8,
  "location-environment": 8,
  "digital-footprint": 10,
  "values-aspirations": 10,
  "autopilot-settings": 5,
  "future-plans": 10,
  "general": 10,
};

const calculateCategoryProgress = (
  memoryCount: number,
  avgConfidence: number,
  target: number
): number => {
  const quantityScore = Math.min((memoryCount / target) * 100, 100);
  const qualityScore = avgConfidence;
  const totalScore = (quantityScore * 0.6) + (qualityScore * 0.4);
  return Math.round(Math.min(totalScore, 100));
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
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
      throw new Error('Not authenticated');
    }

    console.log(`Refreshing metadata for user: ${user.id}`);

    // Fetch all memories
    const { data: aiMemories } = await supabase
      .from('ai_memory')
      .select('memory_type, confidence_score, created_at')
      .eq('user_id', user.id);

    const { data: diaryEntries } = await supabase
      .from('diary_entries')
      .select('tags, created_at')
      .eq('user_id', user.id);

    console.log(`Found ${aiMemories?.length || 0} AI memories and ${diaryEntries?.length || 0} diary entries`);

    // Calculate category progress
    const categoryProgress: Record<string, any> = {};
    const categoryMemories: Record<string, { count: number; totalConfidence: number }> = {};

    // Map ai_memory memory_type values to category IDs
    // memory_type stores values like "fact", "preference", "goal" which aren't category IDs
    // so we map them to a default category unless the memory_type IS a valid category ID
    const validCategoryIds = Object.keys(CATEGORY_TARGETS);
    
    aiMemories?.forEach((memory) => {
      const memType = memory.memory_type || 'personal-identity';
      const category = validCategoryIds.includes(memType) ? memType : 'personal-identity';
      if (!categoryMemories[category]) {
        categoryMemories[category] = { count: 0, totalConfidence: 0 };
      }
      categoryMemories[category].count++;
      categoryMemories[category].totalConfidence += memory.confidence_score || 50;
    });

    // Parse diary entry tags to extract categories
    diaryEntries?.forEach((entry) => {
      const categoryTag = entry.tags?.find(
        (tag: string) => tag !== 'diary' && tag !== 'voice' && tag !== 'photo'
      ) || 'personal-identity';

      if (!categoryMemories[categoryTag]) {
        categoryMemories[categoryTag] = { count: 0, totalConfidence: 0 };
      }
      categoryMemories[categoryTag].count++;
      categoryMemories[categoryTag].totalConfidence += 50;
    });

    // Calculate progress for each category
    Object.keys(CATEGORY_TARGETS).forEach((category) => {
      const memories = categoryMemories[category] || { count: 0, totalConfidence: 0 };
      const avgConfidence = memories.count > 0 
        ? memories.totalConfidence / memories.count 
        : 0;

      categoryProgress[category] = {
        category,
        progress: calculateCategoryProgress(
          memories.count,
          avgConfidence,
          CATEGORY_TARGETS[category]
        ),
        memoryCount: memories.count,
        avgConfidence: Math.round(avgConfidence),
        lastUpdated: new Date().toISOString(),
      };
    });

    console.log('Category progress calculated:', categoryProgress);

    // Update metadata
    const { data, error } = await supabase
      .from('user_memory_metadata')
      .upsert({
        user_id: user.id,
        category_progress: categoryProgress,
        total_memories_count: (aiMemories?.length || 0) + (diaryEntries?.length || 0),
        last_ai_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating metadata:', error);
      throw error;
    }

    console.log('Metadata refreshed successfully');

    return new Response(
      JSON.stringify({ success: true, metadata: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in refresh-memory-metadata:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
