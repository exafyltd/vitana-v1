import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { useMessages } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import { getExchangeRate, calculateExchange, formatCurrency } from "@/lib/exchangeRates";
import { 
  CreditCard, 
  Coins, 
  CheckCircle, 
  Clock,
  MapPin,
  Calendar,
  Star,
  Shield,
  ArrowRight,
  DollarSign
} from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface BookingPaymentFlowProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: 'credits' | 'usd';
    provider: {
      name: string;
      avatar?: string;
      rating?: number;
    };
    schedule: {
      date?: string | Date;
      time?: string;
      duration: string;
    };
    location: string;
    type: 'service' | 'event';
  };
  userBalance?: {
    credits: number;
    usd: number;
    // Some legacy callers still pass `vtna` in this object literal; kept
    // optional so those call sites (out of scope for this change) still
    // type-check. No longer read internally — VTNA is not a payment option.
    vtna?: number;
  };
  onBookingComplete?: (bookingDetails: any) => Promise<void>;
}

export default function BookingPaymentFlow({ 
  isOpen, 
  onClose, 
  booking,
  userBalance,
  onBookingComplete
}: BookingPaymentFlowProps) {
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'usd' | 'cash'>('credits');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const { sendMessage } = useMessages(undefined, false);
  const { updateBalance, exchangeCurrency } = useWallet();

  // Generate time slots from 9 AM to 5 PM in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 17) slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  // Calculate how much of each currency is needed for the booking (always priced in USD)
  const getRequiredAmount = (currency: 'CREDITS' | 'USD') => {
    const bookingPriceUSD = booking.price;

    if (currency === 'USD') {
      return bookingPriceUSD;
    }

    // Credits convert at 100:1 to USD
    const rate = getExchangeRate(currency, 'USD');
    if (!rate) return bookingPriceUSD * 100;

    return bookingPriceUSD / rate.rate; // e.g., $150 / 0.01 = 15,000 Credits
  };

  const canAfford = () => {
    if (!userBalance) return false;

    if (paymentMethod === 'cash') return true; // Stripe handles validation

    const required = getRequiredAmount(paymentMethod.toUpperCase() as 'CREDITS' | 'USD');

    switch (paymentMethod) {
      case 'credits':
        return userBalance.credits >= required;
      case 'usd':
        return userBalance.usd >= required;
      default:
        return false;
    }
  };

  const handleConfirmBooking = async () => {
    // Validate date and time are selected
    if (!selectedDate || !selectedTime) {
      notifyError('toasts.payment.missingInformation', 'toasts.payment.pleaseSelectDateTimeForYour');
      return;
    }

    if (!canAfford()) {
      const currencyLabel = paymentMethod === 'cash' ? 'USD' : paymentMethod.toUpperCase();
      notifyError('toasts.payment.insufficientBalance');
      return;
    }

    setIsProcessing(true);

    try {
      // Format booking date/time
      const bookingDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      bookingDateTime.setHours(parseInt(hours), parseInt(minutes));
      const formattedDate = formatDate(selectedDate, 'PPP');
      
      if (paymentMethod === 'cash') {
        // Create Stripe Checkout session for card payment
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase.functions.invoke(
          "stripe-create-booking-checkout",
          {
            body: {
              providerId: booking.id,
              providerName: booking.provider.name,
              providerImage: booking.provider.avatar,
              providerSpecialty: booking.description || "Healthcare Professional",
              bookingTitle: booking.title,
              price: booking.price,
              dateTime: bookingDateTime.toISOString(),
              duration: booking.schedule.duration.replace(/\D/g, ''),
              location: booking.location,
              appointmentType: booking.type || 'consultation',
            },
          }
        );

        if (error) throw error;

        // Open Stripe Checkout in popup
        const width = 600;
        const height = 800;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          data.url,
          "stripe-checkout",
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          throw new Error("Please allow popups to complete payment");
        }

        notify('toasts.payment.redirectingPayment', 'toasts.payment.completeYourPaymentPopupWindow');

        setIsProcessing(false);
        onClose();
      } else {
        // Process wallet payment (Credits or USD)
        const bookingPriceUSD = booking.price;
        const currencyUsed = paymentMethod.toUpperCase() as 'CREDITS' | 'USD';

        if (paymentMethod === 'usd') {
          // Direct USD payment
          await updateBalance('USD', bookingPriceUSD, 'subtract');
        } else {
          // Exchange Credits to USD
          const rate = getExchangeRate(currencyUsed, 'USD');
          if (!rate) throw new Error("Exchange rate not available");
          
          const amountNeeded = getRequiredAmount(currencyUsed);
          
          await exchangeCurrency(
            currencyUsed,
            'USD',
            amountNeeded,
            rate.rate
          );
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Send confirmation message to provider
        const amountPaid = getRequiredAmount(currencyUsed);
        
        const confirmationData = {
          bookingId: booking.id,
          title: booking.title,
          date: formattedDate,
          time: selectedTime,
          amount: amountPaid,
          amountUSD: booking.price,
          currency: currencyUsed,
          customerName: "Current User",
          paymentStatus: "completed",
          paymentMethod: "wallet"
        };

        await sendMessage(
          `New booking confirmed: ${booking.title} on ${formattedDate} at ${selectedTime}`,
          'provider_' + booking.provider.name.toLowerCase().replace(' ', '_'),
          'service_booking',
          confirmationData
        );

        // Call onBookingComplete if provided
        if (onBookingComplete) {
          await onBookingComplete({
            type: 'consultation',
            dateTime: new Date().toISOString(),
            ...confirmationData
          });
        }

        const conversionMsg = paymentMethod !== 'usd' 
          ? ` Converted ${formatCurrency(amountPaid, currencyUsed)} to $${booking.price} USD.`
          : '';

        notify('toasts.payment.bookingConfirmed');

        setIsProcessing(false);
        onClose();
      }
    } catch (error) {
      console.error('Booking error:', error);
      notifyError('toasts.payment.bookingFailed');
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {t('screens.payment.completeBooking')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{booking.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{booking.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Provider Info */}
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={booking.provider.avatar} />
                  <AvatarFallback>{booking.provider.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{booking.provider.name}</p>
                  {booking.provider.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">{booking.provider.rating}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Booking Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">{t('screens.payment.selectDate')}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {selectedDate ? formatDate(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">{t('screens.payment.selectTime')}</label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="w-full">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        <SelectValue placeholder={t('screens.payment.pickTime')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeSlots().map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{booking.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.schedule.duration}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('screens.payment.paymentMethod')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Credits Option */}
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'credits' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setPaymentMethod('credits')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="font-medium">{t('screens.payment.credits')}</p>
                      <p className="text-sm text-muted-foreground">{t('screens.payment.balanceValue0', { value0: formatCurrency(userBalance?.credits || 0, 'CREDITS') })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(getRequiredAmount('CREDITS'), 'CREDITS')}</p>
                    <p className="text-xs text-muted-foreground">≈ ${booking.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* USD Wallet Option */}
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'usd' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setPaymentMethod('usd')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">{t('screens.payment.usdWallet')}</p>
                      <p className="text-sm text-muted-foreground">{t('screens.payment.balanceValue0', { value0: formatCurrency(userBalance?.usd || 0, 'USD') })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${booking.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Cash/Card Option (Stripe) */}
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setPaymentMethod('cash')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium">{t('screens.payment.debitcreditCard')}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('screens.payment.payWithStripe')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${booking.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance Check */}
          {!canAfford() && paymentMethod !== 'cash' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('screens.payment.insufficientBalance')}</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  {t('screens.payment.topUpYourWalletCompleteThis')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Total & Confirmation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>{t('screens.payment.total')}</span>
                <span>
                  {paymentMethod === 'cash' 
                    ? `$${booking.price.toFixed(2)}`
                    : formatCurrency(
                        getRequiredAmount(paymentMethod.toUpperCase() as 'CREDITS' | 'USD'),
                        paymentMethod.toUpperCase()
                      )
                  }
                </span>
              </div>
              {paymentMethod !== 'cash' && paymentMethod !== 'usd' && (
                <p className="text-sm text-muted-foreground text-right mt-1">{t('screens.payment.convertsValue0Usd', { value0: booking.price.toFixed(2) })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('screens.payment.cancel')}
            </Button>
            <Button 
              onClick={handleConfirmBooking} 
              disabled={!canAfford() || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />{t('screens.payment.processing')}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('screens.payment.confirmBooking')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}