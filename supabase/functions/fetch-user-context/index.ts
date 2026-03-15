import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// OPTIMIZATION: In-memory cache with 5-minute TTL
const contextCache = new Map<string, { data: any, expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
    birthDate?: string;
    ageYears?: number;
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
      VTNA: number;
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
  community: {
    upcomingEvents: Array<{
      id: string;
      title: string;
      description?: string;
      type: string;
      startTime: string;
      endTime?: string;
      location?: string;
      virtualLink?: string;
      participantCount: number;
      maxParticipants?: number;
      isParticipating: boolean;
      createdBy: string;
      category?: string;
      imageUrl?: string;
    }>;
    myRegisteredEvents: Array<{
      id: string;
      title: string;
      participantCount: number;
      startTime: string;
      status: string;
    }>;
    joinedGroups: Array<{
      id: string;
      name: string;
      description?: string;
      category: string;
      memberCount: number;
      role: string;
      isPublic: boolean;
    }>;
    activeMatches: Array<{
      userId: string;
      displayName: string;
      avatarUrl?: string;
      compatibilityScore: number;
      matchReason: string;
      conversationStarted: boolean;
      sharedInterests: string[];
    }>;
    following: number;
    followers: number;
    userInterests: string[];
    userLocation?: string;
    profileVisibility: boolean;
    recentActivity: Array<{
      type: string;
      title: string;
      timestamp: string;
    }>;
  };
    metadata: {
      cachedAt: string;
      dataFreshness: string;
    };
    memoryStats?: {
      aiCount: number;
      diaryCount: number;
      totalCount: number;
      aiByType: Record<string, number>;
      diaryByTag: Record<string, number>;
      updatedAt: string;
    };
    memoryHeaders?: {
      aiHeaders: Array<{id: string; type: string; confidence: number; created_at: string; preview: string}>;
      diaryHeaders: Array<{id: string; created_at: string; tags: string[]; preview: string}>;
      catalogTruncated: boolean;
    };
  }

