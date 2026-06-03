/**
 * VTID-03236 — AddToUniversalCartButton
 *
 * Coexists with the legacy `AddToCartButton`. DOES NOT touch the legacy
 * Discover cart flow — it adds the same product into the parallel
 * Universal Cart via the gateway. Convergence tracked in vitana-platform
 * issue #2371.
 *
 * Visual style: distinct icon (Bookmark, not ShoppingCart) + "Stack" label,
 * so users can tell the two affordances apart on a product card.
 */

import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useUniversalCart } from "@/hooks/useUniversalCart";
import {
  UniversalCartApiError,
  UniversalCartItemType,
  UniversalCartRoleError,
  UniversalCartSourceSurface,
} from "@/lib/universal-cart-client";
import { notify, notifyError, t } from "@/lib/i18n-toast";

interface AddToUniversalCartButtonProps {
  productId: string;
  itemType?: UniversalCartItemType;
  sourceSurface?: UniversalCartSourceSurface;
  /** Optional snapshot fields recorded on the cart_items row. */
  unitPriceCentsSnapshot?: number;
  currencySnapshot?: string;
  merchantId?: string;
  /** Optional autopilot recommendation that triggered this add. */
  autopilotRecId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function AddToUniversalCartButton({
  productId,
  itemType = "partner_product",
  sourceSurface = "community",
  unitPriceCentsSnapshot,
  currencySnapshot,
  merchantId,
  autopilotRecId,
  variant = "outline",
  size = "sm",
  className,
  showLabel = true,
}: AddToUniversalCartButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, addItem, isAdding, roleBlocked } = useUniversalCart({ enabled: !!user });
  const [justAdded, setJustAdded] = useState(false);

  const alreadyInStack = items.some(
    (it) => it.product_id === productId && it.status === "active"
  );

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      notifyError("universalCart.addButton.signRequired");
      navigate("/");
      return;
    }
    if (roleBlocked) {
      notifyError("universalCart.addButton.roleBlocked");
      return;
    }

    try {
      await addItem({
        product_id: productId,
        item_type: itemType,
        quantity: 1,
        source_surface: sourceSurface,
        unit_price_cents_snapshot: unitPriceCentsSnapshot,
        currency_snapshot: currencySnapshot,
        merchant_id: merchantId,
        autopilot_rec_id: autopilotRecId,
      });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2000);
      notify("universalCart.addButton.success");
    } catch (err) {
      if (err instanceof UniversalCartRoleError) {
        notifyError("universalCart.addButton.roleBlocked");
        return;
      }
      const detail =
        err instanceof UniversalCartApiError ? err.code : undefined;
      notifyError(
        "universalCart.addButton.failed",
        detail ? undefined : undefined
      );
      if (detail) {
        // Surface the gateway error code for diagnostics without leaking it
        // through a user-facing string.
        console.warn("[VTID-03236] Universal Cart add failed:", detail);
      }
    }
  };

  const ariaKey = alreadyInStack
    ? "universalCart.addButton.addedAria"
    : "universalCart.addButton.addAria";
  const labelKey = alreadyInStack
    ? "universalCart.addButton.added"
    : "universalCart.addButton.label";

  return (
    <Button
      onClick={handleClick}
      variant={alreadyInStack ? "outline" : variant}
      size={size}
      disabled={isAdding}
      aria-label={t(ariaKey)}
      className={cn(
        "transition-all duration-300",
        alreadyInStack && "border-primary text-primary",
        className
      )}
    >
      {justAdded || alreadyInStack ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      {showLabel && size !== "icon" && (
        <span className="ml-2">{t(labelKey)}</span>
      )}
    </Button>
  );
}
