import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Send, 
  Smile, 
  Mic, 
  X,
  AlertCircle,
  Paperclip
} from 'lucide-react';
import { AttachmentMenu } from './AttachmentMenu';
import { useRecipientData } from '@/hooks/useRecipientData';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

interface EnhancedMessageComposerProps {
  onSendMessage: (content: string, messageType?: string, contentData?: any) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  isOffline?: boolean;
  className?: string;
  recipientId?: string | null;
  threadId?: string;
}

const EnhancedMessageComposer: React.FC<EnhancedMessageComposerProps> = ({
  onSendMessage,
  placeholder = "Type a message...",
  disabled = false,
  isOffline = false,
  className,
  recipientId,
  threadId
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { recipient } = useRecipientData(recipientId, threadId);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && e.shiftKey) {
      // Show hint for first time users
      if (!showHint) {
        setShowHint(true);
        setTimeout(() => setShowHint(false), 3000);
      }
    }
  };

  const handleSend = useCallback(async () => {
    if (!message.trim() && attachments.length === 0) return;
    if (disabled || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message, 'text', { attachments });
      setMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [message, attachments, onSendMessage, disabled, isSending]);

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Convert FileList to Attachment objects
    // This is a simplified version - in practice you'd upload files first
    Array.from(files).forEach(file => {
      const attachment: Attachment = {
        id: Math.random().toString(36),
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
        size: file.size
      };
      setAttachments(prev => [...prev, attachment]);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const canSend = (message.trim() || attachments.length > 0) && !isSending && !disabled;

  return (
    <Card className={cn(
      "sticky bottom-0 border-x-0 border-b-0 rounded-none shadow-sm bg-card/95 backdrop-blur-sm",
      className
    )}>
      {/* Attachment Preview Strip */}
      {attachments.length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex gap-2 overflow-x-auto">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative flex-shrink-0 p-2 bg-muted rounded-lg border"
              >
                <div className="flex items-center gap-2 text-sm">
                  {attachment.type.startsWith('image/') ? (
                    <img 
                      src={attachment.url} 
                      alt={attachment.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                  <span className="max-w-20 truncate">{attachment.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => removeAttachment(attachment.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Offline Hint */}
        {isOffline && (
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>{t('screens.messages.queuedTapRetry')}</span>
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Left: Emoji button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-10 h-10 p-0 rounded-full hover:bg-muted flex-shrink-0"
                >
                  <Smile className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('screens.messages.addEmoji')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Middle: Attachment menu + Text input */}
          <div className="flex-1 relative flex items-end gap-2">
            {/* Attachment menu */}
            <div className="flex-shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <AttachmentMenu
                        onFileAttach={handleFileAttach}
                        onSendMessage={async (content, messageType, contentData) => {
                          await onSendMessage(content, messageType, contentData);
                        }}
                        onCalendarInvite={(title, date) => {
                          console.log('Calendar invite:', title, date);
                        }}
                        recipient={recipient}
                        recipientIdHint={recipientId}
                        threadId={threadId}
                        disabled={disabled}
                        className="hover:bg-muted"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Attach</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Text input */}
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className="min-h-[40px] max-h-32 resize-none rounded-2xl py-3 px-4"
                style={{ 
                  fieldSizing: 'content',
                  minHeight: '40px'
                } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Right: Send button or Mic */}
          {canSend ? (
            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="sm"
              className={cn(
                "w-10 h-10 rounded-full flex-shrink-0 transition-all duration-200",
                "bg-domain-messages-accent hover:bg-domain-messages-accent/90 text-white"
              )}
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="w-10 h-10 p-0 rounded-full hover:bg-muted flex-shrink-0"
                  >
                    <Mic className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('screens.messages.voiceMessage')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Keyboard hint */}
        {showHint && (
          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-lg animate-in fade-in slide-in-from-bottom-2">
            Press <kbd className="px-1 py-0.5 bg-background rounded text-xs">Enter</kbd> to send, 
            <kbd className="px-1 py-0.5 bg-background rounded text-xs ml-1">{t('screens.messages.shiftEnter')}</kbd> for new line
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx"
      />
    </Card>
  );
};

export default EnhancedMessageComposer;