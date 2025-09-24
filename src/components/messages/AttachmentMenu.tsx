import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import WalletIntegratedSendFunds from '@/components/payment/WalletIntegratedSendFunds';
import WalletIntegratedPaymentRequest from '@/components/payment/WalletIntegratedPaymentRequest';
import GlobalSendFunds from '@/components/payment/GlobalSendFunds';
import GlobalPaymentRequest from '@/components/payment/GlobalPaymentRequest';
import { 
  Paperclip, 
  DollarSign, 
  Calendar, 
  FileText,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentMenuProps {
  onFileAttach: () => void;
  onSendMessage: (content: string, messageType?: string, contentData?: any) => Promise<void>;
  onCalendarInvite: (title: string, date: string) => void;
  recipient?: {
    id: string;
    name: string;
    avatar?: string;
  };
  recipientIdHint?: string | null;
  disabled?: boolean;
  className?: string;
}


function CalendarDialog({ onCalendarInvite }: { onCalendarInvite: (title: string, date: string) => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && date) {
      onCalendarInvite(title, date);
      setTitle('');
      setDate('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start h-10 px-3"
        >
          <Calendar className="w-5 h-5 mr-3 text-blue-500" />
          <span className="text-sm">Send Calendar Invite</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Calendar Invite</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              required
            />
          </div>
          <div>
            <Label htmlFor="date">Date & Time</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Send Calendar Invite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AttachmentMenu({
  onFileAttach,
  onSendMessage,
  onCalendarInvite,
  recipient,
  recipientIdHint,
  disabled = false,
  className
}: AttachmentMenuProps) {
  const [showSendFunds, setShowSendFunds] = useState(false);
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [showGlobalSendFunds, setShowGlobalSendFunds] = useState(false);
  const [showGlobalPaymentRequest, setShowGlobalPaymentRequest] = useState(false);

  // Create effective recipient for direct conversations
  const effectiveRecipient = recipient || (recipientIdHint ? {
    id: recipientIdHint,
    name: 'Conversation Partner',
    avatar: undefined
  } : undefined);

  console.log('AttachmentMenu render:', { recipient, recipientIdHint, effectiveRecipient });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          className={cn(
            "w-8 h-8 p-0 rounded-full hover:bg-muted",
            className
          )}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="start"
        className="w-56 p-2 bg-background/95 backdrop-blur-sm border border-border shadow-lg"
      >
        <div className="grid gap-1">
          {/* Send Funds - Always Enabled */}
          <Button
            variant="ghost"
            className="w-full justify-start h-10 px-3 bg-gradient-to-r from-green-50/50 to-emerald-50/50 hover:from-green-100/50 hover:to-emerald-100/50 border border-green-200/30"
            onClick={() => {
              console.log('AttachmentMenu: Send Funds clicked', { recipient, recipientIdHint, effectiveRecipient });
              if (effectiveRecipient) {
                console.log('AttachmentMenu: Using recipient-specific send funds');
                setShowSendFunds(true);
              } else {
                console.log('AttachmentMenu: Using global send funds');
                setShowGlobalSendFunds(true);
              }
            }}
            title="Send funds to anyone"
          >
            <Send className="w-5 h-5 mr-3 text-green-600" />
            <span className="text-sm font-medium">Send Funds</span>
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start h-10 px-3"
            onClick={() => {
              console.log('AttachmentMenu: Request Payment clicked', { recipient, recipientIdHint, effectiveRecipient });
              if (effectiveRecipient) {
                console.log('AttachmentMenu: Using recipient-specific payment request');
                setShowPaymentRequest(true);
              } else {
                console.log('AttachmentMenu: Using global payment request');
                setShowGlobalPaymentRequest(true);
              }
            }}
            title="Request payment from anyone"
          >
            <DollarSign className="w-5 h-5 mr-3 text-green-500" />
            <span className="text-sm">Request Payment</span>
          </Button>
          
          <CalendarDialog onCalendarInvite={onCalendarInvite} />
          
          <Button
            variant="ghost"
            className="w-full justify-start h-10 px-3"
            onClick={onFileAttach}
          >
            <FileText className="w-5 h-5 mr-3 text-purple-500" />
            <span className="text-sm">Attach File</span>
          </Button>
        </div>
        
        {/* Wallet Integration Dialogs */}
        {effectiveRecipient && (
          <>
            <WalletIntegratedSendFunds
              isOpen={showSendFunds}
              onClose={() => setShowSendFunds(false)}
              onSendMessage={onSendMessage}
              recipient={effectiveRecipient}
            />
            <WalletIntegratedPaymentRequest
              isOpen={showPaymentRequest}
              onClose={() => setShowPaymentRequest(false)}
              onSendMessage={onSendMessage}
              recipient={effectiveRecipient}
            />
          </>
        )}
        
        {/* Global Payment Dialogs */}
        <GlobalSendFunds
          isOpen={showGlobalSendFunds}
          onClose={() => setShowGlobalSendFunds(false)}
          onSendMessage={onSendMessage}
          preSelectedRecipient={effectiveRecipient}
        />
        <GlobalPaymentRequest
          isOpen={showGlobalPaymentRequest}
          onClose={() => setShowGlobalPaymentRequest(false)}
          onSendMessage={onSendMessage}
          preSelectedRecipient={effectiveRecipient}
        />
      </PopoverContent>
    </Popover>
  );
}