import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { useCart } from "@/hooks/useCart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Cart() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems, cartTotal, cartCount, updateQuantity, removeFromCart, clearCart, isLoading } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { items: cartItems }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Redirecting to checkout",
          description: "Opening Stripe checkout in a new tab...",
        });
      }
    } catch (error: any) {
      toast({
        title: "Checkout error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <AppLayout>
      <SEO 
        title="Shopping Cart | VITANA"
        description="Review your cart and complete your purchase"
        canonical={window.location.href}
      />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <StandardHeader
            title="Shopping Cart"
            description={`${cartCount} ${cartCount === 1 ? 'item' : 'items'} in your cart`}
            emoji="🛒"
          />

          {cartCount === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
                <p className="text-muted-foreground mb-6">
                  Start adding items from the Discover marketplace
                </p>
                <Button onClick={() => navigate('/discover')}>
                  Browse Marketplace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-4">
                        {cartItems.map((item) => (
                          <Card key={item.id} className="border-purple-200">
                            <CardContent className="p-4">
                              <div className="flex gap-4">
                                {item.item_image_url && (
                                  <img
                                    src={item.item_image_url}
                                    alt={item.item_name}
                                    className="w-24 h-24 object-cover rounded-lg"
                                  />
                                )}
                                <div className="flex-1">
                                  <h3 className="font-semibold mb-1">{item.item_name}</h3>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    ${item.item_price.toFixed(2)} each
                                  </p>
                                  {item.item_metadata?.provider && (
                                    <p className="text-xs text-muted-foreground">
                                      by {item.item_metadata.provider}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end justify-between">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                      disabled={item.quantity <= 1}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="font-bold text-lg">
                                    ${(item.item_price * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="w-full"
                >
                  Clear Cart
                </Button>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="bg-white/80 backdrop-blur-sm sticky top-6">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-xl font-semibold">Order Summary</h3>
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="text-green-600">FREE</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>Calculated at checkout</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={checkoutLoading || isLoading}
                    >
                      {checkoutLoading ? "Processing..." : "Proceed to Checkout"}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Secure checkout powered by Stripe
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
