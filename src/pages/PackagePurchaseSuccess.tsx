import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Package, Gift, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel as Card, PanelContent as CardContent } from "@/components/layout/spotlight/Panel";
import { ArchetypeSkeleton, ScreenFrame } from "@/components/layout/spotlight";
import { VCard } from "@/components/ui/vcard";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { notify, t } from '@/lib/i18n-toast';

interface PackageItem {
  id: string;
  item_type: string;
  item_name: string;
  quantity: number;
}

interface PurchaseDetails {
  id: string;
  buyer_email: string;
  buyer_name: string;
  quantity: number;
  total_amount_cents: number;
  currency: string;
  status: string;
  business_packages: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    price_cents: number;
    currency: string;
    package_items: PackageItem[];
  };
}

const PackagePurchaseSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const spotlight = useSpotlightEnabled();
  const { toast } = useToast();
  
  const purchaseId = searchParams.get("purchase_id");
  const sessionId = searchParams.get("session_id");
  
  const [verifying, setVerifying] = useState(true);
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!purchaseId || !sessionId) {
        setError("Missing purchase information");
        setVerifying(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke("verify-package-payment", {
          body: { purchase_id: purchaseId, session_id: sessionId },
        });

        if (fnError || data?.error) {
          throw new Error(data?.error || fnError?.message || "Verification failed");
        }

        setPurchase(data.purchase);
        notify('toasts.packagepurchasesuccess.paymentConfirmed', 'toasts.packagepurchasesuccess.yourPackagePurchaseSuccessful');
      } catch (err) {
        console.error("Verification error:", err);
        setError(err instanceof Error ? err.message : "Failed to verify payment");
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [purchaseId, sessionId, toast]);

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  if (!purchaseId || !sessionId) {
    return (
      <AppLayout>
        <SEO title={t('screens.packagepurchasesuccess.purchaseErrorVitana')} description="Package purchase error" />
        <Shell spotlight={spotlight}>
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <Package className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">{t('screens.packagepurchasesuccess.missingPurchaseInformation')}</h1>
              <p className="text-muted-foreground mb-4">
                {t('screens.packagepurchasesuccess.weCouldnTFindYourPurchase')}
              </p>
              <Button onClick={() => navigate("/discover/orders")}>
                {t('screens.packagepurchasesuccess.viewMyOrders')}
              </Button>
            </CardContent>
          </Card>
        </Shell>
      </AppLayout>
    );
  }

  if (verifying) {
    return (
      <AppLayout>
        <SEO title={t('screens.packagepurchasesuccess.confirmingPurchaseVitana')} description="Confirming your package purchase" />
        <Shell spotlight={spotlight}>
          <div className="w-full max-w-lg space-y-4">
            <ArchetypeSkeleton archetype="collection" />
            <p className="text-center text-lg text-muted-foreground">{t('screens.packagepurchasesuccess.confirmingYourPurchase')}</p>
          </div>
        </Shell>
      </AppLayout>
    );
  }

  if (error || !purchase) {
    return (
      <AppLayout>
        <SEO title={t('screens.packagepurchasesuccess.purchaseErrorVitana')} description="Package purchase error" />
        <Shell spotlight={spotlight}>
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <Package className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">{t('screens.packagepurchasesuccess.verificationFailed')}</h1>
              <p className="text-muted-foreground mb-4">
                {error || "Unable to verify your purchase. Please contact support."}
              </p>
              <Button onClick={() => navigate("/discover/orders")}>
                {t('screens.packagepurchasesuccess.viewMyOrders')}
              </Button>
            </CardContent>
          </Card>
        </Shell>
      </AppLayout>
    );
  }

  const pkg = purchase.business_packages;
  const items = pkg?.package_items || [];

  return (
    <AppLayout>
      <SEO 
        title={t('screens.packagepurchasesuccess.purchaseSuccessfulVitana')} 
        description="Your package purchase was successful" 
      />
      <Shell spotlight={spotlight}>
        <div className="max-w-lg w-full space-y-6">
          {/* Success Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-status-success/10 mb-4">
              <CheckCircle className="h-10 w-10 text-status-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('screens.packagepurchasesuccess.paymentSuccessful')}</h1>
            <p className="text-muted-foreground">
              {t('screens.packagepurchasesuccess.confirmationHasSent')} <span className="font-medium">{purchase.buyer_email}</span>
            </p>
          </div>

          {spotlight ? (
            <VCard
              size="standard"
              media={pkg?.image_url ? { src: pkg.image_url, alt: pkg.title } : undefined}
              title={<h2>{pkg?.title}</h2>}
              meta={pkg?.description ?? undefined}
              body={
                <div className="space-y-4 text-foreground">
              {/* Items Included */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t('screens.packagepurchasesuccess.includes')}</p>
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-sm">
                        <Gift className="h-4 w-4 text-primary" />
                        <span>{item.quantity}x {item.item_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Price Summary */}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('screens.packagepurchasesuccess.totalPaid')}</span>
                  <span className="text-lg font-semibold">
                    {formatPrice(purchase.total_amount_cents, purchase.currency)}
                  </span>
                </div>
              </div>
                </div>
              }
            />
          ) : (
          <>
          {/* Package Card */}
          <Card className="overflow-hidden">
            {pkg?.image_url && (
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={pkg.image_url}
                  alt={pkg.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardContent className="p-4 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{pkg?.title}</h2>
                {pkg?.description && (
                  <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                )}
              </div>

              {/* Items Included */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t('screens.packagepurchasesuccess.includes')}</p>
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-sm">
                        <Gift className="h-4 w-4 text-primary" />
                        <span>{item.quantity}x {item.item_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Price Summary */}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('screens.packagepurchasesuccess.totalPaid')}</span>
                  <span className="text-lg font-semibold">
                    {formatPrice(purchase.total_amount_cents, purchase.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          </>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1" 
              onClick={() => navigate("/discover/orders?tab=packages")}
            >
              <Gift className="h-4 w-4 me-2" />
              {t('screens.packagepurchasesuccess.redeemNow')}
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate("/discover/orders")}
            >
              <ShoppingBag className="h-4 w-4 me-2" />
              {t('screens.packagepurchasesuccess.viewOrders')}
            </Button>
          </div>
        </div>
      </Shell>
    </AppLayout>
  );
};

/**
 * VTID-05117: Spotlight on → the manifest's `collection` frame; off → today's
 * vertically centred block.
 */
function Shell({ spotlight, children }: { spotlight: boolean; children: ReactNode }) {
  if (spotlight) {
    return (
      <ScreenFrame archetype="collection">
        <div className="flex flex-col items-center py-6">{children}</div>
      </ScreenFrame>
    );
  }
  // design-allow-next-line: legacy (flag-off) block keeps its viewport-relative centring unchanged
  return <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">{children}</div>;
}

export default PackagePurchaseSuccess;
