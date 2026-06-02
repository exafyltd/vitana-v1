/**
 * Phase 0 — Universal Cart page (/universal-cart), the single canonical cart.
 *
 * Two tabs over ONE gateway-backed cart (universal_carts / universal_cart_items
 * / universal_cart_events):
 *   - "Warenkorb" (Cart): buyable list + wallet balance + the existing checkout
 *     flow (gateway bridge — unchanged).
 *   - "Gemerkt" (Saved): items flagged metadata.saved, moved in/out via the
 *     existing PATCH item metadata (no gateway change).
 *
 * Line rows hydrate title/image from the products feed via useMarketplaceProduct
 * (the item.product_id IS the products.id UUID), falling back to the snapshot
 * price + a "Produkt ansehen" link while hydration is loading/missing.
 *
 * Empty / role-blocked / error states all rendered explicitly per the
 * vitana-v1 hard rule (no raw user-visible strings).
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bookmark,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  CheckoutAffiliateRedirect,
  UniversalCartApiError,
  UniversalCartItem,
  isInsufficientBalanceError,
} from "@/lib/universal-cart-client";
import { useUniversalCart } from "@/hooks/useUniversalCart";
import { useMarketplaceProduct } from "@/hooks/useMarketplace";
import { GatewayWalletBalanceCard } from "@/components/wallet/GatewayWalletBalanceCard";
import { AddMoneyDialog } from "@/components/wallet/AddMoneyDialog";
import { WalletCurrency } from "@/lib/wallet-gateway-client";
import { toMajorUnits, formatMoneyMinor, GatewayCurrency } from "@/lib/format-money";
import { notify, notifyError, t } from "@/lib/i18n-toast";

/** Known checkout error codes that have a dedicated translated message. */
const CHECKOUT_ERROR_KEYS = new Set([
  "invalid_request",
  "CART_EMPTY",
  "PRODUCT_UNAVAILABLE",
  "PRICE_UNAVAILABLE",
  "MIXED_CURRENCY",
  "UNSUPPORTED_WALLET_CURRENCY",
  "WALLET_ACCOUNT_MISSING",
  "WALLET_ACCOUNT_INACTIVE",
  "INSUFFICIENT_BALANCE",
  "TENANT_REQUIRED",
  "WALLET_DEBIT_FAILED",
  "CART_READ_FAILED",
  "ORDER_WRITE_FAILED",
  "WALLET_READ_FAILED",
  "GATEWAY_MISCONFIGURED",
]);

function checkoutErrorKey(code: string | undefined): string {
  if (code && CHECKOUT_ERROR_KEYS.has(code)) {
    return `marketplaceCheckout.errors.${code}`;
  }
  return "marketplaceCheckout.errors.unknown";
}

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

/**
 * Line header: hydrates the product title/image from the products feed. While
 * hydration is loading or the product is missing, it falls back to the snapshot
 * (a price line + a "Produkt ansehen" link to the product page).
 */
