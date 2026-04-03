import { useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserProfile } from "@/types/profile";

interface MessageComposeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: UserProfile;
  onSend: (message: string) => Promise<void>;
}

export function MessageComposeModal({
  isOpen,
  onOpenChange,
  recipient,
  onSend,
}: MessageComposeModalProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage("");
      onOpenChange(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        overlayClassName="z-[60]"
        className="z-[60] sm:max-w-[520px] p-0 gap-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:rounded-3xl overflow-hidden"
      >
        <ResponsiveDialogHeader className="p-4 sm:p-6 sm:pb-4 border-b border-white/20 dark:border-gray-800/20">
          <ResponsiveDialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white/80 dark:border-gray-800/80 shadow-lg">
              <AvatarImage src={recipient.avatarUrl} alt={recipient.name} />
              <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] text-white font-semibold">
                {recipient.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-base font-semibold text-foreground">{recipient.name}</span>
              <span className="text-sm text-muted-foreground">@{recipient.handle}</span>
            </div>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="p-4 sm:p-6 space-y-4">
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px] sm:min-h-[140px] resize-none bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-white/40 dark:border-gray-700/40 rounded-2xl focus:ring-2 focus:ring-[hsl(var(--sys-vitana-accent))]/30 transition-all"
            autoFocus
          />
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-2 py-1 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 font-mono text-[10px]">⌘</kbd> + <kbd className="px-2 py-1 rounded-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 font-mono text-[10px]">↵</kbd> to send
          </p>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="p-4 sm:p-6 sm:pt-0 border-t sm:border-t-0 border-white/20 dark:border-gray-800/20">
          <div className="flex items-center justify-between w-full sm:w-auto sm:gap-2 sm:ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground transition-colors opacity-50 sm:hidden"
              disabled
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSending}
                className="rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border-white/40 dark:border-gray-700/40 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isSending}
                className="rounded-full bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] hover:from-[hsl(var(--sys-vitana-accent))]/90 hover:to-[hsl(var(--pill-nutrition-accent))]/90 shadow-[0_4px_16px_hsl(var(--sys-vitana-accent)/0.3)] hover:shadow-[0_6px_24px_hsl(var(--sys-vitana-accent)/0.4)] transition-all text-white border-0"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
