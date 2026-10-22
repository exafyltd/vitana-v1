/**
 * VTID-05296 (N-W2 community-hub) — native twin of `useRealMatches.ts`, the
 * source behind `/me/matches` (web `MatchesPage.tsx`). Reads live `daily_matches`
 * and resolves each to its real profile via `get_user_profile_by_identifier`.
 * Same flow as the web hook, against the injected native Supabase client.
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';

export interface RealMatch {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  match_reason: string | null;
  compatibility_score: number;
}

interface DailyMatchRow {
  matched_user_id: string;
  match_score: number;
  match_reasons: unknown;
}

interface ResolvedProfile {
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
}

function firstReason(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const first = raw[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'code' in first) {
    const code = (first as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

/** Mirrors `useRealMatches` — live matches resolved to visible profiles only. */
export function useRealMatches(limit = 50) {
  return useQuery<RealMatch[]>({
    queryKey: ['real-matches', limit],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const fetchMatches = async (): Promise<{ rows: DailyMatchRow[]; hadError: boolean }> => {
        const { data, error } = await supabase
          .from('daily_matches')
          .select('matched_user_id, match_score, match_reasons')
          .eq('user_id', user.id)
          .gt('expires_at', new Date().toISOString())
          .is('action', null)
          .order('match_score', { ascending: false })
          .limit(limit);
        return { rows: ((data as DailyMatchRow[] | null) ?? []), hadError: !!error };
      };

      const firstRead = await fetchMatches();
      let matches = firstRead.rows;

      if (matches.length === 0 && !firstRead.hadError) {
        try {
          await supabase.functions.invoke('generate-daily-matches');
        } catch {
          // ignore — return no matches below
        }
        ({ rows: matches } = await fetchMatches());
      }

      if (matches.length === 0) return [];

      const profiles = await Promise.all(
        matches.map(async (m) => {
          const { data } = await supabase.rpc('get_user_profile_by_identifier', {
            identifier: m.matched_user_id,
          });
          return (data as ResolvedProfile[] | null)?.[0];
        }),
      );

      return matches
        .map((m, idx) => ({ m, profile: profiles[idx] }))
        .filter(({ profile }) => Boolean(profile))
        .map(({ m, profile }) => ({
          user_id: m.matched_user_id,
          display_name: profile?.display_name || profile?.full_name || '',
          avatar_url: profile?.avatar_url ?? null,
          bio: profile?.bio ?? null,
          location: profile?.location ?? null,
          match_reason: firstReason(m.match_reasons),
          compatibility_score: Math.round(Number(m.match_score) || 0),
        }));
    },
  });
}
