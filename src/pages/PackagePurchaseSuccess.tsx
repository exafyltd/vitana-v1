import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Package, Gift, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { notify } from '@/lib/i18n-toast';

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
        <SEO title="Purchase Error | VITANA" description="Package purchase error" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <Package className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Missing Purchase Information</h1>
              <p className="text-muted-foreground mb-4">
                We couldn't find your purchase details. Please check your email for confirmation.
              </p>
              <Button onClick={() => navigate("/discover/orders")}>
                View My Orders
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (verifying) {
    return (
      <AppLayout>
        <SEO title="Confirming Purchase | VITANA" description="Confirming your package purchase" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Confirming your purchase...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !purchase) {
    return (
      <AppLayout>
        <SEO title="Purchase Error | VITANA" description="Package purchase error" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <Package className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Verification Failed</h1>
              <p className="text-muted-foreground mb-4">
                {error || "Unable to verify your purchase. Please contact support."}
              </p>
              <Button onClick={() => navigate("/discover/orders")}>
                View My Orders
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const pkg = purchase.business_packages;
  const items = pkg?.package_items || [];

  return (
    <AppLayout>
      <SEO 
        title="Purchase Successful | VITANA" 
        description="Your package purchase was successful" 
      />
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-lg w-full space-y-6">
          {/* Success Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground">
              A confirmation has been sent to <span className="font-medium">{purchase.buyer_email}</span>
            </p>
          </div>

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
                  <p className="text-sm font-medium text-muted-foreground">Includes:</p>
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
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="text-lg font-semibold">
                    {formatPrice(purchase.total_amount_cents, purchase.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1" 
              onClick={() => navigate("/discover/orders?tab=packages")}
            >
              <Gift className="h-4 w-4 mr-2" />
              Redeem Now
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate("/discover/orders")}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              View Orders
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PackagePurchaseSuccess;
