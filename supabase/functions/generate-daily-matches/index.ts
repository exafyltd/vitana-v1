import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Vitana Index pillars (the richest real signal we have for the community) ──
// `short` is the locale-independent pillar code stored in the reason payload;
// the frontend maps it to a localized display name at render time.
const PILLARS = [
  { key: 'score_sleep', short: 'sleep' },
  { key: 'score_nutrition', short: 'nutrition' },
  { key: 'score_exercise', short: 'exercise' },
  { key: 'score_hydration', short: 'hydration' },
  { key: 'score_mental', short: 'mental' },
] as const;

// The daily_matches.match_reasons column is a jsonb array consumed by three
// frontend surfaces (MatchesPage, PeopleDiscoveryHero, MatchesPreview). Per the
// i18n hard rule ("backend-supplied UI text ships {key, params}, never raw
// strings"), we store *structured* reason objects — a stable `code` plus any
// params — and let the frontend localize them at RENDER time against the active
// UI language. This fixes reasons being frozen in whatever language they were
// generated in (the bug where a German user saw English match descriptions).
// This function does not call an LLM, so the LLM-locale wrapper rule does not
// apply.
type ReasonObj = { code: string; params?: Record<string, string | number> };

interface ScoreRow {
  user_id: string;
  score_total: number | null;
  score_sleep: number | null;
  score_nutrition: number | null;
  score_exercise: number | null;
  score_hydration: number | null;
  score_mental: number | null;
}

// Deterministic 0..4 tie-breaker derived from the user pair, so identical
// signal-less candidates still get a stable, repeatable ordering (NOT random —
// the same pair always yields the same value, and it adds no fake reason text).
function pairJitter(a: string, b: string): number {
  let h = 0;
  const s = a + '|' + b;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 5;
}

