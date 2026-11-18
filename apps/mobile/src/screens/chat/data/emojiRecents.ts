/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the emoji
 * picker's recents (VTID-05202 / VTID-05315), native twin of the recents part
 * of web `src/components/ui/emoji-picker.tsx`: per member
 * (`vitana:emoji:recent:v1:<userId>`, AsyncStorage instead of localStorage),
 * most recent first, de-duplicated, at most 24, back-filled from the seed so
 * the tab always shows two rows of 8. A reaction moves its emoji to the front
 * too. If storage fails the list lives in memory for the session.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import reactionList from './reaction-emojis.json';
import { normalizeReactionEmoji } from './reactionEmoji';

export const RECENT_STORAGE_KEY = 'vitana:emoji:recent:v1';
export const RECENT_MAX = 24;
const SEED_CANDIDATES = ['😊', '👍', '❤️', '😂', '😮', '🙏', '🎉', '💪', '🔥', '😍', '🥰', '😎', '👏', '🙌', '💯', '✨'];
/** Seed entries are canonical and always in the supported set (see the parity test). */
export const RECENT_SEED: string[] = SEED_CANDIDATES.map((e) => normalizeReactionEmoji(e)).filter((e): e is string => e !== null);

/** The picker's categories: the shared supported set (reaction-emojis.json), web order. */
export const EMOJI_CATEGORIES = reactionList.categories as Record<CategoryName, readonly string[]>;
export type CategoryName = 'smileys' | 'people' | 'nature' | 'food' | 'activity' | 'travel' | 'objects';

export type EmojiCategory = 'recent' | keyof typeof EMOJI_CATEGORIES;
export const EMOJI_CATEGORY_KEYS: EmojiCategory[] = ['recent', ...(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>)];

export function recentEmojiKey(userId?: string | null): string {
  return userId ? `${RECENT_STORAGE_KEY}:${userId}` : RECENT_STORAGE_KEY;
}

const memory = new Map<string, string[]>();

export function withSeed(list: string[]): string[] {
  const merged = [...list];
  for (const e of RECENT_SEED) {
    if (merged.length >= 16) break;
    if (!merged.includes(e)) merged.push(e);
  }
  return merged.slice(0, RECENT_MAX);
}

async function loadOwn(userId?: string | null): Promise<string[]> {
  const key = recentEmojiKey(userId);
  const remembered = memory.get(key);
  if (remembered) return remembered;
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(parsed)) return [];
    const canon = parsed
      .filter((e): e is string => typeof e === 'string')
      .map((e) => normalizeReactionEmoji(e))
      .filter((e): e is string => e !== null);
    return [...new Set(canon)];
  } catch {
    return [];
  }
}

export async function loadRecentEmojis(userId?: string | null): Promise<string[]> {
  const own = await loadOwn(userId);
  return own.length === 0 ? [...RECENT_SEED] : withSeed(own);
}

export async function recordRecentEmoji(emoji: string, userId?: string | null): Promise<string[]> {
  const key = recentEmojiKey(userId);
  const canonical = normalizeReactionEmoji(emoji);
  if (!canonical) return withSeed(await loadOwn(userId));
  const own = [canonical, ...(await loadOwn(userId)).filter((e) => e !== canonical)].slice(0, RECENT_MAX);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(own));
    memory.delete(key);
  } catch {
    memory.set(key, own);
  }
  return withSeed(own);
}

export function __resetRecentEmojiMemoryForTests(): void {
  memory.clear();
}
