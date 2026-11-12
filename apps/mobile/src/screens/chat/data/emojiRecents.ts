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

export const RECENT_STORAGE_KEY = 'vitana:emoji:recent:v1';
export const RECENT_MAX = 24;
export const RECENT_SEED = ['😊', '👍', '❤', '😂', '😮', '🙏', '🎉', '💪', '🔥', '😍', '🥰', '😎', '👏', '🙌', '💯', '✨'];

/** The web picker's categories, in its order (emoji-picker.tsx EMOJI_CATEGORIES). */
export const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘'],
  people: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👍', '👎', '👶', '👦', '👧', '👨', '👩', '👴', '👵', '🧑', '👮', '👷', '💂', '🕵', '👩⚕', '👩🎓', '👩💻', '🙋', '🙅', '🙆', '💁', '🙇', '🤷', '🤦', '💆', '💇', '🧖', '👫', '👬', '👭', '👪', '👀', '👁', '👃', '👂', '👄', '💀', '🧠', '💪', '🦵', '🦶'],
  nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🍀', '🍁', '🍂', '🌾', '🌵', '☀', '🌙', '⭐', '🌈', '☁', '⛅', '🌊', '❄', '🔥', '💧'],
  food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥'],
  activity: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏'],
  travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍', '🛵'],
  objects: ['⌚', '📱', '📲', '💻', '⌨', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼'],
} as const;

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
    return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === 'string') : [];
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
  const own = [emoji, ...(await loadOwn(userId)).filter((e) => e !== emoji)].slice(0, RECENT_MAX);
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
