import { X, ShoppingCart, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CartItem } from "./CartItem";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface CartSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function CartSidebar({ open, onClose }: CartSidebarProps) {
  const { 
    cartItems, 
    cartTotal, 
    cartCount,
    updateQuantity, 
    removeFromCart, 
    clearCart,
    checkout,
    isLoading 
  } = useCart();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-96 bg-background/95 backdrop-blur-md border-l border-white/20 shadow-2xl z-50 transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('screens.cart.yourCart')}</h2>
              <span className="text-sm text-muted-foreground">({cartCount})</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Cart Items */}
          {cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('screens.cart.yourCartEmpty')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Browse our wellness services and products to get started
              </p>
              <Button onClick={onClose} variant="outline">
                Continue Shopping
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="border-t border-white/20 p-4 space-y-4 bg-white/5 backdrop-blur-sm">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${cartTotal.toFixed(2)}</span>
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={checkout}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isLoading ? "Processing..." : "Proceed to Checkout"}
                  </Button>
                  <Button
                    onClick={clearCart}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    Clear Cart
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
