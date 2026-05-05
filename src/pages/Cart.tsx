import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/context/AuthProvider";
import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { t } from '@/lib/i18n-toast';

export default function Cart() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { cartItems, cartTotal, cartCount, updateQuantity, removeFromCart, clearCart, checkout, isLoading } = useCart();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleCheckout = async () => {
    await checkout();
  };

  return (
    <AppLayout>
      <SEO 
        title={t('screens.cart.shoppingCartVitana')}
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
            {t('screens.cart.back')}
          </Button>

          <StandardHeader
            title={t('screens.cart.shoppingCart')}
            description={`${cartCount} ${cartCount === 1 ? 'item' : 'items'} in your cart`}
            emoji="🛒"
          />

          {cartCount === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">{t('screens.cart.yourCartEmpty')}</h3>
                <p className="text-muted-foreground mb-6">
                  Start adding items from the Discover marketplace
                </p>
                <Button onClick={() => navigate('/discover')}>
                  {t('screens.cart.browseMarketplace')}
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
                  {t('screens.cart.clearCart')}
                </Button>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="bg-white/80 backdrop-blur-sm sticky top-6">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-xl font-semibold">{t('screens.cart.orderSummary')}</h3>
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('screens.cart.subtotal')}</span>
                        <span>${cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('screens.cart.shipping')}</span>
                        <span className="text-green-600">{t('screens.cart.free')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('screens.cart.tax')}</span>
                        <span>{t('screens.cart.calculatedAtCheckout')}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>{t('screens.cart.total')}</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={isLoading}
                    >
                      {isLoading ? "Processing..." : "Proceed to Checkout"}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      {t('screens.cart.secureCheckoutPoweredByStripe')}
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
