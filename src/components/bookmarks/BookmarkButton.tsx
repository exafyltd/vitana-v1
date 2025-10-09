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
        "w-8 h-10 flex items-center justify-center",
        "rounded-t-md",
        "backdrop-blur-sm transition-all duration-300",
        "hover:scale-110 hover:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2",
        bookmarked 
          ? "bg-yellow-400 border-2 border-yellow-500 shadow-md" 
          : "bg-white/80 border-2 border-gray-300 hover:border-yellow-300",
        isAnimating && "animate-bounce",
        className
      )}
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      title={bookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-start pt-2">
        <Bookmark
          className={cn(
            "h-4 w-4 transition-all duration-300",
            bookmarked 
              ? "fill-white text-white" 
              : "fill-none text-gray-600"
          )}
        />
        <div
          className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2",
            "w-0 h-0",
            "border-l-[16px] border-r-[16px] border-t-[8px]",
            "border-l-transparent border-r-transparent",
            "transition-colors duration-300",
            bookmarked ? "border-t-yellow-400" : "border-t-white/80"
          )}
        />
      </div>
    </button>
  );
}
