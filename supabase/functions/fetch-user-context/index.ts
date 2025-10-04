import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserContext {
  identity: {
    userId: string;
    displayName: string;
    handle: string;
    email: string;
    tenantId: string;
    tenantName: string;
    roles: string[];
    membershipTier?: string;
  };
  temporal: {
    currentTime: string;
    currentHour: number;
    dayOfWeek: string;
    timezone: string;
    upcomingEvents: Array<{
      title: string;
      start: string;
      end?: string;
      type: string;
    }>;
  };
  social: {
    recentMessages: Array<{
      from: string;
      content: string;
      timestamp: string;
    }>;
    unreadCount: number;
    activeThreads: number;
    recentInteractions: string[];
  };
  economic: {
    balances: {
      USD: number;
      VTN: number;
      CREDITS: number;
    };
    recentTransactions: Array<{
      type: string;
      amount: number;
      currency: string;
      timestamp: string;
    }>;
    pendingPayments: number;
  };
  health: {
    vitanaIndex?: number;
    vitanaPercentile?: number;
    recentDiaryEntries: Array<{
      text: string;
      tags: string[];
      duration?: number;
      timestamp: string;
    }>;
    goals: string[];
    recentActivities: string[];
    healthMetrics: Record<string, any>;
  };
  memory: {
    recentConversations: Array<{
      id: string;
      agentType: string;
      lastMessage: string;
      timestamp: string;
    }>;
    rememberedInsights: Array<{
      type: string;
      content: string;
      confidence: number;
      timestamp: string;
    }>;
    learnedPreferences: Record<string, any>;
    patterns: Array<{
      type: string;
      description: string;
      frequency: string;
    }>;
    actionHistory: Array<{
      title: string;
      status: string;
      category: string;
      timestamp: string;
    }>;
  };
  metadata: {
    cachedAt: string;
    dataFreshness: string;
  };
}

async function fetchUserContext(supabase: any, userId: string): Promise<UserContext> {
  const now = new Date();
  
  // Parallel data fetching for performance
  const [
    profileData,
    walletsData,
    calendarData,
    messagesData,
    diaryData,
    memoryData,
    conversationsData,
    actionsData,
    tenantData
  ] = await Promise.all([
    // Profile
    supabase.from('profiles').select('*').eq('user_id', userId).single(),
    
    // Wallets
    supabase.from('user_wallets').select('*').eq('user_id', userId),
    
    // Calendar (next 7 days)
    supabase.from('calendar_events')
      .select('title, start_time, end_time, event_type')
      .eq('user_id', userId)
      .gte('start_time', now.toISOString())
      .lte('start_time', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: true })
      .limit(10),
    
    // Recent messages (last 24 hours)
    supabase.from('messages')
      .select('sender_id, body, created_at, profiles!messages_sender_id_fkey(display_name)')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20),
    
    // Recent diary entries (last 7 days)
    supabase.from('diary_entries')
      .select('text, tags, duration, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    
    // AI Memory (active insights)
    supabase.from('ai_memory')
      .select('memory_type, content, confidence_score, created_at, metadata')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('confidence_score', { ascending: false })
      .limit(20),
    
    // Recent conversations (last 7 days)
    supabase.from('ai_conversations')
      .select('id, agent_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    
    // Autopilot action history (last 30 days)
    supabase.from('autopilot_actions')
      .select('title, status, category, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20),
    
    // Tenant info
    supabase.from('tenants')
      .select('id, name, slug')
      .eq('id', profileData?.data?.tenant_id)
      .single()
  ]);

  const profile = profileData.data || {};
  const wallets = walletsData.data || [];
  const events = calendarData.data || [];
  const messages = messagesData.data || [];
  const diary = diaryData.data || [];
  const memory = memoryData.data || [];
  const conversations = conversationsData.data || [];
  const actions = actionsData.data || [];
  const tenant = tenantData.data || {};

  // Build context object
  const context: UserContext = {
    identity: {
      userId,
      displayName: profile.display_name || profile.full_name || 'User',
      handle: profile.handle || '',
      email: profile.email || '',
      tenantId: profile.tenant_id || '',
      tenantName: tenant.name || '',
      roles: [], // TODO: Fetch from role_preferences
      membershipTier: profile.membership_tier
    },
    temporal: {
      currentTime: now.toISOString(),
      currentHour: now.getHours(),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      upcomingEvents: events.map((e: any) => ({
        title: e.title,
        start: e.start_time,
        end: e.end_time,
        type: e.event_type
      }))
    },
    social: {
      recentMessages: messages.slice(0, 10).map((m: any) => ({
        from: m.profiles?.display_name || 'Unknown',
        content: m.body.substring(0, 100),
        timestamp: m.created_at
      })),
      unreadCount: messages.filter((m: any) => !m.read_at && m.sender_id !== userId).length,
      activeThreads: new Set(messages.map((m: any) => m.thread_id)).size,
      recentInteractions: []
    },
    economic: {
      balances: {
        USD: wallets.find((w: any) => w.currency_type === 'USD')?.balance || 0,
        VTN: wallets.find((w: any) => w.currency_type === 'VTN')?.balance || 0,
        CREDITS: wallets.find((w: any) => w.currency_type === 'CREDITS')?.balance || 0
      },
      recentTransactions: [],
      pendingPayments: 0
    },
    health: {
      vitanaIndex: undefined, // TODO: Calculate from health data
      vitanaPercentile: undefined,
      recentDiaryEntries: diary.map((d: any) => ({
        text: d.text,
        tags: d.tags || [],
        duration: d.duration,
        timestamp: d.created_at
      })),
      goals: [],
      recentActivities: [],
      healthMetrics: {}
    },
    memory: {
      recentConversations: conversations.map((c: any) => ({
        id: c.id,
        agentType: c.agent_type,
        lastMessage: '',
        timestamp: c.created_at
      })),
      rememberedInsights: memory
        .filter((m: any) => m.memory_type === 'insight')
        .map((m: any) => ({
          type: m.memory_type,
          content: m.content,
          confidence: m.confidence_score || 0,
          timestamp: m.created_at
        })),
      learnedPreferences: memory
        .filter((m: any) => m.memory_type === 'preference')
        .reduce((acc: any, m: any) => {
          acc[m.metadata?.key || 'unknown'] = m.content;
          return acc;
        }, {}),
      patterns: memory
        .filter((m: any) => m.memory_type === 'pattern')
        .map((m: any) => ({
          type: m.memory_type,
          description: m.content,
          frequency: m.metadata?.frequency || 'unknown'
        })),
      actionHistory: actions.map((a: any) => ({
        title: a.title,
        status: a.status,
        category: a.category,
        timestamp: a.created_at
      }))
    },
    metadata: {
      cachedAt: now.toISOString(),
      dataFreshness: '5min'
    }
  };

  return context;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check cache first
    const { data: cachedContext } = await supabaseClient
      .from('user_context_cache')
      .select('context_data, expires_at')
      .eq('user_id', user.id)
      .single();

    if (cachedContext && new Date(cachedContext.expires_at) > new Date()) {
      console.log('Returning cached context for user:', user.id);
      return new Response(
        JSON.stringify({ 
          context: cachedContext.context_data,
          cached: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh context
    console.log('Fetching fresh context for user:', user.id);
    const context = await fetchUserContext(supabaseClient, user.id);

    // Update cache
    await supabaseClient
      .from('user_context_cache')
      .upsert({
        user_id: user.id,
        context_data: context,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min cache
      });

    return new Response(
      JSON.stringify({ 
        context,
        cached: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching user context:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
