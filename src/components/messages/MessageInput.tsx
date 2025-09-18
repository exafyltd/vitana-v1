import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Smile, 
  Paperclip, 
  DollarSign, 
  Calendar,
  Heart,
  Zap,
  Clock,
  MapPin,
  X,
  FileText,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string, messageType?: string, contentData?: any, actionButtons?: any[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  placeholder = "Type a message...",
  disabled = false,
  className
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Typing indicator logic
  const handleTypingStart = () => {
    if (!isComposing && onTypingStart) {
      setIsComposing(true);
      onTypingStart();
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (onTypingStop) {
        onTypingStop();
      }
      setIsComposing(false);
    }, 3000);
  };

  const handleTypingStop = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isComposing && onTypingStop) {
      onTypingStop();
    }
    setIsComposing(false);
  };

  const handleSend = async () => {
    if ((!message.trim() && attachments.length === 0) || disabled || isUploading) return;
    
    handleTypingStop();
    
    if (attachments.length > 0) {
      // Handle file attachments
      setIsUploading(true);
      try {
        // For now, just send the message with attachment info
        // In a real implementation, you'd upload files to storage first
        onSendMessage(
          message.trim() || `Shared ${attachments.length} file(s)`,
          'attachment',
          { 
            files: attachments.map(f => ({ name: f.name, size: f.size, type: f.type })),
            text: message.trim()
          }
        );
        setAttachments([]);
      } catch (error) {
        toast({
          title: 'Upload Failed',
          description: 'Failed to upload attachments',
          variant: 'destructive'
        });
      } finally {
        setIsUploading(false);
      }
    } else {
      onSendMessage(message.trim());
    }
    
    setMessage('');
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file sizes (max 10MB per file)
    const oversizedFiles = files.filter(f => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: 'File too large',
        description: 'Files must be smaller than 10MB',
        variant: 'destructive'
      });
      return;
    }

    // Limit total attachments
    if (attachments.length + files.length > 5) {
      toast({
        title: 'Too many files',
        description: 'Maximum 5 attachments per message',
        variant: 'destructive'
      });
      return;
    }

    setAttachments(prev => [...prev, ...files]);
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendPaymentRequest = (amount: string, description: string) => {
    const paymentData = {
      amount: parseFloat(amount),
      description,
      currency: 'USD'
    };

    const actionButtons = [
      { label: 'Pay Now', variant: 'default', action: 'payment_accept', data: paymentData },
      { label: 'Decline', variant: 'outline', action: 'payment_decline' }
    ];

    onSendMessage(
      `Payment request: $${amount} - ${description}`,
      'payment_request',
      paymentData,
      actionButtons
    );
  };

  const sendCalendarInvite = (title: string, date: string) => {
    const eventData = {
      title,
      date,
      type: 'meeting'
    };

    const actionButtons = [
      { label: 'Accept', variant: 'default', action: 'calendar_accept', data: eventData },
      { label: 'Decline', variant: 'outline', action: 'calendar_decline' },
      { label: 'Maybe', variant: 'secondary', action: 'calendar_maybe' }
    ];

    onSendMessage(
      `Calendar invite: ${title} on ${date}`,
      'calendar_invite',
      eventData,
      actionButtons
    );
  };

  const quickReactions = ['❤️', '👍', '😊', '🎉', '💪', '🙏'];

  return (
    <div className={cn("flex items-end gap-2 p-4 bg-background border-t", className)}>
      {/* Quick Actions */}
      <div className="flex gap-1">
        {/* Payment Request */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
              <DollarSign className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <h4 className="font-medium">Send Payment Request</h4>
              <div className="space-y-2">
                <Textarea
                  placeholder="Amount (USD)"
                  id="payment-amount"
                />
                <Textarea
                  placeholder="What's this for?"
                  id="payment-description"
                />
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    const amount = (document.getElementById('payment-amount') as HTMLInputElement)?.value;
                    const description = (document.getElementById('payment-description') as HTMLInputElement)?.value;
                    if (amount && description) {
                      sendPaymentRequest(amount, description);
                    }
                  }}
                >
                  Send Request
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Calendar Invite */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
              <Calendar className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <h4 className="font-medium">Send Calendar Invite</h4>
              <div className="space-y-2">
                <Textarea
                  placeholder="Event title"
                  id="event-title"
                />
                <Textarea
                  placeholder="Date & Time"
                  id="event-date"
                />
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    const title = (document.getElementById('event-title') as HTMLInputElement)?.value;
                    const date = (document.getElementById('event-date') as HTMLInputElement)?.value;
                    if (title && date) {
                      sendCalendarInvite(title, new Date(date).toLocaleDateString());
                    }
                  }}
                >
                  Send Invite
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick Reactions */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
              <Smile className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Quick Reactions</h4>
              <div className="grid grid-cols-6 gap-1">
                {quickReactions.map((emoji, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-lg"
                    onClick={() => onSendMessage(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* File Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted p-2 rounded-lg max-w-xs"
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-end gap-2 relative">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 mb-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-[120px] pr-12 resize-none"
            rows={1}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSend}
            disabled={(!message.trim() && attachments.length === 0) || disabled || isUploading}
            className="absolute right-1 bottom-1 h-8 w-8 p-0"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;