import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useProfilePosts } from '@/hooks/useProfilePosts';
import { toast } from '@/hooks/use-toast';

interface MobileCreatePostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_CHARS = 500;

export function MobileCreatePostSheet({ open, onOpenChange }: MobileCreatePostSheetProps) {
  const [content, setContent] = useState('');
  const { translate } = useTranslation();
  const { createPost } = useProfilePosts();

  const handlePost = async () => {
    if (!content.trim()) return;
    try {
      await createPost.mutateAsync({ content: content.trim() });
      toast({ title: translate('profilePosts.posted', 'Posted!') });
      setContent('');
      onOpenChange(false);
    } catch {
      toast({ title: translate('profilePosts.error', 'Something went wrong'), variant: 'destructive' });
    }
  };

  const handleClose = () => {
    setContent('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>{translate('profilePosts.createPost', 'Create Post')}</SheetTitle>
          <SheetDescription>{translate('profilePosts.placeholder', "What's on your mind?")}</SheetDescription>
        </SheetHeader>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-semibold">{translate('profilePosts.createPost', 'Create Post')}</h2>
          <Button
            size="sm"
            disabled={!content.trim() || content.length > MAX_CHARS || createPost.isPending}
            onClick={handlePost}
            className="rounded-full"
          >
            {createPost.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                {translate('profilePosts.post', 'Post')}
              </>
            )}
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={translate('profilePosts.placeholder', "What's on your mind?")}
            className="min-h-[200px] border-0 resize-none text-base focus-visible:ring-0 bg-transparent p-0"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-end">
          <span className={`text-sm ${content.length > MAX_CHARS ? 'text-destructive' : 'text-muted-foreground'}`}>
            {content.length}/{MAX_CHARS}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
