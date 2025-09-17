import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Smile, 
  Paperclip, 
  DollarSign, 
  Calendar,
  Heart,
  Zap,
  Clock,
  MapPin
} from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string, messageType?: string, contentData?: any, actionButtons?: any[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  placeholder = "Type a message...",
  disabled = false,
  className
}) => {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    
    onSendMessage(message.trim());
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
                <Input
                  placeholder="Amount (USD)"
                  type="number"
                  id="payment-amount"
                />
                <Input
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
                <Input
                  placeholder="Event title"
                  id="event-title"
                />
                <Input
                  placeholder="Date & Time"
                  type="datetime-local"
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

      {/* Message Input */}
      <div className="flex-1 relative">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-12"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;