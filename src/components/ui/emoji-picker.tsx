import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthContext } from '@/context/AuthContext';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  className?: string;
}

// How many recents to keep (and show). grid-cols-8 → 16 fills exactly two
// rows, the minimum the design asks for; up to RECENT_MAX = 24 lets it grow
// to three rows before the oldest fall off.
//
// VTID-05315 (messenger-ux-v2/ui-emoji-recents): recents are per member —
// `vitana:emoji:recent:v1:<userId>` — so two members on one device never see
// each other's. The device-wide key of VTID-05202 is copied into the first
// signed-in member's list once and then removed; it stays the key when nobody
// is signed in. If storage fails, the list lives in memory for the session.
const RECENT_STORAGE_KEY = 'vitana:emoji:recent:v1';
const RECENT_MAX = 24;
// Seeded so the "recent" tab is never emptier than two rows for a new user.
const RECENT_SEED = [
  '😊', '👍', '❤️', '😂', '😮', '🙏', '🎉', '💪',
  '🔥', '😍', '🥰', '😎', '👏', '🙌', '💯', '✨',
];

export function recentEmojiKey(userId?: string | null): string {
  return userId ? `${RECENT_STORAGE_KEY}:${userId}` : RECENT_STORAGE_KEY;
}

/** Session copy, used when storage cannot be read or written. */
const memoryRecents = new Map<string, string[]>();
// Set once the device list was handed over, so later signed-out picks are
// never handed to another member.
const MIGRATED_KEY = `${RECENT_STORAGE_KEY}:migrated`;

/** Test-only: forget the session copies. */
export function __resetRecentEmojiMemoryForTests(): void {
  memoryRecents.clear();
}

function withSeed(list: string[]): string[] {
  // Backfill from the seed so the tab always shows at least two rows, even
  // if the user has only picked a couple of emojis so far.
  const merged = [...list];
  for (const e of RECENT_SEED) {
    if (merged.length >= 16) break;
    if (!merged.includes(e)) merged.push(e);
  }
  return merged.slice(0, RECENT_MAX);
}

function readStored(key: string): string[] | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  return parsed.filter((e): e is string => typeof e === 'string');
}

/** The member's own picks, most recent first (no seed). */
function loadOwnRecents(userId?: string | null): string[] {
  const key = recentEmojiKey(userId);
  // This session's picks are at least as new as storage (a write may have
  // failed, e.g. quota full), so the session copy wins when it exists.
  const remembered = memoryRecents.get(key);
  if (remembered) return remembered;
  try {
    let own = readStored(key);
    if (!own && userId && localStorage.getItem(MIGRATED_KEY) !== '1') {
      // Once per device: the device-wide list of VTID-05202 becomes the first
      // signed-in member's. Later signed-out picks stay on the device key.
      const legacy = readStored(RECENT_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(key, JSON.stringify(legacy.slice(0, RECENT_MAX)));
        localStorage.removeItem(RECENT_STORAGE_KEY);
        localStorage.setItem(MIGRATED_KEY, '1');
        own = legacy;
      }
    }
    return own ?? [];
  } catch {
    return [];
  }
}

export function loadRecentEmojis(userId?: string | null): string[] {
  const own = loadOwnRecents(userId);
  return own.length === 0 ? [...RECENT_SEED] : withSeed(own);
}

/** Records a pick and returns the new recents list (composer picker; exported for reaction paths). */
export function recordRecentEmoji(emoji: string, userId?: string | null): string[] {
  const key = recentEmojiKey(userId);
  // Most-recently-used first, de-duplicated — built from the member's own
  // picks, never from the seed.
  const own = [emoji, ...loadOwnRecents(userId).filter((e) => e !== emoji)].slice(0, RECENT_MAX);
  memoryRecents.set(key, own);
  try {
    localStorage.setItem(key, JSON.stringify(own));
  } catch {
    /* storage unavailable (private mode / quota) — kept in memory for this session */
  }
  return withSeed(own);
}

const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘'],
  people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👍', '👎', '👶', '👦', '👧', '👨', '👩', '👴', '👵', '🧑', '👮', '👷', '💂', '🕵️', '👩‍⚕️', '👩‍🎓', '👩‍💻', '🙋', '🙅', '🙆', '💁', '🙇', '🤷', '🤦', '💆', '💇', '🧖', '👫', '👬', '👭', '👪', '👀', '👁️', '👃', '👂', '👄', '💀', '🧠', '💪', '🦵', '🦶'],
  nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🍀', '🍁', '🍂', '🌾', '🌵', '☀️', '🌙', '⭐', '🌈', '☁️', '⛅', '🌊', '❄️', '🔥', '💧'],
  food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥'],
  activity: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏'],
  travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵'],
  objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼']
};

type CategoryKey = 'recent' | keyof typeof EMOJI_CATEGORIES;

export function EmojiPicker({ onEmojiSelect, trigger, className }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = React.useState<CategoryKey>('recent');
  // VTID-05315: the signed-in member, if any (no provider = nobody signed in).
  const userId = React.useContext(AuthContext)?.user?.id ?? null;
  const [recent, setRecent] = React.useState<string[]>(() => loadRecentEmojis(userId));
  React.useEffect(() => { setRecent(loadRecentEmojis(userId)); }, [userId]);

  // Re-read recents whenever the picker is opened, so a selection made in one
  // picker instance (e.g. the composer) is reflected the next time any picker
  // opens — not only after a reload.
  const refreshRecent = () => setRecent(loadRecentEmojis(userId));

  const categories: Record<CategoryKey, string[]> = {
    recent,
    ...EMOJI_CATEGORIES,
  };

  const handleEmojiClick = (emoji: string) => {
    setRecent(recordRecentEmoji(emoji, userId));
    onEmojiSelect(emoji);
  };

  const defaultTrigger = (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn("w-8 h-8 p-0 rounded-full hover:bg-muted", className)}
    >
      <Smile className="w-4 h-4" />
    </Button>
  );

  return (
    <Popover onOpenChange={(open) => { if (open) refreshRecent(); }}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="start"
        sideOffset={8}
        avoidCollisions={true}
        collisionPadding={8}
        className="z-[60] w-[min(320px,calc(100vw-2rem))] p-4 bg-background/95 backdrop-blur-sm border border-border shadow-lg"
      >
        <div className="space-y-3">
          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {(Object.keys(categories) as CategoryKey[]).map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "secondary" : "ghost"}
                size="sm"
                className="text-xs capitalize flex-shrink-0"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Emoji grid. grid-cols-8 → the recent tab shows at least two rows
              (16 recents, seeded) and grows to three before trimming. */}
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {categories[activeCategory].map((emoji, index) => (
              <Button
                key={`${emoji}-${index}`}
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 text-lg hover:bg-muted"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}