function CartLineHeader({ item }: { item: UniversalCartItem }) {
  const { data, isLoading } = useMarketplaceProduct(item.product_id);
  const product = data?.product;

  const snapshotPrice =
    item.unit_price_cents_snapshot != null
      ? formatMoneyMinor(
          item.unit_price_cents_snapshot,
          (item.currency_snapshot?.toUpperCase() as GatewayCurrency) || "EUR",
        )
      : null;

  const image = product?.images?.[0] ?? item.metadata?.item_image_url;
  const title =
    product?.title ??
    (typeof item.metadata?.source_label === "string"
      ? (item.metadata.source_label as string)
      : null);

  return (
    <div className="flex items-start gap-3">
      {typeof image === "string" && image ? (
        <img
          src={image}
          alt=""
          className="h-12 w-12 flex-shrink-0 rounded-md object-cover bg-muted"
          loading="lazy"
        />
      ) : null}
      <div className="min-w-0 text-sm">
        {title ? (
          <div className="font-medium break-words">{title}</div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{t("universalCart.page.loading")}</span>
          </div>
        ) : (
          <div className="font-medium break-words">
            {snapshotPrice ?? item.product_id}
          </div>
        )}
        {snapshotPrice && (
          <div className="text-xs text-muted-foreground tabular-nums">
            {snapshotPrice}
          </div>
        )}
        <Link
          to={`/discover/product/${item.product_id}`}
          className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
        >
          {t("universalCart.item.viewProduct")}
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export default function UniversalCartPage() {
  const navigate = useNavigate();
  const {
    cart,
    cartItems,
    savedItems,
    isLoading,
    error,
    roleBlocked,
    patchItem,
    removeItem,
    checkout,
    isPatching,
    isRemoving,
    isCheckingOut,
  } = useUniversalCart();

  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [addMoneyCurrency, setAddMoneyCurrency] = useState<WalletCurrency>("EUR");
  const [addMoneyAmount, setAddMoneyAmount] = useState<number | undefined>(undefined);
  const [affiliateRedirects, setAffiliateRedirects] = useState<
    CheckoutAffiliateRedirect[]
  >([]);

  // -- Role-blocked: explicit community-only empty state ---------------------
  if (roleBlocked) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6" />
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
          <ShoppingBag className="h-6 w-6" />
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
          <ShoppingBag className="h-6 w-6" />
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

  const isCartEmpty = !cart || cartItems.length === 0;
  const isSavedEmpty = savedItems.length === 0;

  const onQuantity = async (item: UniversalCartItem, next: number) => {
    if (next === item.quantity) return;
    try {
      await patchItem(item.id, { quantity: next });
    } catch (err) {
      const code = err instanceof UniversalCartApiError ? err.code : undefined;
      notifyError("universalCart.addButton.failed");
      if (code) console.warn("[Phase 0] patch failed:", code);
    }
  };

  const onRemove = async (item: UniversalCartItem) => {
    try {
      await removeItem(item.id);
    } catch (err) {
      const code = err instanceof UniversalCartApiError ? err.code : undefined;
      notifyError("universalCart.addButton.failed");
      if (code) console.warn("[Phase 0] remove failed:", code);
    }
  };

  // Saved <-> Cart toggle uses the existing PATCH item metadata (no gateway change).
  const onSetSaved = async (item: UniversalCartItem, saved: boolean) => {
    try {
      await patchItem(item.id, { metadata: { ...item.metadata, saved } });
    } catch (err) {
      const code = err instanceof UniversalCartApiError ? err.code : undefined;
      notifyError("universalCart.addButton.failed");
      if (code) console.warn("[Phase 0] save toggle failed:", code);
    }
  };

  const onCheckout = async () => {
    setAffiliateRedirects([]);
    try {
      const res = await checkout();

      // Partner/affiliate items: open each merchant link in a new tab and keep
      // a list rendered so the user can re-open any that the browser blocked.
      if (res.affiliate_redirects.length > 0) {
        for (const r of res.affiliate_redirects) {
          window.open(r.affiliate_url, "_blank", "noopener");
        }
        setAffiliateRedirects(res.affiliate_redirects);
        notify("marketplaceCheckout.checkout.affiliateOpened");
      }

      // Wallet-payable leg: success toast + navigate to the success page.
      if (res.wallet_order) {
        if (res.wallet_order.duplicate) {
          notify(
            "marketplaceCheckout.checkout.duplicateTitle",
            "marketplaceCheckout.checkout.duplicateBody",
          );
        } else {
          notify(
            "marketplaceCheckout.checkout.successTitle",
            "marketplaceCheckout.checkout.successBody",
          );
        }
        navigate(`/checkout/success?checkout_id=${encodeURIComponent(res.checkout_id)}`);
      }
    } catch (err) {
      // 402 INSUFFICIENT_BALANCE → prefill + open the Add-Money dialog.
      if (isInsufficientBalanceError(err)) {
        const { required_minor, balance_minor, currency } = err.detail;
        setAddMoneyCurrency(currency);
        setAddMoneyAmount(toMajorUnits(Math.max(required_minor - balance_minor, 0)));
        setAddMoneyOpen(true);
        notifyError(checkoutErrorKey("INSUFFICIENT_BALANCE"));
        return;
      }
      const code = err instanceof UniversalCartApiError ? err.code : undefined;
      notifyError(checkoutErrorKey(code));
      if (code) console.warn("[Phase 0] checkout failed:", code);
    }
  };

  return (
    <main className="container mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6" />
          {t("universalCart.page.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("universalCart.page.subtitle")}
        </p>
      </header>

      <Tabs defaultValue="cart" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cart">{t("universalCart.tabs.cart")}</TabsTrigger>
          <TabsTrigger value="saved">{t("universalCart.tabs.saved")}</TabsTrigger>
        </TabsList>

        {/* ---- Cart tab: buyable list + wallet + checkout ---- */}
        <TabsContent value="cart" className="mt-4">
          {isCartEmpty ? (
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
              <GatewayWalletBalanceCard />

              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CartLineHeader item={item} />
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
                      onClick={() => onSetSaved(item, true)}
                      disabled={isPatching}
                    >
                      <Bookmark className="mr-2 h-4 w-4" />
                      {t("universalCart.saved.saveForLater")}
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {affiliateRedirects.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <h2 className="text-sm font-medium">
                      {t("marketplaceCheckout.checkout.affiliateTitle")}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {t("marketplaceCheckout.checkout.affiliateBody")}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {affiliateRedirects.map((r) => (
                      <Button
                        key={r.item_id}
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                      >
                        <a href={r.affiliate_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {t("marketplaceCheckout.checkout.affiliateLink")}
                        </a>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={onCheckout}
                disabled={isCartEmpty || isCheckingOut}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("marketplaceCheckout.checkout.processing")}
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    {t("marketplaceCheckout.checkout.button")}
                  </>
                )}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ---- Saved tab: items flagged metadata.saved ---- */}
        <TabsContent value="saved" className="mt-4">
          {isSavedEmpty ? (
            <Card>
              <CardContent className="py-10 text-center space-y-3">
                <h2 className="text-lg font-medium">
                  {t("universalCart.saved.emptyTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("universalCart.saved.emptyBody")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {savedItems.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CartLineHeader item={item} />
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
                  <CardContent className="flex items-center justify-end gap-3 pt-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onSetSaved(item, false)}
                      disabled={isPatching}
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      {t("universalCart.saved.moveToCart")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddMoneyDialog
        open={addMoneyOpen}
        onOpenChange={setAddMoneyOpen}
        initialCurrency={addMoneyCurrency}
        initialAmountMajor={addMoneyAmount}
      />
    </main>
  );
}
