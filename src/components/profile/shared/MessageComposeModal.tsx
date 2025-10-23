import { useState } from "react";
import { X, Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={recipient.avatarUrl} alt={recipient.name} />
              <AvatarFallback>
                {recipient.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-base font-semibold">{recipient.name}</span>
              <span className="text-sm text-muted-foreground">@{recipient.handle}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px] resize-none"
            autoFocus
          />

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              disabled
            >
              <Paperclip className="h-4 w-4" />
              <span className="text-xs">Attach (coming soon)</span>
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isSending}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1 py-0.5 rounded bg-muted">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded bg-muted">Enter</kbd> to send
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
