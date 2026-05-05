import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  Reply, 
  Copy, 
  Forward, 
  Star, 
  Pin, 
  Trash2, 
  MousePointer2,
  Pencil,
  Plus
} from 'lucide-react';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { useIsMobile } from '@/hooks/use-mobile';
import { t } from '@/lib/i18n-toast';

interface MessageContextMenuProps {
  children: React.ReactNode;
  onReply?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onStar?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  onEdit?: () => void;
  onEmojiSelect?: (emoji: string) => void;
  isOwnMessage?: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏'];

export function MessageContextMenu({
  children,
  onReply,
  onCopy,
  onForward,
  onStar,
  onPin,
  onDelete,
  onSelect,
  onEdit,
  onEmojiSelect,
  isOwnMessage = false,
  isStarred = false,
  isPinned = false,
}: MessageContextMenuProps) {
  const { translate } = useTranslation();
  const isMobile = useIsMobile();
  
  const handleCopy = () => {
    onCopy?.();
  };

  // On mobile, skip Radix ContextMenu — long-press is handled by MessageBubble's Drawer
  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56 p-1">
        {onReply && (
          <ContextMenuItem onClick={onReply} className="flex items-center gap-2 px-3 py-2">
            <Reply className="w-4 h-4" />
            <span>Reply</span>
          </ContextMenuItem>
        )}
        
        {onCopy && (
          <ContextMenuItem onClick={handleCopy} className="flex items-center gap-2 px-3 py-2">
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </ContextMenuItem>
        )}
        
        {onForward && (
          <ContextMenuItem onClick={onForward} className="flex items-center gap-2 px-3 py-2">
            <Forward className="w-4 h-4" />
            <span>Forward</span>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />
        
        {onStar && (
          <ContextMenuItem onClick={onStar} className="flex items-center gap-2 px-3 py-2">
            <Star className={cn("w-4 h-4", isStarred && "fill-current text-yellow-500")} />
            <span>{isStarred ? 'Unstar' : 'Star'}</span>
          </ContextMenuItem>
        )}
        
        {onPin && (
          <ContextMenuItem onClick={onPin} className="flex items-center gap-2 px-3 py-2">
            <Pin className={cn("w-4 h-4", isPinned && "fill-current text-primary")} />
            <span>{isPinned ? 'Unpin' : 'Pin'}</span>
          </ContextMenuItem>
        )}
        
        {onSelect && (
          <ContextMenuItem onClick={onSelect} className="flex items-center gap-2 px-3 py-2">
            <MousePointer2 className="w-4 h-4" />
            <span>Select</span>
          </ContextMenuItem>
        )}
        
        {isOwnMessage && onEdit && (
          <ContextMenuItem onClick={onEdit} className="flex items-center gap-2 px-3 py-2">
            <Pencil className="w-4 h-4" />
            <span>Edit</span>
          </ContextMenuItem>
        )}

        {isOwnMessage && onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={onDelete} 
              className="flex items-center gap-2 px-3 py-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('screens.messages.deleteForMe')}</span>
            </ContextMenuItem>
          </>
        )}

        {onEmojiSelect && (
          <>
            <ContextMenuSeparator />
            <div className="px-1 py-1">
              <div className="text-xs font-medium text-muted-foreground mb-1 px-2">
                Quick reactions
              </div>
              <div className="flex gap-1 px-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <ContextMenuItem
                    key={emoji}
                    onSelect={() => onEmojiSelect(emoji)}
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-md p-0",
                      "text-lg hover:scale-110 transform transition-transform",
                      "cursor-pointer"
                    )}
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </ContextMenuItem>
                ))}
              </div>
            </div>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
