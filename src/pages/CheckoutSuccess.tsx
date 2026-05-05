import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { useCart } from "@/hooks/useCart";
import { useToast } from '@/hooks/use-toast';
import { notify } from '@/lib/i18n-toast';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const { toast } = useToast();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Clear cart after successful checkout
    if (sessionId) {
      clearCart();
      notify('toasts.checkoutsuccess.orderConfirmed', 'toasts.checkoutsuccess.yourPaymentSuccessfulCheckYourEmail');
    }
  }, [sessionId]);

  return (
    <AppLayout>
      <SEO 
        title="Order Confirmed | VITANA"
        description="Your order has been successfully placed"
        canonical={window.location.href}
      />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-3xl mx-auto space-y-6 pt-12">
          <Card className="bg-white/80 backdrop-blur-sm text-center">
            <CardContent className="p-12">
              <div className="mb-6">
                <CheckCircle className="h-20 w-20 mx-auto text-green-500" />
              </div>
              
              <StandardHeader
                title="Order Confirmed!"
                description="Thank you for your purchase"
                emoji="🎉"
              />

              <div className="my-8 space-y-4">
                <p className="text-muted-foreground">
                  Your order has been successfully placed and is being processed.
                </p>
                <p className="text-sm text-muted-foreground">
                  You'll receive a confirmation email with your order details and tracking information shortly.
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Package className="h-6 w-6 text-purple-600" />
                  <h3 className="font-semibold text-lg">What's Next?</h3>
                </div>
                <ul className="text-sm text-left space-y-2 max-w-md mx-auto">
                  <li>✓ Order confirmation sent to your email</li>
                  <li>✓ Your items will be prepared for shipment</li>
                  <li>✓ You'll receive tracking information within 24 hours</li>
                  <li>✓ Expected delivery: 3-5 business days</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="lg"
                  onClick={() => navigate('/discover/orders')}
                >
                  View My Orders
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/discover')}
                >
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about your order, our support team is here to help.
              </p>
              <Button variant="outline" onClick={() => navigate('/settings/support')}>
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
