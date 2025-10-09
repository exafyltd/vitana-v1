import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
      date: string;
      time: string;
      duration: string;
    };
    location: string;
    type: 'service' | 'event';
  };
  userBalance?: {
    credits: number;
    vtn: number;
    usd: number;
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
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'vtn' | 'usd' | 'cash'>('credits');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { sendMessage } = useMessages(undefined, false);
  const { updateBalance, exchangeCurrency } = useWallet();

  // Calculate how much of each currency is needed for the booking (always priced in USD)
  const getRequiredAmount = (currency: 'CREDITS' | 'VTN' | 'USD') => {
    const bookingPriceUSD = booking.price;
    
    if (currency === 'USD') {
      return bookingPriceUSD;
    }
    
    // Both Credits and VTN convert at 100:1 to USD
    const rate = getExchangeRate(currency, 'USD');
    if (!rate) return bookingPriceUSD * 100;
    
    return bookingPriceUSD / rate.rate; // e.g., $150 / 0.01 = 15,000 Credits/VTN
  };

  const canAfford = () => {
    if (!userBalance) return false;
    
    if (paymentMethod === 'cash') return true; // Stripe handles validation
    
    const required = getRequiredAmount(paymentMethod.toUpperCase() as 'CREDITS' | 'VTN' | 'USD');
    
    switch (paymentMethod) {
      case 'credits':
        return userBalance.credits >= required;
      case 'vtn':
        return userBalance.vtn >= required;
      case 'usd':
        return userBalance.usd >= required;
      default:
        return false;
    }
  };

  const handleConfirmBooking = async () => {
    if (!canAfford()) {
      const currencyLabel = paymentMethod === 'cash' ? 'USD' : paymentMethod.toUpperCase();
      toast({
        title: "Insufficient Balance",
        description: `You need ${formatCurrency(getRequiredAmount(currencyLabel as any), currencyLabel)} to complete this booking`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
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
              dateTime: new Date().toISOString(),
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

        toast({
          title: "Redirecting to Payment",
          description: "Complete your payment in the popup window",
        });

        setIsProcessing(false);
        onClose();
      } else {
        // Process wallet payment (Credits, VTN, or USD)
        const bookingPriceUSD = booking.price;
        const currencyUsed = paymentMethod.toUpperCase() as 'CREDITS' | 'VTN' | 'USD';
        
        if (paymentMethod === 'usd') {
          // Direct USD payment
          await updateBalance('USD', bookingPriceUSD, 'subtract');
        } else {
          // Exchange Credits or VTN to USD
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
          date: booking.schedule.date,
          time: booking.schedule.time,
          amount: amountPaid,
          amountUSD: booking.price,
          currency: currencyUsed,
          customerName: "Current User",
          paymentStatus: "completed",
          paymentMethod: "wallet"
        };

        await sendMessage(
          `New booking confirmed: ${booking.title} on ${booking.schedule.date} at ${booking.schedule.time}`,
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

        toast({
          title: "Booking Confirmed! 🎉",
          description: `Your ${booking.type} has been booked and payment processed.${conversionMsg}`
        });

        setIsProcessing(false);
        onClose();
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "Please try again or contact support",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Complete Booking
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
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.schedule.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.schedule.time}</span>
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
              <CardTitle className="text-lg">Payment Method</CardTitle>
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
                      <p className="font-medium">Credits</p>
                      <p className="text-sm text-muted-foreground">
                        Balance: {formatCurrency(userBalance?.credits || 0, 'CREDITS')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(getRequiredAmount('CREDITS'), 'CREDITS')}</p>
                    <p className="text-xs text-muted-foreground">≈ ${booking.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* VTN Tokens Option */}
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'vtn' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setPaymentMethod('vtn')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">VTN Tokens</p>
                      <p className="text-sm text-muted-foreground">
                        Balance: {formatCurrency(userBalance?.vtn || 0, 'VTN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(getRequiredAmount('VTN'), 'VTN')}</p>
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
                      <p className="font-medium">USD Wallet</p>
                      <p className="text-sm text-muted-foreground">
                        Balance: {formatCurrency(userBalance?.usd || 0, 'USD')}
                      </p>
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
                      <p className="font-medium">Debit/Credit Card</p>
                      <p className="text-sm text-muted-foreground">
                        Pay with Stripe
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
                  <span className="text-sm font-medium">Insufficient Balance</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Top up your wallet to complete this booking
                </p>
              </CardContent>
            </Card>
          )}

          {/* Total & Confirmation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>
                  {paymentMethod === 'cash' 
                    ? `$${booking.price.toFixed(2)}`
                    : formatCurrency(
                        getRequiredAmount(paymentMethod.toUpperCase() as 'CREDITS' | 'VTN' | 'USD'), 
                        paymentMethod.toUpperCase()
                      )
                  }
                </span>
              </div>
              {paymentMethod !== 'cash' && paymentMethod !== 'usd' && (
                <p className="text-sm text-muted-foreground text-right mt-1">
                  Converts to ${booking.price.toFixed(2)} USD
                </p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmBooking} 
              disabled={!canAfford() || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}