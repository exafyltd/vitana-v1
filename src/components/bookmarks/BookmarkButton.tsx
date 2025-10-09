import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBookmarks } from '@/hooks/useBookmarks';
import { BookmarkButtonItem } from '@/types/bookmarks';
import { Button } from '@/components/ui/button';

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
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        "absolute top-2 right-2 z-10",
        "transition-all duration-300",
        "hover:scale-110",
        isAnimating && "animate-bounce",
        className
      )}
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      title={bookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
    >
      <Bookmark
        className={cn(
          "h-5 w-5 transition-all duration-300",
          bookmarked 
            ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" 
            : "fill-none text-white stroke-[2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
        )}
      />
    </Button>
  );
}
