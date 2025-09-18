import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMessages } from "@/hooks/useMessages";
import { 
  CreditCard, 
  Coins, 
  CheckCircle, 
  Clock,
  MapPin,
  Calendar,
  Star,
  Shield,
  ArrowRight
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
    cash: number;
  };
}

export default function BookingPaymentFlow({ 
  isOpen, 
  onClose, 
  booking,
  userBalance = { credits: 2450, cash: 150 }
}: BookingPaymentFlowProps) {
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'cash'>('credits');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { sendMessage } = useMessages(undefined, false); // Disable auto-fetch

  const canAfford = () => {
    if (booking.currency === 'credits') {
      return userBalance.credits >= booking.price;
    }
    return paymentMethod === 'credits' 
      ? userBalance.credits >= booking.price * 20 // 1 USD = 20 credits conversion
      : userBalance.cash >= booking.price;
  };

  const getRequiredAmount = () => {
    if (booking.currency === 'credits' || paymentMethod === 'credits') {
      return booking.currency === 'credits' 
        ? booking.price 
        : booking.price * 20;
    }
    return booking.price;
  };

  const handleConfirmBooking = async () => {
    if (!canAfford()) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${getRequiredAmount()} ${paymentMethod === 'credits' ? 'credits' : 'USD'} to complete this booking`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Process payment and create booking
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate payment processing

      // Send confirmation message to provider
      const confirmationData = {
        bookingId: booking.id,
        title: booking.title,
        date: booking.schedule.date,
        time: booking.schedule.time,
        amount: getRequiredAmount(),
        currency: paymentMethod,
        customerName: "Current User", // This would be the actual user
        paymentStatus: "completed"
      };

      await sendMessage(
        `New booking confirmed: ${booking.title} on ${booking.schedule.date} at ${booking.schedule.time}`,
        'provider_' + booking.provider.name.toLowerCase().replace(' ', '_'),
        'service_booking',
        confirmationData
      );

      toast({
        title: "Booking Confirmed! 🎉",
        description: `Your ${booking.type} has been booked and payment processed`
      });

      onClose();
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
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
                        Balance: {userBalance.credits.toLocaleString()} credits
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{getRequiredAmount()} credits</p>
                    {booking.currency === 'usd' && (
                      <p className="text-xs text-muted-foreground">~${booking.price}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cash Option (if USD service) */}
              {booking.currency === 'usd' && (
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">Debit/Credit Card</p>
                        <p className="text-sm text-muted-foreground">
                          Balance: ${userBalance.cash}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${booking.price}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Balance Check */}
          {!canAfford() && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Insufficient Balance</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  You need {getRequiredAmount() - (paymentMethod === 'credits' ? userBalance.credits : userBalance.cash)} more {paymentMethod === 'credits' ? 'credits' : 'USD'}
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
                  {paymentMethod === 'credits' ? `${getRequiredAmount()} credits` : `$${booking.price}`}
                </span>
              </div>
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