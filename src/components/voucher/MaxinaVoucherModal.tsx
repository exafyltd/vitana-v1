import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, Mail, ShoppingBag, Loader2, Gift, Sparkles, Crown, X, Send, Share2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContentNoAnimation, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCreateVoucherCheckout, useDownloadVoucherPdf, useSendVoucherEmail, VoucherData } from "@/hooks/useVouchers";
import { toast } from "sonner";

type VoucherTier = "test" | "experience" | "exclusive";
type DownloadOverlayState = "idle" | "downloading" | "error";
type ModalState = "selection" | "loading" | "success" | "email-form" | "pdf-preview";

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
  
  // PDF preview state (mobile only)
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [previewVoucher, setPreviewVoucher] = useState<VoucherData | null>(null);
  const [downloadOverlayState, setDownloadOverlayState] = useState<DownloadOverlayState>("idle");
  const [canShareUrl, setCanShareUrl] = useState(false);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const createCheckout = useCreateVoucherCheckout();
  const downloadPdf = useDownloadVoucherPdf();
  const sendEmail = useSendVoucherEmail();

  // Detect Web Share API capability on mount
  useEffect(() => {
    // Check if navigator.share is available (basic URL sharing)
    const hasShareApi = typeof navigator.share === 'function';
    setCanShareUrl(hasShareApi);
  }, []);

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

  // Immediately reset all state and close - no animation delays
  const resetAndClose = () => {
    setDownloadOverlayState("idle");
    setSelectedTier(null);
    setModalState("selection");
    setCompletedOrderId(null);
    setCompletedTier(null);
    setRecipientEmail("");
    setRecipientName("");
    setPersonalMessage("");
    setSignedPdfUrl(null);
    setPreviewVoucher(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    resetAndClose();
  };
  
  // Handle share via Web Share API (URL only - works in more WebViews)
  const handleShareUrl = async () => {
    if (!signedPdfUrl) return;
    
    try {
      await navigator.share({
        title: 'Vitana Gift Voucher',
        text: 'Here is your Vitana wellness voucher',
        url: signedPdfUrl
      });
      toast.success("Voucher shared successfully!");
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        // Fallback to download overlay flow if share fails
        handleDownloadDirect();
      }
    }
  };
  
  // Direct download - uses anchor with download attribute
  // Auto-closes modal IMMEDIATELY after download triggers so only system dialog remains
  const handleDownloadDirect = () => {
    if (!signedPdfUrl || downloadOverlayState === "downloading") return;
    
    // Show downloading overlay immediately
    setDownloadOverlayState("downloading");
    
    try {
      // Create a temporary anchor with download attribute
      // Use voucher code in filename for consistency with preview
      const filename = previewVoucher?.code 
        ? `vitana-voucher-${previewVoucher.code}.pdf`
        : `vitana-voucher-${completedOrderId || 'gift'}.pdf`;
      
      const link = document.createElement('a');
      link.href = signedPdfUrl;
      link.download = filename;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // After brief delay, immediately close everything
      // Using 800ms to let the download start, then close so system dialog is visible
      setTimeout(() => {
        resetAndClose();
      }, 800);
      
    } catch (error) {
      console.error("Download failed:", error);
      // Show error state with copy link fallback
      setDownloadOverlayState("error");
    }
  };
  
  // Open in external browser - escape hatch for WebViews
  const handleOpenInBrowser = () => {
    if (!signedPdfUrl) return;
    
    const newWindow = window.open(signedPdfUrl, '_blank', 'noopener,noreferrer');
    
    // If popup was blocked, copy link as fallback
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      handleCopyLink();
      toast.info("Link copied! Paste in your browser to download.");
    }
  };
  
  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!signedPdfUrl) return;
    
    try {
      await navigator.clipboard.writeText(signedPdfUrl);
      toast.success("Link copied! Paste in browser to download.");
    } catch (error) {
      toast.error("Could not copy link");
    }
  };
  
  // Close PDF preview and return to success state
  const handleClosePdfPreview = () => {
    setSignedPdfUrl(null);
    setModalState("success");
  };

  const handleDownloadPdf = async () => {
    if (!completedOrderId) {
      toast.error("Order not found");
      return;
    }
    
    const loadingToast = toast.loading("Generating voucher...");
    
    try {
      const result = await downloadPdf.mutateAsync(completedOrderId);
      
      if (!result?.voucher || !result?.signedPdfUrl) {
        toast.dismiss(loadingToast);
        toast.error("Failed to load voucher data");
        return;
      }
      
      toast.dismiss(loadingToast);
      
      // Detect mobile devices
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile: Show in-app HTML preview with voucher data + signed URL for actions
        setPreviewVoucher(result.voucher);
        setSignedPdfUrl(result.signedPdfUrl);
        setModalState("pdf-preview");
      } else {
        // Desktop: Direct download via opening URL
        window.open(result.signedPdfUrl, '_blank');
        toast.success("Voucher downloaded!");
      }
    } catch (error: any) {
      console.error("Download error:", error);
      toast.dismiss(loadingToast);
      
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
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) resetAndClose(); }}>
      <DialogContentNoAnimation className="sm:max-w-md p-0 overflow-hidden">
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
                  Download Voucher
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

          {/* Mobile Voucher Preview - HTML card (works in all WebViews) */}
          {modalState === "pdf-preview" && previewVoucher && signedPdfUrl && (
            <motion.div
              key="pdf-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-[85vh] relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Your Voucher</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClosePdfPreview}
                  disabled={downloadOverlayState === "downloading"}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Voucher Card Preview - styled HTML (no iframe) */}
              <div className="flex-1 overflow-auto p-4 bg-gradient-to-b from-primary/5 to-background">
                <div className="bg-card rounded-2xl shadow-lg border p-6 max-w-sm mx-auto">
                  {/* Logo */}
                  <div className="text-center mb-4">
                    <h1 className="text-2xl font-bold text-primary">VITANA</h1>
                    <div className="text-5xl my-4">🎁</div>
                    <p className="text-muted-foreground text-sm uppercase tracking-wider">Gift Voucher</p>
                  </div>
                  
                  {/* Tier Badge */}
                  <div className="flex justify-center mb-4">
                    <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold">
                      {previewVoucher.tierName?.toUpperCase() || previewVoucher.tier?.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Price */}
                  <div className="text-center mb-5">
                    <p className="text-4xl font-bold text-foreground">{previewVoucher.price}</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Valid until {previewVoucher.expiresAt}
                    </p>
                  </div>
                  
                  {/* Voucher Code */}
                  <div className="bg-muted rounded-xl p-4 text-center mb-5">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Voucher Code</p>
                    <p className="font-mono font-bold text-lg tracking-widest text-foreground">
                      {previewVoucher.code}
                    </p>
                  </div>
                  
                  {/* Benefits */}
                  {previewVoucher.benefits && previewVoucher.benefits.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">What's Included</p>
                      {previewVoucher.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t space-y-2">
                {canShareUrl ? (
                  <>
                    <Button
                      onClick={handleShareUrl}
                      className="w-full h-12"
                      disabled={downloadOverlayState === "downloading"}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Save / Share
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadDirect}
                      className="w-full"
                      disabled={downloadOverlayState === "downloading"}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleDownloadDirect}
                      className="w-full h-12"
                      disabled={downloadOverlayState === "downloading"}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleOpenInBrowser}
                        className="flex-1"
                        disabled={downloadOverlayState === "downloading"}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in Browser
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCopyLink}
                        className="flex-1"
                        disabled={downloadOverlayState === "downloading"}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                    </div>
                  </>
                )}
                <p className="text-xs text-center text-muted-foreground">
                  {canShareUrl ? "Save to Files, Drive, or send to someone" : "If download opens blank, tap Open in Browser"}
                </p>
              </div>

              {/* Download Overlay - brief spinner, then auto-closes */}
              <AnimatePresence>
                {downloadOverlayState !== "idle" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50"
                  >
                    <div className="bg-card rounded-2xl shadow-xl border p-6 mx-4 max-w-xs w-full text-center">
                      {downloadOverlayState === "downloading" && (
                        <>
                          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
                          <h4 className="font-semibold text-lg mb-1">Downloading voucher…</h4>
                          <p className="text-sm text-muted-foreground">
                            Please wait a moment
                          </p>
                        </>
                      )}
                      
                      {downloadOverlayState === "error" && (
                        <>
                          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                            <X className="h-7 w-7 text-destructive" />
                          </div>
                          <h4 className="font-semibold text-lg mb-1">Download issue</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Copy the link and open in your browser
                          </p>
                          <div className="space-y-2">
                            <Button
                              onClick={handleCopyLink}
                              className="w-full"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setDownloadOverlayState("idle")}
                              className="w-full"
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContentNoAnimation>
    </Dialog>
  );
};
