import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBookmarks } from '@/hooks/useBookmarks';
import { BookmarkButtonItem } from '@/types/bookmarks';

interface BookmarkButtonProps {
  item: BookmarkButtonItem;
  className?: string;
}

export function BookmarkButton({ item, className }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [isAnimating, setIsAnimating] = useState(false);
  
  const bookmarked = isBookmarked(item.item_type, item.item_id);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsAnimating(true);
    await toggleBookmark(item);
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "absolute top-2 right-2 z-10",
        "p-1.5 rounded-full",
        "transition-all duration-300",
        "hover:scale-125",
        "focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2",
        "drop-shadow-lg",
        isAnimating && "animate-bounce",
        className
      )}
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      title={bookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
    >
      <Bookmark
        className={cn(
          "h-6 w-6 transition-all duration-300",
          bookmarked 
            ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" 
            : "fill-none text-white stroke-[2.5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
        )}
      />
    </button>
  );
}
