import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  className?: string;
}

// How many recents to keep (and show). grid-cols-8 → 16 fills exactly two
// rows, the minimum the design asks for; up to RECENT_MAX = 24 lets it grow
// to three rows before the oldest fall off.
const RECENT_STORAGE_KEY = 'vitana:emoji:recent:v1';
const RECENT_MAX = 24;
// Seeded so the "recent" tab is never emptier than two rows for a new user.
const RECENT_SEED = [
  '😊', '👍', '❤️', '😂', '😮', '🙏', '🎉', '💪',
  '🔥', '😍', '🥰', '😎', '👏', '🙌', '💯', '✨',
];

function loadRecentEmojis(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [...RECENT_SEED];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [...RECENT_SEED];
    const cleaned = parsed.filter((e): e is string => typeof e === 'string');
    // Backfill from the seed so the tab always shows at least two rows, even
    // if the user has only picked a couple of emojis so far.
    const merged = [...cleaned];
    for (const e of RECENT_SEED) {
      if (merged.length >= 16) break;
      if (!merged.includes(e)) merged.push(e);
    }
    return merged.slice(0, RECENT_MAX);
  } catch {
    return [...RECENT_SEED];
  }
}

function recordRecentEmoji(emoji: string): string[] {
  const current = loadRecentEmojis();
  // Most-recently-used first, de-duplicated.
  const next = [emoji, ...current.filter((e) => e !== emoji)].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode / quota) — recents just won't persist */
  }
  return next;
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
  const [recent, setRecent] = React.useState<string[]>(() => loadRecentEmojis());

  // Re-read recents whenever the picker is opened, so a selection made in one
  // picker instance (e.g. the composer) is reflected the next time any picker
  // opens — not only after a reload.
  const refreshRecent = () => setRecent(loadRecentEmojis());

  const categories: Record<CategoryKey, string[]> = {
    recent,
    ...EMOJI_CATEGORIES,
  };

  const handleEmojiClick = (emoji: string) => {
    setRecent(recordRecentEmoji(emoji));
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