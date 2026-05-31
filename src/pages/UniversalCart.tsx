/**
 * VTID-03236 — Universal Cart page (/universal-cart).
 *
 * Read-only-by-default view of the caller's active Universal Cart. Lets the
 * user adjust quantity, soft-remove items, and (optionally) mark items
 * completed. Distinct from the legacy `/cart` page — only reads/writes the
 * gateway-backed universal_carts / universal_cart_items / universal_cart_events
 * surface. The legacy Discover cart, Stripe checkout, and CJ Dropshipping
 * flows remain entirely untouched.
 *
 * Empty / role-blocked / error states all rendered explicitly per the
 * vitana-v1 hard rule (no raw user-visible strings).
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Bookmark, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import {
  UniversalCartApiError,
  UniversalCartItem,
} from "@/lib/universal-cart-client";
import { useUniversalCart } from "@/hooks/useUniversalCart";
import { notifyError, t } from "@/lib/i18n-toast";

function QuantityStepper({
  item,
  onChange,
  disabled,
}: {
  item: UniversalCartItem;
  onChange: (next: number) => void | Promise<void>;
  disabled?: boolean;
}) {
  const dec = () => {
    if (item.quantity > 1) onChange(item.quantity - 1);
  };
  const inc = () => onChange(item.quantity + 1);
  return (
    <div
      className="inline-flex items-center gap-1"
      aria-label={t("universalCart.page.quantityLabel")}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={dec}
        disabled={disabled || item.quantity <= 1}
        aria-label={t("universalCart.page.quantityLabel")}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="min-w-[2ch] text-center tabular-nums">{item.quantity}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={inc}
        disabled={disabled}
        aria-label={t("universalCart.page.quantityLabel")}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function UniversalCartPage() {
  const {
    cart,
    items,
    isLoading,
    error,
    roleBlocked,
    patchItem,
    removeItem,
    completeItem,
    isPatching,
    isRemoving,
    isCompleting,
  } = useUniversalCart();

  // -- Role-blocked: explicit community-only empty state ---------------------
  if (roleBlocked) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bookmark className="h-6 w-6" />
          {t("universalCart.page.title")}
        </h1>
        <Card className="mt-6">
          <CardContent className="py-10 text-center space-y-2">
            <h2 className="text-lg font-medium">
              {t("universalCart.page.roleBlockedTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("universalCart.page.roleBlockedBody")}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bookmark className="h-6 w-6" />
          {t("universalCart.page.title")}
        </h1>
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("universalCart.page.loading")}</span>
        </div>
      </main>
    );
  }

  if (error && !roleBlocked) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bookmark className="h-6 w-6" />
          {t("universalCart.page.title")}
        </h1>
        <Card className="mt-6">
          <CardContent className="py-10 text-center space-y-2">
            <h2 className="text-lg font-medium">
              {t("universalCart.page.errorTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("universalCart.page.errorBody")}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const activeItems = items.filter((it) => it.status === "active");
  const isEmpty = !cart || activeItems.length === 0;

  const onQuantity = async (item: UniversalCartItem, next: number) => {
    if (next === item.quantity) return;
    try {
      await patchItem(item.id, { quantity: next });
    } catch (err) {
      const code = err instanceof UniversalCartApiError ? err.code : undefined;
      notifyError("universalCart.addButton.failed");
      if (code) console.warn("[VTID-03236] patch failed:", code);
    }
  };

  const onRemove = async (item: UniversalCartItem) => {
    try {
      await removeItem(item.id);
    } catch (err) {
      const code = err instanceof UniversalCartApiError ? err.code : undefined;
      notifyError("universalCart.addButton.failed");
      if (code) console.warn("[VTID-03236] remove failed:", code);
    }
  };

  const onComplete = async (item: UniversalCartItem) => {
    try {
      await completeItem(item.id);
    } catch (err) {
      const code = err instanceof UniversalCartApiError ? err.code : undefined;
      notifyError("universalCart.addButton.failed");
      if (code) console.warn("[VTID-03236] complete failed:", code);
    }
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bookmark className="h-6 w-6" />
          {t("universalCart.page.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("universalCart.page.subtitle")}
        </p>
      </header>

      {isEmpty ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <h2 className="text-lg font-medium">
              {t("universalCart.page.emptyTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("universalCart.page.emptyBody")}
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/discover">{t("universalCart.page.linkToDiscover")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-medium break-words">
                      {item.product_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.item_type}
                      {item.source_surface ? ` · ${item.source_surface}` : ""}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(item)}
                    disabled={isRemoving}
                    aria-label={t("universalCart.page.removeAction")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 pt-0">
                <QuantityStepper
                  item={item}
                  onChange={(next) => onQuantity(item, next)}
                  disabled={isPatching}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onComplete(item)}
                  disabled={isCompleting}
                >
                  {t("universalCart.page.completeAction")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
