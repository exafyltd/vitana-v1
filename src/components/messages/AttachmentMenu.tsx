import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from '@/components/ui/responsive-popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import WalletIntegratedSendFunds from '@/components/payment/WalletIntegratedSendFunds';
import WalletIntegratedPaymentRequest from '@/components/payment/WalletIntegratedPaymentRequest';
import GlobalSendFunds from '@/components/payment/GlobalSendFunds';
import GlobalPaymentRequest from '@/components/payment/GlobalPaymentRequest';
import { usePopupCoordination } from '@/hooks/usePopupCoordination';
import { 
  Paperclip, 
  DollarSign, 
  Calendar, 
  FileText,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

interface AttachmentMenuProps {
  onFileAttach: () => void;
  onSendMessage: (content: string, messageType?: string, contentData?: any) => Promise<void>;
  onCalendarInvite: (title: string, date: string, time?: string, endTime?: string, location?: string, description?: string) => void;
  recipient?: {
    id: string;
    name?: string;
    avatar?: string;
  };
  recipientIdHint?: string | null;
  threadId?: string;
  disabled?: boolean;
  className?: string;
  conversationType?: 'direct' | 'group' | null;
}


function CalendarDialog({ onCalendarInvite }: { onCalendarInvite: (title: string, date: string, time?: string, endTime?: string, location?: string, description?: string) => void }) {
  const [title, setTitle] = useState('');
  const [datetime, setDatetime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && datetime) {
      // Parse datetime-local string (YYYY-MM-DDTHH:mm)
      const [datePart, timePart] = datetime.split('T');
      
      // Calculate end time (60 minutes later) based on selected datetime
      const [hours, minutes] = timePart.split(':').map(Number);
      const [year, month, day] = datePart.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day, hours, minutes + 60, 0, 0);
      const endTime = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;
      
      onCalendarInvite(title, datePart, timePart, endTime, location, description);
      setTitle('');
      setDatetime('');
      setLocation('');
      setDescription('');
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
          <span className="text-sm">{t('screens.messages.sendCalendarInvite')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('screens.messages.sendCalendarInvite')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">{t('screens.messages.eventTitle')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              required
            />
          </div>
          <div>
            <Label htmlFor="datetime">{t('screens.messages.dateTime')}</Label>
            <Input
              id="datetime"
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="location">{t('screens.messages.locationOptional')}</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Meeting location"
            />
          </div>
          <div>
            <Label htmlFor="description">{t('screens.messages.descriptionOptional')}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting description"
            />
          </div>
          <Button type="submit" className="w-full">
            {t('screens.messages.sendCalendarInvite')}
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
  threadId,
  disabled = false,
  className,
  conversationType
}: AttachmentMenuProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showSendFunds, setShowSendFunds] = useState(false);
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [showGlobalSendFunds, setShowGlobalSendFunds] = useState(false);
  const [showGlobalPaymentRequest, setShowGlobalPaymentRequest] = useState(false);
  
  const { requestPopup, clearPopup, isPopupActive } = usePopupCoordination();

  // Determine if this is a 1:1 conversation context (has recipient info)
  const hasRecipientContext = !!(
    recipient?.id || 
    recipientIdHint || 
    threadId
  );

  // For wallet components, use lenient validation - accept any ID with fallback name
  const walletRecipient = recipient?.id ? {
    id: recipient.id,
    name: recipient.name?.trim() || 'User',
    avatar: recipient.avatar
  } : null;

  console.log('💰 AttachmentMenu walletRecipient:', { recipient, walletRecipient, hasRecipientContext });
  return (
    <ResponsivePopover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <ResponsivePopoverTrigger asChild>
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
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent 
        title={t('screens.messages.attach')}
        side="top" 
        align="start"
        className="w-56 p-2 bg-background/95 backdrop-blur-sm border border-border shadow-lg"
      >
        <div className="grid gap-1">
          {/* Send Funds */}
          <Button
            variant="ghost"
            className="w-full justify-start h-10 px-3 bg-gradient-to-r from-green-50/50 to-emerald-50/50 hover:from-green-100/50 hover:to-emerald-100/50 border border-green-200/30"
            onClick={() => {
              if (conversationType === 'direct') {
                // Direct chat: ALWAYS use integrated popup, never global
                if (walletRecipient) {
                  requestPopup('wallet-integrated', { recipient: walletRecipient });
                  setShowSendFunds(true);
                }
              } else {
                // Group chat or no context: use global popup
                setShowGlobalSendFunds(true);
              }
            }}
            title="Send funds"
          >
            <Send className="w-5 h-5 mr-3 text-green-600" />
            <span className="text-sm font-medium">{t('screens.messages.sendFunds')}</span>
          </Button>
          
          {/* Request Payment */}
          <Button
            variant="ghost"
            className="w-full justify-start h-10 px-3"
            onClick={() => {
              if (conversationType === 'direct') {
                // Direct chat: ALWAYS use integrated popup, never global
                if (walletRecipient) {
                  requestPopup('wallet-integrated', { recipient: walletRecipient });
                  setShowPaymentRequest(true);
                }
              } else {
                // Group chat or no context: use global popup
                setShowGlobalPaymentRequest(true);
              }
            }}
            title="Request payment"
          >
            <DollarSign className="w-5 h-5 mr-3 text-green-500" />
            <span className="text-sm">{t('screens.messages.requestPayment')}</span>
          </Button>
          
          <CalendarDialog onCalendarInvite={onCalendarInvite} />
          
          <Button
            variant="ghost"
            className="w-full justify-start h-10 px-3"
            onClick={() => {
              setPopoverOpen(false);
              onFileAttach();
            }}
          >
            <FileText className="w-5 h-5 mr-3 text-purple-500" />
            <span className="text-sm">{t('screens.messages.attachFile')}</span>
          </Button>
        </div>
        
        {/* Wallet Integration Dialogs - Show only with valid recipient */}
        {walletRecipient && (
          <>
            <WalletIntegratedSendFunds
              isOpen={showSendFunds}
              onClose={() => {
                setShowSendFunds(false);
                clearPopup('wallet-integrated');
              }}
              onSendMessage={onSendMessage}
              recipient={walletRecipient}
            />
            <WalletIntegratedPaymentRequest
              isOpen={showPaymentRequest}
              onClose={() => {
                setShowPaymentRequest(false);
                clearPopup('wallet-integrated');
              }}
              onSendMessage={onSendMessage}
              recipient={walletRecipient}
            />
          </>
        )}
        
        {/* Global Payment Dialogs */}
        <GlobalSendFunds
          isOpen={showGlobalSendFunds}
          onClose={() => setShowGlobalSendFunds(false)}
          onSendMessage={onSendMessage}
          preSelectedRecipient={walletRecipient}
        />
        <GlobalPaymentRequest
          isOpen={showGlobalPaymentRequest}
          onClose={() => setShowGlobalPaymentRequest(false)}
          onSendMessage={onSendMessage}
          preSelectedRecipient={walletRecipient}
        />
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}