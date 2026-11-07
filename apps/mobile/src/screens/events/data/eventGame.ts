/**
 * VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — the Maxina
 * event game's reads and join write, native twins of `src/hooks/useEventGame.ts`
 * (same tables, columns, RPC arguments, feature flag and the phase rule from
 * `useEventGamePhase`). The web hook imports the Supabase client, so it is
 * re-implemented here.
 */
import { getSupabase } from '../../../auth/client';

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = () => getSupabase() as any;

export interface EventGame {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rules_text: string | null;
  status: 'draft' | 'scheduled' | 'live' | 'ended' | 'archived';
  starts_at: string;
  ends_at: string;
  hero_image_url: string | null;
  winner_reward_text: string | null;
  winner_reward_description: string | null;
}

export type EventGamePhase = 'pre' | 'live' | 'ended';

export interface LeaderboardRow {
  user_id?: string;
  display_name?: string | null;
  score: number;
  rank?: number;
  post_count?: number;
}

/** Client-side phase from the timestamps (the database triggers use the same window). */
export function eventGamePhase(game: Pick<EventGame, 'starts_at' | 'ends_at'>, now: Date): EventGamePhase {
  if (now.getTime() < new Date(game.starts_at).getTime()) return 'pre';
  if (now.getTime() < new Date(game.ends_at).getTime()) return 'live';
  return 'ended';
}

/** A game by its public slug, or the current one (scheduled or live, soonest first). */
export async function fetchEventGame(slug?: string): Promise<EventGame | null> {
  const base = db().from('event_games').select('*');
  const query = slug ? base.eq('slug', slug) : base.in('status', ['scheduled', 'live']).order('starts_at', { ascending: true }).limit(1);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data as EventGame) ?? null;
}

export async function fetchJoinState(gameId: string, userId: string): Promise<boolean> {
  const { data, error } = await db().from('event_game_participants').select('id').eq('event_game_id', gameId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Joins the game; a repeat join hits the unique constraint (23505) and counts as joined. */
export async function joinEventGame(gameId: string, userId: string): Promise<void> {
  const { error } = await db().from('event_game_participants').insert({ event_game_id: gameId, user_id: userId });
  if (error && (error as { code?: string }).code !== '23505') throw error;
}

export async function fetchLeaderboard(gameId: string, limit = 100): Promise<LeaderboardRow[]> {
  const { data, error } = await db().rpc('get_event_game_leaderboard', { p_event_game_id: gameId, p_limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

/** `tenant_settings.feature_flags.enable_event_game`, read for the active tenant. */
export async function fetchEventGameFlag(tenantId: string): Promise<boolean> {
  const { data, error } = await db().from('tenant_settings').select('feature_flags').eq('tenant_id', tenantId).maybeSingle();
  if (error) throw error;
  return (data?.feature_flags as Record<string, unknown> | undefined)?.enable_event_game === true;
}
