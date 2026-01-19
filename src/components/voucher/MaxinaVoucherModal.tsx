import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, Mail, ShoppingBag, Loader2, Gift, Sparkles, Crown, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCreateVoucherCheckout, useDownloadVoucherPdf, useSendVoucherEmail, VoucherData } from "@/hooks/useVouchers";
import { toast } from "sonner";

type VoucherTier = "test" | "experience" | "exclusive";
type ModalState = "selection" | "loading" | "success" | "email-form";

interface MaxinaVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tiers = {
  test: {
    name: "Test",
    price: 0.49,
    icon: Gift,
    color: "from-green-500 to-emerald-600",
    benefits: [
      "Payment flow test only",
      "Not a real voucher",
      "For development testing"
    ]
  },
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
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [completedTier, setCompletedTier] = useState<VoucherTier | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const createCheckout = useCreateVoucherCheckout();
  const downloadPdf = useDownloadVoucherPdf();
  const sendEmail = useSendVoucherEmail();

  // Check for success return from Stripe
  useEffect(() => {
    const voucherSuccess = searchParams.get("voucher_success");
    const orderId = searchParams.get("order_id");
    const tier = searchParams.get("tier") as VoucherTier | null;
    
    if (voucherSuccess === "true" && orderId) {
      setCompletedOrderId(orderId);
      setCompletedTier(tier);
      setModalState("success");
      onOpenChange(true);
      // Clean up URL params
      searchParams.delete("voucher_success");
      searchParams.delete("order_id");
      searchParams.delete("tier");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, onOpenChange]);

  const handleBuyVoucher = async () => {
    if (!selectedTier) return;
    
    setModalState("loading");
    
    try {
      const result = await createCheckout.mutateAsync({ tier: selectedTier });
      
      // Open Stripe Checkout in popup window (same as ticket purchase flow)
      if (result.url) {
        const width = 600;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        const features = `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`;
        
        const popup = window.open(result.url, 'stripe-voucher-checkout', features);
        
        if (!popup) {
          toast.error("Please allow popups to complete your voucher purchase");
          setModalState("selection");
          return;
        }
        
        // Close modal - user is now in popup
        setModalState("selection");
        onOpenChange(false);
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
      setCompletedOrderId(null);
      setCompletedTier(null);
      setRecipientEmail("");
      setRecipientName("");
      setPersonalMessage("");
    }, 300);
  };

  const handleDownloadPdf = async () => {
    if (!completedOrderId) {
      toast.error("Order not found");
      return;
    }
    
    const loadingToast = toast.loading("Generating voucher PDF...");
    
    try {
      const result = await downloadPdf.mutateAsync(completedOrderId);
      
      if (!result?.voucher) {
        toast.dismiss(loadingToast);
        toast.error("Failed to load voucher data");
        return;
      }
      const voucher = result.voucher;
      
      // Generate PDF using browser print
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.dismiss(loadingToast);
        toast.error("Please allow popups to view your voucher. Check your browser settings.");
        return;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Vitana Gift Voucher - ${voucher.tierName}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', sans-serif; 
              background: linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .voucher {
              background: white;
              border-radius: 24px;
              padding: 24px;
              width: 100%;
              max-width: 100%;
              box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1);
              text-align: center;
            }
            .logo { font-size: 28px; font-weight: 700; color: #8b5cf6; margin-bottom: 20px; }
            .gift-icon { font-size: 48px; margin-bottom: 12px; }
            .tier-badge {
              display: inline-block;
              background: linear-gradient(135deg, #8b5cf6, #a78bfa);
              color: white;
              padding: 8px 20px;
              border-radius: 100px;
              font-weight: 600;
              margin-bottom: 12px;
              font-size: 14px;
            }
            .price { font-size: 36px; font-weight: 700; color: #18181b; margin-bottom: 6px; }
            .expires { color: #71717a; margin-bottom: 24px; font-size: 14px; }
            .code-box {
              background: #f4f4f5;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 24px;
            }
            .code-label { color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
            .code { font-family: monospace; font-size: 20px; font-weight: 700; color: #18181b; letter-spacing: 2px; word-break: break-all; }
            .benefits { text-align: left; }
            .benefits-label { color: #71717a; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
            .benefit { display: flex; align-items: flex-start; margin-bottom: 6px; color: #3f3f46; font-size: 14px; }
            .benefit::before { content: '✓'; color: #8b5cf6; margin-right: 10px; font-weight: 600; }
            .footer { margin-top: 24px; color: #a1a1aa; font-size: 11px; }
            
            /* Desktop styles */
            @media screen and (min-width: 600px) {
              body { padding: 40px; }
              .voucher {
                padding: 48px;
                max-width: 500px;
              }
              .logo { font-size: 32px; margin-bottom: 24px; }
              .gift-icon { font-size: 64px; margin-bottom: 16px; }
              .tier-badge { padding: 8px 24px; margin-bottom: 16px; font-size: 16px; }
              .price { font-size: 48px; margin-bottom: 8px; }
              .expires { margin-bottom: 32px; font-size: 16px; }
              .code-box { padding: 20px; margin-bottom: 32px; }
              .code-label { font-size: 12px; margin-bottom: 8px; }
              .code { font-size: 28px; letter-spacing: 3px; }
              .benefits-label { font-size: 12px; margin-bottom: 12px; }
              .benefit { margin-bottom: 8px; font-size: 16px; }
              .footer { margin-top: 32px; font-size: 12px; }
            }
            
            @media print {
              body { background: white; padding: 10px; }
              .voucher { 
                box-shadow: none; 
                border: 2px solid #e4e4e7;
                max-width: 100%;
                width: 100%;
              }
            }
          </style>
        </head>
          <body>
            <div class="voucher">
              <div class="logo">VITANA</div>
              <div class="gift-icon">🎁</div>
              <div class="tier-badge">${voucher.tierName}</div>
              <div class="price">${voucher.price}</div>
              <div class="expires">Valid until ${voucher.expiresAt}</div>
              
              <div class="code-box">
                <div class="code-label">Voucher Code</div>
                <div class="code">${voucher.code}</div>
              </div>
              
              <div class="benefits">
                <div class="benefits-label">What's included</div>
                ${voucher.benefits.map((b: string) => `<div class="benefit">${b}</div>`).join('')}
              </div>
              
              <div class="footer">
                Purchased on ${voucher.purchaseDate}<br>
                Redeem at vitana-v1.lovable.app
              </div>
            </div>
            <script>window.print();</script>
          </body>
          </html>
        `);
      printWindow.document.close();
      
      toast.dismiss(loadingToast);
      toast.success("Voucher PDF ready!");
    } catch (error: any) {
      console.error("Download error:", error);
      toast.dismiss(loadingToast);
      
      // Extract the actual error message from the response
      const errorMessage = error?.message || 
        error?.context?.body?.error || 
        error?.error || 
        "Failed to download voucher. Please try again.";
      
      toast.error(errorMessage);
    }
  };

  const handleSendEmail = () => {
    setModalState("email-form");
  };

  const handleConfirmSendEmail = async () => {
    if (!completedOrderId || !recipientEmail) {
      toast.error("Please enter recipient email");
      return;
    }

    const loadingToast = toast.loading("Sending voucher email...");
    
    try {
      const result = await sendEmail.mutateAsync({
        orderId: completedOrderId,
        recipientEmail,
        recipientName,
        message: personalMessage,
      });
      
      toast.dismiss(loadingToast);
      toast.success(`Voucher sent to ${recipientEmail}!`);
      setModalState("success");
      setRecipientEmail("");
      setRecipientName("");
      setPersonalMessage("");
    } catch (error: any) {
      console.error("Email send error:", error);
      toast.dismiss(loadingToast);
      
      // Extract the actual error message from the response
      const errorMessage = error?.message || 
        error?.context?.body?.error || 
        error?.error || 
        "Failed to send email. Please try again.";
      
      toast.error(errorMessage);
    }
  };

  const handleViewOrders = () => {
    handleClose();
    navigate("/discover/orders?tab=vouchers");
  };

  const tierForDisplay = completedTier || selectedTier;

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
              <p className="text-sm text-muted-foreground">Opening secure checkout...</p>
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
                  Your {tierForDisplay && tiers[tierForDisplay].name} voucher is ready
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={handleDownloadPdf}
                  variant="outline"
                  className="w-full justify-start h-12"
                  disabled={downloadPdf.isPending}
                >
                  {downloadPdf.isPending ? (
                    <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-3" />
                  )}
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

          {modalState === "email-form" && (
            <motion.div
              key="email-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <DialogHeader className="mb-6">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Mail className="h-5 w-5 text-primary" />
                  Send Voucher by Email
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  We'll send a beautifully designed email with the voucher
                </p>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipientEmail">Recipient Email *</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="friend@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="recipientName">Recipient Name (optional)</Label>
                  <Input
                    id="recipientName"
                    type="text"
                    placeholder="Jane"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="personalMessage">Personal Message (optional)</Label>
                  <Textarea
                    id="personalMessage"
                    placeholder="Happy Birthday! Enjoy this wellness treat..."
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    className="mt-1 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setModalState("success")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmSendEmail}
                  disabled={!recipientEmail || sendEmail.isPending}
                  className="flex-1"
                >
                  {sendEmail.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Voucher
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