async function fetchUserContext(supabase: any, userId: string): Promise<UserContext> {
  const now = new Date();
  
  // First fetch profile to get tenant_id
  const profileData = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  const profile = profileData.data || {};

  // Now fetch tenant and other data in parallel
  const [
    walletsData,
    calendarData,
    messagesData,
    diaryData,
    memoryData,
    aiMemoryHighConfDataResult,
    allAiMemoryData,
    allDiaryEntriesData,
    conversationsData,
    actionsData,
    tenantData,
    communityEventsData,
    myEventParticipationsData,
    myGroupMembershipsData,
    userMatchesData,
    communityProfileData,
    followCountsData,
    recentInteractionsData,
    walletTransactionsData,
    exchangeRatesData
  ] = await Promise.all([
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
    
    // High-confidence AI Memory for snapshot (≥70% confidence)
    supabase.from('ai_memory')
      .select('id, content, memory_type, confidence_score, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('confidence_score', 0.7)
      .order('confidence_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
    
    // ALL AI Memory for catalog (active only)
    supabase.from('ai_memory')
      .select('id, memory_type, content, confidence_score, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    
    // ALL Diary Entries for catalog
    supabase.from('diary_entries')
      .select('id, text, tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    
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
    
    // Tenant info (using profile.tenant_id)
    profile.tenant_id 
      ? supabase.from('tenants').select('id, name, slug').eq('id', profile.tenant_id).single()
      : Promise.resolve({ data: null }),
    
    // === COMMUNITY DATA ===
    
    // Upcoming community events (next 30 days)
    supabase.from('global_community_events')
      .select('id, title, description, type, start_time, end_time, location, virtual_link, participant_count, max_participants, created_by, category, image_url, slug')
      .gte('start_time', now.toISOString())
      .lte('start_time', new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: true })
      .limit(20),
    
    // Events user is participating in
    supabase.from('global_event_participants')
      .select('event_id, status')
      .eq('user_id', userId)
      .in('status', ['confirmed', 'pending']),
    
    // Groups user has joined
    supabase.from('global_group_members')
      .select('group_id, role, is_active, global_community_groups(id, name, description, category, member_count, is_public)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(50),
    
    // User matches (active)
    supabase.from('user_matches')
      .select('id, user_id_1, user_id_2, compatibility_score, match_reason, conversation_started, metadata')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .eq('is_active', true)
      .order('compatibility_score', { ascending: false })
      .limit(20),
    
    // User's global community profile
    supabase.from('global_community_profiles')
      .select('interests, location, is_visible')
      .eq('user_id', userId)
      .maybeSingle(),
    
    // Follow counts
    supabase.from('user_follow_counts')
      .select('followers_count, following_count')
      .eq('user_id', userId)
      .maybeSingle(),
    
    // Recent community interactions (last 30 days)
    supabase.from('user_match_interactions')
      .select('interaction_type, target_type, created_at, metadata')
      .eq('user_id', userId)
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(30),
    
    // Recent wallet transactions (last 30 days)
    supabase.from('wallet_transactions')
      .select('transaction_type, amount, from_currency, to_currency, status, created_at, metadata, from_user_id, to_user_id')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20),
    
    // Exchange rates
    supabase.from('exchange_rates')
      .select('from_currency, to_currency, rate, change_24h, trend')
      .eq('is_active', true)
      .limit(10)
  ]);

  const wallets = walletsData.data || [];
  const events = calendarData.data || [];
  const messages = messagesData.data || [];
  const diary = diaryData.data || [];
  const memory = memoryData.data || [];
  const memoryHighlights = aiMemoryHighConfDataResult.data || [];
  const allAiMemory = allAiMemoryData.data || [];
  const allDiaryEntries = allDiaryEntriesData.data || [];
  const conversations = conversationsData.data || [];
  const actions = actionsData.data || [];
  const tenant = tenantData.data || {};
  
  // === MEMORY STATS COMPUTATION ===
  const aiCount = allAiMemory.length;
  const diaryCount = allDiaryEntries.length;
  const totalCount = aiCount + diaryCount;
  
  // Group AI memory by type
  const aiByType: Record<string, number> = {};
  for (const mem of allAiMemory) {
    const type = mem.memory_type || 'unknown';
    aiByType[type] = (aiByType[type] || 0) + 1;
  }
  
  // Group diary entries by tag (best-effort)
  const diaryByTag: Record<string, number> = {};
  for (const entry of allDiaryEntries) {
    const tags = entry.tags || [];
    const meaningfulTag = tags.find((t: string) => !['diary', 'voice', 'photo'].includes(t.toLowerCase())) || 'diary';
    diaryByTag[meaningfulTag] = (diaryByTag[meaningfulTag] || 0) + 1;
  }
  
  const memoryStats = {
    aiCount,
    diaryCount,
    totalCount,
    aiByType,
    diaryByTag,
    updatedAt: now.toISOString()
  };
  
  console.info(`[context] memoryStats computed: total=${totalCount}, ai=${aiCount}, diary=${diaryCount}`);
  
  // === MEMORY CATALOG (compact headers) ===
  const aiHeaders = allAiMemory.map((m: any) => ({
    id: m.id,
    type: m.memory_type,
    confidence: m.confidence_score,
    created_at: m.created_at,
    preview: (m.content || '').slice(0, 160)
  }));
  
  // For diary, limit to most recent 500 if there are thousands
  const MAX_DIARY_HEADERS = 500;
  const diaryHeaders = allDiaryEntries.slice(0, MAX_DIARY_HEADERS).map((d: any) => ({
    id: d.id,
    created_at: d.created_at,
    tags: d.tags || [],
    preview: (d.text || '').slice(0, 160)
  }));
  
  const catalogTruncated = allDiaryEntries.length > MAX_DIARY_HEADERS;
  
  const memoryHeaders = {
    aiHeaders,
    diaryHeaders,
    catalogTruncated
  };
  
  console.info(`[context] memoryHeaders built: ai=${aiHeaders.length}, diary=${diaryHeaders.length}, truncated=${catalogTruncated}`);
  
  // Community data
  const communityEvents = communityEventsData.data || [];
  const myEventParticipations = myEventParticipationsData.data || [];
  const myGroupMemberships = myGroupMembershipsData.data || [];
  const userMatches = userMatchesData.data || [];
  const communityProfile = communityProfileData.data;
  const followCounts = followCountsData.data;
  const recentInteractions = recentInteractionsData.data || [];
  const walletTransactions = walletTransactionsData.data || [];
  const exchangeRates = exchangeRatesData.data || [];

  // Build set of event IDs user is participating in
  const participatingEventIds = new Set(
    myEventParticipations.map((p: any) => p.event_id)
  );

  // Get IDs of matched users to fetch their profiles
  const matchedUserIds = userMatches.map((m: any) => 
    m.user_id_1 === userId ? m.user_id_2 : m.user_id_1
  );

  // Fetch profiles for matched users (if any)
  let matchedProfiles: any[] = [];
  if (matchedUserIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('global_community_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', matchedUserIds);
    matchedProfiles = profilesData || [];
  }

  // Build context object - derive stable identity fields
  // Derive birthDate and ageYears from profile or memory insights
  const toISODate = (d: Date) => d.toISOString().slice(0, 10);
  const computeAge = (iso: string) => {
    const dob = new Date(iso);
    if (isNaN(dob.getTime())) return undefined;
    const diff = Date.now() - dob.getTime();
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return age >= 0 && age < 150 ? age : undefined;
  };
  let derivedBirthDate: string | undefined = profile.date_of_birth || undefined;
  if (!derivedBirthDate) {
    const birthdayMemory = memory.find((m: any) => typeof m.content === 'string' && /(birthday|born)/i.test(m.content));
    if (birthdayMemory) {
      const match = birthdayMemory.content.match(/(?:birthday\s*[:\-]?\s*)?([A-Za-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i);
      if (match) {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime())) {
          derivedBirthDate = toISODate(parsed);
          console.info('[context] Derived birthDate from memory:', derivedBirthDate);
        }
      }
    }
  }
  const derivedAgeYears = derivedBirthDate ? computeAge(derivedBirthDate) : undefined;

  const context: UserContext = {
    identity: {
      userId,
      displayName: profile.display_name || profile.full_name || 'User',
      handle: profile.handle || '',
      email: profile.email || '',
      tenantId: profile.tenant_id || '',
      tenantName: tenant.name || '',
      roles: [],
      membershipTier: profile.membership_tier,
      birthDate: derivedBirthDate,
      ageYears: derivedAgeYears
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
      recentTransactions: walletTransactions.map((tx: any) => ({
        type: tx.transaction_type,
        amount: tx.amount,
        currency: tx.from_currency || tx.to_currency,
        timestamp: tx.created_at,
        status: tx.status,
        isIncoming: tx.to_user_id === userId
      })),
      pendingPayments: walletTransactions.filter((tx: any) => tx.status === 'pending').length,
      exchangeRates: exchangeRates.map((rate: any) => ({
        from: rate.from_currency,
        to: rate.to_currency,
        rate: rate.rate,
        trend: rate.trend,
        change24h: rate.change_24h
      }))
    },
    health: {
      vitanaIndex: undefined,
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
      aiMemoryHighlights: memoryHighlights, // High-confidence facts for snapshot
      diaryEntriesRecent: diary, // Recent diary entries
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
    community: {
      upcomingEvents: communityEvents.map((e: any) => ({
        id: e.id,
        slug: e.slug,
        title: e.title,
        description: e.description,
        type: e.type,
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        virtualLink: e.virtual_link,
        participantCount: e.participant_count || 0,
        maxParticipants: e.max_participants,
        isParticipating: participatingEventIds.has(e.id),
        createdBy: e.created_by,
        category: e.category,
        imageUrl: e.image_url
      })),
      myRegisteredEvents: myEventParticipations
        .map((p: any) => {
          const event = communityEvents.find((e: any) => e.id === p.event_id);
          return event ? {
            id: event.id,
            slug: event.slug,
            title: event.title,
            participantCount: event.participant_count || 0,
            startTime: event.start_time,
            status: p.status
          } : null;
        })
        .filter((e: any) => e !== null),
      joinedGroups: myGroupMemberships
        .filter((m: any) => m.global_community_groups)
        .map((m: any) => ({
          id: m.global_community_groups.id,
          name: m.global_community_groups.name,
          description: m.global_community_groups.description,
          category: m.global_community_groups.category || 'general',
          memberCount: m.global_community_groups.member_count || 0,
          role: m.role || 'member',
          isPublic: m.global_community_groups.is_public
        })),
      activeMatches: userMatches.map((m: any) => {
        const otherUserId = m.user_id_1 === userId ? m.user_id_2 : m.user_id_1;
        const matchedProfile = matchedProfiles.find((p: any) => p.user_id === otherUserId);
        return {
          userId: otherUserId,
          displayName: matchedProfile?.display_name || 'Community Member',
          avatarUrl: matchedProfile?.avatar_url,
          compatibilityScore: m.compatibility_score || 0,
          matchReason: m.match_reason || 'Shared interests',
          conversationStarted: m.conversation_started || false,
          sharedInterests: m.metadata?.shared_interests || []
        };
      }),
      following: followCounts?.following_count || 0,
      followers: followCounts?.followers_count || 0,
      userInterests: communityProfile?.interests || [],
      userLocation: communityProfile?.location,
      profileVisibility: communityProfile?.is_visible !== false,
      recentActivity: recentInteractions.map((i: any) => ({
        type: i.interaction_type,
        title: i.metadata?.title || 'Community activity',
        timestamp: i.created_at
      }))
    },
    metadata: {
      cachedAt: now.toISOString(),
      dataFreshness: 'real-time'
    },
    memoryStats,
    memoryHeaders
  };

  return context;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get userId and forceRefresh from request body
    const body = await req.json();
    const userId = body.userId;
    const forceRefresh = body.forceRefresh || false;
    
    if (!userId) {
      // If no userId in body, try to get from auth header
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
      
      return await fetchAndReturnContext(user.id, forceRefresh);
    }
    
    // If userId provided, use it directly (from service role call)
    return await fetchAndReturnContext(userId, forceRefresh);

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

async function fetchAndReturnContext(userId: string, forceRefresh: boolean = false) {
  // OPTIMIZATION: Check in-memory cache first (fastest)
  if (!forceRefresh) {
    const memCached = contextCache.get(userId);
    if (memCached && memCached.expiresAt > Date.now()) {
      console.log('Returning in-memory cached context for user:', userId);
      return new Response(
        JSON.stringify({ 
          context: memCached.data,
          cached: true,
          cacheType: 'memory'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Check DB cache
  if (!forceRefresh) {
    const { data: cachedContext } = await supabaseClient
      .from('user_context_cache')
      .select('context_data, expires_at')
      .eq('user_id', userId)
      .single();

    if (cachedContext && new Date(cachedContext.expires_at) > new Date()) {
      console.log('Returning DB cached context for user:', userId);
      
      // Store in memory cache too
      contextCache.set(userId, {
        data: cachedContext.context_data,
        expiresAt: new Date(cachedContext.expires_at).getTime()
      });
      
      return new Response(
        JSON.stringify({ 
          context: cachedContext.context_data,
          cached: true,
          cacheType: 'database'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Fetch fresh context
  console.log('Fetching fresh context for user:', userId);
  const context = await fetchUserContext(supabaseClient, userId);

  // Store in memory cache
  contextCache.set(userId, {
    data: context,
    expiresAt: Date.now() + CACHE_TTL_MS
  });

  // Update DB cache (non-blocking)
  supabaseClient
    .from('user_context_cache')
    .upsert({
      user_id: userId,
      context_data: context,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString()
    })
    .then(() => console.log('DB cache updated'))
    .catch(err => console.error('Failed to update DB cache:', err));

  return new Response(
    JSON.stringify({ 
      context,
      cached: false 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
