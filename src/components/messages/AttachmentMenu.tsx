import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Paperclip, 
  DollarSign, 
  Calendar, 
  FileText,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentMenuProps {
  onFileAttach: () => void;
  onPaymentRequest: (amount: string, description: string) => void;
  onCalendarInvite: (title: string, date: string) => void;
  onExchangeAndSend?: () => void;
  disabled?: boolean;
  className?: string;
}

function PaymentDialog({ onPaymentRequest }: { onPaymentRequest: (amount: string, description: string) => void }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && description) {
      onPaymentRequest(amount, description);
      setAmount('');
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
          <DollarSign className="w-5 h-5 mr-3 text-green-500" />
          <span className="text-sm">Request Payment</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this for?"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Send Payment Request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
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
  onPaymentRequest,
  onCalendarInvite,
  onExchangeAndSend,
  disabled = false,
  className
}: AttachmentMenuProps) {
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
          {/* Exchange & Send - Primary Action */}
          {onExchangeAndSend && (
            <Button
              variant="ghost"
              className="w-full justify-start h-10 px-3 bg-gradient-to-r from-purple-50/50 to-blue-50/50 hover:from-purple-100/50 hover:to-blue-100/50 border border-purple-200/30"
              onClick={onExchangeAndSend}
            >
              <Zap className="w-5 h-5 mr-3 text-purple-600" />
              <span className="text-sm font-medium">Exchange & Send</span>
            </Button>
          )}
          
          <PaymentDialog onPaymentRequest={onPaymentRequest} />
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
      </PopoverContent>
    </Popover>
  );
}