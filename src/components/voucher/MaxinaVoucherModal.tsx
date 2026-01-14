import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, Mail, ShoppingBag, Loader2, Gift, Sparkles, Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCreateVoucherCheckout } from "@/hooks/useVouchers";
import { toast } from "sonner";

type VoucherTier = "experience" | "exclusive";
type ModalState = "selection" | "loading" | "success";

interface MaxinaVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tiers = {
  experience: {
    name: "Experience",
    price: 99,
    icon: Sparkles,
    color: "from-violet-500 to-purple-600",
    benefits: [
      "1 premium community event access",
      "Personalized wellness consultation",
      "30-day Vitana+ trial included",
      "Beautifully designed e-voucher"
    ]
  },
  exclusive: {
    name: "Exclusive",
    price: 199,
    icon: Crown,
    color: "from-amber-500 to-orange-600",
    benefits: [
      "3 premium community events",
      "1-on-1 expert coaching session",
      "90-day Vitana+ subscription",
      "Priority booking + VIP perks"
    ]
  }
};

export const MaxinaVoucherModal = ({ open, onOpenChange }: MaxinaVoucherModalProps) => {
  const [selectedTier, setSelectedTier] = useState<VoucherTier | null>(null);
  const [modalState, setModalState] = useState<ModalState>("selection");
  const [searchParams, setSearchParams] = useSearchParams();
  const createCheckout = useCreateVoucherCheckout();

  // Check for success return from Stripe
  useEffect(() => {
    const voucherSuccess = searchParams.get("voucher_success");
    if (voucherSuccess === "true") {
      setModalState("success");
      onOpenChange(true);
      // Clean up URL params
      searchParams.delete("voucher_success");
      searchParams.delete("order_id");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, onOpenChange]);

  const handleBuyVoucher = async () => {
    if (!selectedTier) return;
    
    setModalState("loading");
    
    try {
      const result = await createCheckout.mutateAsync({ tier: selectedTier });
      
      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
      setModalState("selection");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setSelectedTier(null);
      setModalState("selection");
    }, 300);
  };

  const handleDownloadPdf = () => {
    // TODO: Implement PDF download
    console.log("Download PDF");
  };

  const handleSendEmail = () => {
    // TODO: Implement email send
    console.log("Send email");
  };

  const handleViewOrders = () => {
    // TODO: Navigate to orders
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {modalState === "selection" && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <DialogHeader className="mb-6">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Gift className="h-5 w-5 text-primary" />
                  Gift a Maxina Voucher
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Give the gift of wellness and community connection
                </p>
              </DialogHeader>

              <div className="space-y-3">
                {(Object.entries(tiers) as [VoucherTier, typeof tiers.experience][]).map(([key, tier]) => {
                  const Icon = tier.icon;
                  const isSelected = selectedTier === key;
                  
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedTier(key)}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 text-left transition-all",
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-md" 
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                          tier.color
                        )}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{tier.name}</span>
                            <span className="text-lg font-bold">€{tier.price}</span>
                          </div>
                          
                          <ul className="space-y-1">
                            {tier.benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button 
                onClick={handleBuyVoucher}
                disabled={!selectedTier}
                className="w-full mt-6 h-11"
              >
                <Gift className="h-4 w-4 mr-2" />
                Buy Voucher {selectedTier && `· €${tiers[selectedTier].price}`}
              </Button>
            </motion.div>
          )}

          {modalState === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-12 flex flex-col items-center justify-center"
            >
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Redirecting to secure checkout...</p>
            </motion.div>
          )}

          {modalState === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-1">Voucher Purchased!</h3>
                <p className="text-sm text-muted-foreground">
                  Your {selectedTier && tiers[selectedTier].name} voucher is ready
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={handleDownloadPdf}
                  variant="outline"
                  className="w-full justify-start h-12"
                >
                  <Download className="h-4 w-4 mr-3" />
                  Download PDF Voucher
                </Button>
                
                <Button 
                  onClick={handleSendEmail}
                  variant="outline"
                  className="w-full justify-start h-12"
                >
                  <Mail className="h-4 w-4 mr-3" />
                  Send to Recipient by Email
                </Button>
                
                <Button 
                  onClick={handleViewOrders}
                  variant="ghost"
                  className="w-full justify-start h-12 text-muted-foreground"
                >
                  <ShoppingBag className="h-4 w-4 mr-3" />
                  View in Orders
                </Button>
              </div>

              <Button 
                onClick={handleClose}
                className="w-full mt-4"
              >
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