function topPillar(row: ScoreRow | undefined): typeof PILLARS[number] | null {
  if (!row) return null;
  let best: typeof PILLARS[number] | null = null;
  let bestVal = -1;
  for (const p of PILLARS) {
    const v = Number(row[p.key] ?? 0);
    if (v > bestVal) {
      bestVal = v;
      best = p;
    }
  }
  return bestVal > 0 ? best : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Validate JWT using anon client with the user's token.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser();
    if (authError || !authUser) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = authUser.id;

    // Service role client for data operations.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating daily matches for user ${userId}`);

    const { data: meProfile } = await supabase
      .from('profiles')
      .select('location')
      .eq('user_id', userId)
      .maybeSingle();
    const myLocation = (meProfile?.location ?? '').trim().toLowerCase();

    // Candidate pool: only members who are actually viewable as a public profile
    // (global_community_profiles.is_visible = true). Profile resolution
    // (get_user_profile_by_identifier — used by both the matches list and the
    // detail page) requires a visible row, so matching against raw profiles
    // would create cards that open to "Benutzer nicht gefunden".
    const { data: visibleRows } = await supabase
      .from('global_community_profiles')
      .select('user_id')
      .eq('is_visible', true)
      .neq('user_id', userId);

    const visibleIds = (visibleRows ?? [])
      .map((r: { user_id: string }) => r.user_id)
      .filter(Boolean);

    if (visibleIds.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: 'No candidates found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Skip members the user has already acted on (connected / passed / super) so
    // we never re-suggest someone they've already decided on.
    const { data: actionedRows } = await supabase
      .from('daily_matches')
      .select('matched_user_id')
      .eq('user_id', userId)
      .not('action', 'is', null);
    const actioned = new Set(
      (actionedRows ?? []).map((r: { matched_user_id: string }) => r.matched_user_id),
    );

    const candidateIds = visibleIds.filter((id) => !actioned.has(id));
    if (candidateIds.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: 'No new candidates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: candidates } = await supabase
      .from('profiles')
      .select('user_id, display_name, full_name, avatar_url, bio, location')
      .in('user_id', candidateIds);

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: 'No candidates found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Real signal #1: Vitana Index (latest score row per user) ──
    const scoreUserIds = [userId, ...candidates.map((c) => c.user_id)];
    const { data: allScores } = await supabase
      .from('vitana_index_scores')
      .select('user_id, score_total, score_sleep, score_nutrition, score_exercise, score_hydration, score_mental, date')
      .in('user_id', scoreUserIds)
      .order('date', { ascending: false });

    const latestScore = new Map<string, ScoreRow>();
    for (const row of (allScores ?? []) as (ScoreRow & { date: string })[]) {
      if (!latestScore.has(row.user_id)) latestScore.set(row.user_id, row);
    }
    const myScore = latestScore.get(userId);
    const myTopPillar = topPillar(myScore);

    // ── Real signal #2: network overlap (mutual connections) ──
    // People I follow + people who follow me = my network.
    const { data: myFollowing } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);
    const { data: myFollowers } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', userId);
    const myNetwork = new Set<string>([
      ...(myFollowing ?? []).map((r: { following_id: string }) => r.following_id),
      ...(myFollowers ?? []).map((r: { follower_id: string }) => r.follower_id),
    ]);

    // Each candidate's network (only fetch when I actually have a network).
    const candidateNetwork = new Map<string, Set<string>>();
    if (myNetwork.size > 0) {
      const ids = candidates.map((c) => c.user_id);
      const { data: candFollowing } = await supabase
        .from('user_follows')
        .select('follower_id, following_id')
        .in('follower_id', ids);
      const { data: candFollowers } = await supabase
        .from('user_follows')
        .select('follower_id, following_id')
        .in('following_id', ids);
      for (const r of (candFollowing ?? []) as { follower_id: string; following_id: string }[]) {
        if (!candidateNetwork.has(r.follower_id)) candidateNetwork.set(r.follower_id, new Set());
        candidateNetwork.get(r.follower_id)!.add(r.following_id);
      }
      for (const r of (candFollowers ?? []) as { follower_id: string; following_id: string }[]) {
        if (!candidateNetwork.has(r.following_id)) candidateNetwork.set(r.following_id, new Set());
        candidateNetwork.get(r.following_id)!.add(r.follower_id);
      }
    }

    // ── Score every candidate (deterministic, explainable) ──
    const scored = candidates.map((candidate) => {
      let score = 50; // honest neutral base — everyone is a real community member
      const reasons: ReasonObj[] = [];

      const candScore = latestScore.get(candidate.user_id);

      // Shared top pillar → strong, specific signal.
      const candTop = topPillar(candScore);
      if (myTopPillar && candTop && myTopPillar.key === candTop.key) {
        score += 16;
        reasons.push({ code: 'shared_pillar', params: { pillar: myTopPillar.short } });
      }

      // Overall Index proximity → similar longevity stage.
      if (myScore?.score_total != null && candScore?.score_total != null) {
        const diff = Math.abs(Number(myScore.score_total) - Number(candScore.score_total));
        // Closer totals score higher; 0 diff → +18, fades to 0 by ~360 apart.
        const proximity = Math.max(0, 18 - Math.round(diff / 20));
        score += proximity;
        if (proximity >= 10) reasons.push({ code: 'similar_index' });
      }

      // Network overlap → mutual connections.
      const candNet = candidateNetwork.get(candidate.user_id);
      if (candNet && myNetwork.size > 0) {
        let mutual = 0;
        for (const id of candNet) if (myNetwork.has(id)) mutual++;
        if (mutual > 0) {
          score += Math.min(15, mutual * 5);
          reasons.push({ code: 'mutual_connections', params: { count: mutual } });
        }
      }

      // Same location.
      const candLoc = (candidate.location ?? '').trim().toLowerCase();
      if (myLocation && candLoc && myLocation === candLoc) {
        score += 10;
        reasons.push({ code: 'same_location', params: { location: (candidate.location ?? '').trim() } });
      }

      // Honest fallback so a card is never reasonless.
      if (reasons.length === 0) reasons.push({ code: 'active_member' });

      // Deterministic tie-breaker (no fake reason attached).
      score += pairJitter(userId, candidate.user_id);

      return {
        user_id: userId,
        matched_user_id: candidate.user_id,
        match_score: Math.max(0, Math.min(100, Math.round(score))),
        match_reasons: reasons,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    });

    scored.sort((a, b) => b.match_score - a.match_score);
    const topMatches = scored.slice(0, 10);

    // Replace only the un-actioned matches; keep the user's decision history.
    await supabase
      .from('daily_matches')
      .delete()
      .eq('user_id', userId)
      .is('action', null);

    const { error: insertError } = await supabase
      .from('daily_matches')
      .insert(topMatches);

    if (insertError) {
      console.error('Error inserting matches:', insertError);
      throw insertError;
    }

    console.log(`Generated ${topMatches.length} matches for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        matches_generated: topMatches.length,
        message: `Generated ${topMatches.length} daily matches`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error generating matches:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
