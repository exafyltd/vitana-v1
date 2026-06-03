import { ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/hooks/useCart";
import { useUniversalCart } from "@/hooks/useUniversalCart";
import { useAuth } from "@/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  UniversalCartApiError,
  UniversalCartRoleError,
} from "@/lib/universal-cart-client";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface AddToCartButtonProps {
  item: {
    item_type: CartItem['item_type'];
    item_id: string;
    item_name: string;
    item_price: number;
    item_image_url?: string;
    item_metadata?: Record<string, any>;
  };
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

// Phase 0: the Universal Cart is the single canonical cart. This button now
// writes Discover products into it via the gateway (item_type 'partner_product')
// instead of the legacy `cart_items` table. Only `product`-typed items with a
// UUID id can enter the products-backed cart; other legacy types (lab_test,
// wellness_service) are intentionally not routed here — see LabTestCard /
// MobileDiscoverView, which hide their add affordance for Phase 0.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AddToCartButton({
  item,
  variant = "default",
  size = "sm",
  className,
  showLabel = true
}: AddToCartButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, addItem, isAdding, roleBlocked } = useUniversalCart({ enabled: !!user });
  const [justAdded, setJustAdded] = useState(false);

  // "added" is driven by the one cart containing this product_id (active row).
  const isInCart = items.some(
    (cartItem) => cartItem.product_id === item.item_id && cartItem.status === "active"
  );

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      notifyError('toasts.cart.signRequired', 'toasts.cart.pleaseSignAddItemsYourCart');
      navigate('/');
      return;
    }
    if (roleBlocked) {
      notifyError('universalCart.addButton.roleBlocked');
      return;
    }

    // Only products-backed UUID items can enter the unified cart.
    if (item.item_type !== 'product' || !UUID_RE.test(item.item_id)) {
      notifyError('universalCart.addButton.failed');
      return;
    }

    try {
      await addItem({
        product_id: item.item_id,
        item_type: 'partner_product',
        quantity: 1,
        unit_price_cents_snapshot: Math.round((item.item_price || 0) * 100),
        source_surface: 'community',
        metadata: { source_label: item.item_name },
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
      notify('universalCart.addButton.success');
    } catch (err) {
      if (err instanceof UniversalCartRoleError) {
        notifyError('universalCart.addButton.roleBlocked');
        return;
      }
      const code = err instanceof UniversalCartApiError ? err.code : undefined;
      notifyError('universalCart.addButton.failed');
      if (code) console.warn('[Phase 0] AddToCart (unified) failed:', code);
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={isInCart ? "outline" : variant}
      size={size}
      disabled={isAdding}
      aria-label={isInCart ? t('screens.cart.inCart') : t('screens.cart.addToCart')}
      className={cn(
        "transition-all duration-300",
        isInCart && "border-primary text-primary",
        className
      )}
    >
      {justAdded ? (
        <Check className="h-4 w-4" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      {showLabel && size !== "icon" && (
        <span className="ml-2">
          {isInCart ? t('screens.cart.inCart') : t('screens.cart.addToCart')}
        </span>
      )}
    </Button>
  );
}
