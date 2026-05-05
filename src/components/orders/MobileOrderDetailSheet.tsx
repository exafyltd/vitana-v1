import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Download, 
  Mail, 
  X, 
  Calendar, 
  MapPin, 
  Ticket, 
  Gift,
  Package,
  Hash,
  Clock,
  Loader2,
  Check,
  Send
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { EventTicket } from '@/components/tickets/EventTicket';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDownloadVoucherPdf, useSendVoucherEmail } from '@/hooks/useVouchers';
import { UnifiedMobileOrder } from './MobileOrdersView';
import { useTranslation } from '@/hooks/useTranslation';
import { t } from '@/lib/i18n-toast';

interface MobileOrderDetailSheetProps {
  order: UnifiedMobileOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileOrderDetailSheet({ order, open, onOpenChange }: MobileOrderDetailSheetProps) {
  const { translate } = useTranslation();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  
  const downloadPdf = useDownloadVoucherPdf();
  const sendEmail = useSendVoucherEmail();

  if (!order) return null;

  // Status badge styling
  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      upcoming: 'default',
      active: 'default',
      paid: 'default',
      confirmed: 'default',
      shipped: 'default',
      attended: 'secondary',
      completed: 'secondary',
      delivered: 'secondary',
      redeemed: 'secondary',
      expired: 'outline',
      pending: 'outline',
      processing: 'outline',
      cancelled: 'destructive',
      refunded: 'destructive',
    };
    return variants[status] || 'outline';
  };

  // Get type icon
  const getTypeIcon = () => {
    switch (order.type) {
      case 'ticket': return <Ticket className="h-5 w-5" />;
      case 'voucher': return <Gift className="h-5 w-5" />;
      case 'product': return <Package className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  // Handle PDF download for vouchers - pure download action, NO navigation
  const handleDownloadPdf = async () => {
    if (order.type === 'voucher' && order.voucherOrder?.id) {
      const loadingToast = toast.loading(translate('voucher.toast.generatingVoucher'));
      
      try {
        const result = await downloadPdf.mutateAsync(order.voucherOrder.id);
        
        if (!result?.voucher || !result?.signedPdfUrl) {
          toast.dismiss(loadingToast);
          toast.error(translate('voucher.toast.failedToLoadVoucher'));
          return;
        }
        
        toast.dismiss(loadingToast);
        
        const voucher = result.voucher;
        const filename = `vitana-voucher-${voucher.code}.pdf`;
        
        // Pure download action - anchor-click method, NO navigation, NO window.open
        try {
          const link = document.createElement('a');
          link.href = result.signedPdfUrl;
          link.download = filename;
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(translate('voucher.toast.downloadStarted'));
        } catch (error) {
          console.error('Download anchor failed:', error);
          // Fallback: direct location (still no navigation, just triggers download)
          window.location.href = result.signedPdfUrl;
          toast.success(translate('voucher.toast.downloadStarted'));
        }
      } catch (error: any) {
        console.error('Download error:', error);
        toast.dismiss(loadingToast);
        toast.error(error?.message || translate('voucher.toast.downloadFailed'));
      }
    } else if (order.type === 'ticket' && order.ticketPurchase) {
      toast.info(translate('voucher.toast.useTicketView'));
    } else {
      toast.info(translate('voucher.toast.pdfNotAvailable'));
    }
  };

  // Handle email send for vouchers
  const handleSendEmail = async () => {
    if (!recipientEmail) {
      toast.error(translate('voucher.toast.enterRecipientEmail'));
      return;
    }

    if (order.type !== 'voucher' || !order.voucherOrder?.id) {
      toast.error(translate('voucher.toast.emailOnlyForVouchers'));
      return;
    }

    const loadingToast = toast.loading(translate('voucher.toast.sendingVoucherEmail'));
    
    try {
      await sendEmail.mutateAsync({
        orderId: order.voucherOrder.id,
        recipientEmail,
        recipientName,
        message: personalMessage,
      });
      
      toast.dismiss(loadingToast);
      toast.success(translate('voucher.toast.voucherSent').replace('{email}', recipientEmail));
      setShowEmailForm(false);
      setRecipientEmail('');
      setRecipientName('');
      setPersonalMessage('');
    } catch (error: any) {
      console.error('Email send error:', error);
      toast.dismiss(loadingToast);
      toast.error(error?.message || translate('voucher.toast.downloadFailed'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-3xl p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/20">
          <SheetHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  order.type === 'ticket' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
                  order.type === 'voucher' && "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
                  order.type === 'product' && "bg-green-100 dark:bg-green-900/30 text-green-600",
                  order.type === 'service' && "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                )}>
                  {getTypeIcon()}
                </div>
                <div>
                  <SheetTitle className="text-left text-base">{translate('orders.detailSheet.title')}</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {order.type.charAt(0).toUpperCase() + order.type.slice(1)} • {order.orderDate}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto h-[calc(90vh-140px)] pb-24">
          {/* Order Summary */}
          <div className="p-4 space-y-4">
            {/* Main order info */}
            <div className="bg-card/70 backdrop-blur-sm border border-border/30 rounded-xl p-4">
              <div className="flex gap-3">
                {order.imageUrl && order.imageUrl !== '/placeholder.svg' ? (
                  <img 
                    src={order.imageUrl} 
                    alt={order.title}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className={cn(
                    "w-16 h-16 rounded-xl flex items-center justify-center text-2xl",
                    order.type === 'ticket' && "bg-blue-100 dark:bg-blue-900/30",
                    order.type === 'voucher' && "bg-purple-100 dark:bg-purple-900/30",
                    order.type === 'product' && "bg-green-100 dark:bg-green-900/30"
                  )}>
                    {order.type === 'ticket' ? '🎫' : order.type === 'voucher' ? '🎁' : '📦'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground line-clamp-2">{order.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{order.subtitle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.statusLabel}
                    </Badge>
                    <span className="text-lg font-bold">{order.price}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order details */}
            <div className="bg-card/70 backdrop-blur-sm border border-border/30 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{translate('orders.detailSheet.orderInfo')}</h4>
              
              {order.ticketNumber && (
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{translate('orders.detailSheet.orderReference')}</p>
                    <p className="text-sm font-medium font-mono">{order.ticketNumber}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{translate('orders.detailSheet.purchaseDate')}</p>
                  <p className="text-sm font-medium">{order.orderDate}</p>
                </div>
              </div>
              
              {order.eventDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{translate('orders.detailSheet.eventDate')}</p>
                    <p className="text-sm font-medium">{format(order.eventDate, 'EEEE, MMMM d, yyyy • h:mm a')}</p>
                  </div>
                </div>
              )}
              
              {order.eventLocation && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{translate('orders.detailSheet.location')}</p>
                    <p className="text-sm font-medium">{order.eventLocation}</p>
                  </div>
                </div>
              )}
              
              {order.quantity && order.quantity > 1 && (
                <div className="flex items-center gap-3">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{translate('orders.detailSheet.quantity')}</p>
                    <p className="text-sm font-medium">{order.quantity} {translate('orders.detailSheet.tickets')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Ticket/Voucher Preview */}
            {order.type === 'ticket' && order.ticketPurchase && order.ticketPurchase.event && (
              <div className="bg-card/70 backdrop-blur-sm border border-border/30 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{translate('orders.detailSheet.yourTicket')}</h4>
                <EventTicket
                  eventTitle={order.ticketPurchase.event.title}
                  eventDate={new Date(order.ticketPurchase.event.start_time)}
                  eventLocation={order.ticketPurchase.event.location || 'Location TBD'}
                  ticketType={order.ticketPurchase.ticket_type?.name || 'General'}
                  ticketNumber={order.ticketPurchase.ticket_number}
                  buyerName={order.ticketPurchase.buyer_name}
                  quantity={order.ticketPurchase.quantity}
                  qrCodeData={order.ticketPurchase.qr_code_token}
                  eventImageUrl={order.ticketPurchase.event.image_url || undefined}
                />
              </div>
            )}

            {/* Voucher info for gift vouchers */}
            {order.type === 'voucher' && order.voucherOrder && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🎁</div>
                  <h4 className="font-semibold text-lg">{translate('orders.detailSheet.giftVoucher')}</h4>
                  {order.voucherOrder.voucher_code && (
                    <div className="bg-white/80 dark:bg-background/80 rounded-lg px-4 py-2 mt-2 inline-block">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{translate('orders.detailSheet.code')}</p>
                      <p className="font-mono font-bold text-lg tracking-widest">{order.voucherOrder.voucher_code}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email form for vouchers */}
            {showEmailForm && order.type === 'voucher' && (
              <div className="bg-card/70 backdrop-blur-sm border border-border/30 rounded-xl p-4 space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{translate('orders.detailSheet.sendToRecipient')}</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="recipientEmail" className="text-sm">{translate('orders.detailSheet.recipientEmail')}</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      placeholder={t('screens.orders.friendExampleCom')}
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="recipientName" className="text-sm">{translate('orders.detailSheet.recipientName')}</Label>
                    <Input
                      id="recipientName"
                      placeholder={t('screens.orders.friendSName')}
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="personalMessage" className="text-sm">{translate('orders.detailSheet.personalMessage')}</Label>
                    <Textarea
                      id="personalMessage"
                      placeholder={translate('voucher.email.messagePlaceholder')}
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowEmailForm(false)}
                    >
                      {translate('orders.detailSheet.cancel')}
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleSendEmail}
                      disabled={sendEmail.isPending || !recipientEmail}
                    >
                      {sendEmail.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {translate('orders.detailSheet.send')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed action buttons at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border/20 p-4 pb-6">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 h-12"
              onClick={handleDownloadPdf}
              disabled={downloadPdf.isPending}
            >
              {downloadPdf.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {translate('orders.detailSheet.downloadPdf')}
                </>
              )}
            </Button>
            
            {order.type === 'voucher' && !showEmailForm && (
              <Button 
                className="flex-1 h-12"
                onClick={() => setShowEmailForm(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                {translate('orders.detailSheet.sendToRecipient')}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
