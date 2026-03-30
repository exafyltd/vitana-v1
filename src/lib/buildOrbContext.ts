/**
 * Build a compact context string for ORB voice sessions.
 * Summarises identity, memory garden highlights, and recent diary entries
 * into a token-efficient block the gateway can digest as initial context.
 */

import { supabase } from '@/integrations/supabase/client';

export interface OrbContextSnapshot {
  contextString: string;
  itemCount: number;
}

export async function buildOrbContext(userId: string): Promise<OrbContextSnapshot> {
  const now = new Date();

  // Parallel fetches: profile, ai_memory (top 15), diary (last 10)
  const [profileRes, memoryRes, diaryRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, full_name, handle, date_of_birth')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('ai_memory')
      .select('memory_type, content, confidence_score')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('confidence_score', 0.7)
      .order('confidence_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('diary_entries')
      .select('text, tags, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const profile = profileRes.data;
  const memories = memoryRes.data || [];
  const diaries = diaryRes.data || [];

  const lines: string[] = [];

  // Identity
  const name = profile?.display_name || profile?.full_name || 'User';
  lines.push(`[USER CONTEXT — read silently, do NOT repeat verbatim]`);
  lines.push(`Name: ${name}${profile?.handle ? ` (@${profile.handle})` : ''}`);
  if (profile?.date_of_birth) {
    lines.push(`Born: ${profile.date_of_birth}`);
  }

  // Memory garden — filter out name-identity memories that conflict with profile
  const filteredMemories = memories.filter(m => {
    if (/\b(name is|called|goes by|known as|my name|i am|i'm)\b/i.test(m.content)) {
      if (name !== 'User' && !m.content.toLowerCase().includes(name.toLowerCase())) {
        console.log(`[ORB context] Filtered conflicting name memory: "${m.content}" (profile: ${name})`);
        return false;
      }
    }
    return true;
  });

  if (filteredMemories.length > 0) {
    lines.push('');
    lines.push('Known facts about this user:');
    for (const m of filteredMemories) {
      lines.push(`- [${m.memory_type}] ${m.content}`);
    }
  }

  // Recent diary
  if (diaries.length > 0) {
    lines.push('');
    lines.push('Recent diary entries:');
    for (const d of diaries) {
      const date = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const preview = (d.text || '').slice(0, 200);
      const tags = (d.tags || []).filter((t: string) => !['diary'].includes(t));
      const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
      lines.push(`- ${date}${tagStr}: ${preview}`);
    }
  }

  lines.push('');
  lines.push('Use this information naturally when relevant. Never say "according to your diary" — just know it.');

  const contextString = lines.join('\n');
  return {
    contextString,
    itemCount: filteredMemories.length + diaries.length,
  };
}
