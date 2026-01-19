import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, Mail, ShoppingBag, Loader2, Gift, Sparkles, Crown, X, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCreateVoucherCheckout, useDownloadVoucherPdf, useSendVoucherEmail, VoucherData } from "@/hooks/useVouchers";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

type VoucherTier = "test" | "experience" | "exclusive";
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
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  
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
    // Cleanup blob URL if exists
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
    }
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
      setPdfBlobUrl(null);
      setPdfBlob(null);
      setPdfFileName(null);
    }, 300);
  };
  
  // Handle share via Web Share API (mobile PDF preview)
  const handleSharePdf = async () => {
    if (!pdfBlob || !pdfFileName) return;
    
    const file = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
    const shareData = { files: [file], title: 'Vitana Gift Voucher' };
    
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success("Voucher saved/shared successfully!");
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          toast.error("Could not share. Please try again.");
        }
      }
    } else {
      toast.error("Sharing not supported on this device");
    }
  };
  
  // Close PDF preview and return to success state
  const handleClosePdfPreview = () => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
    }
    setPdfBlobUrl(null);
    setPdfBlob(null);
    setPdfFileName(null);
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
      
      if (!result?.voucher) {
        toast.dismiss(loadingToast);
        toast.error("Failed to load voucher data");
        return;
      }
      const voucher = result.voucher;
      
      // Create PDF document (A4 portrait)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;
      
      // Background gradient simulation (light purple tint)
      doc.setFillColor(250, 245, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // White card background
      const cardMargin = 25;
      const cardWidth = pageWidth - (cardMargin * 2);
      const cardHeight = 220;
      const cardY = 30;
      
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cardMargin, cardY, cardWidth, cardHeight, 8, 8, 'F');
      
      // Add subtle border
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.roundedRect(cardMargin, cardY, cardWidth, cardHeight, 8, 8, 'S');
      
      let yPos = cardY + 20;
      
      // VITANA Logo
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(139, 92, 246); // Purple
      doc.text('VITANA', centerX, yPos, { align: 'center' });
      yPos += 15;
      
      // Gift emoji (using text since emojis are tricky in jsPDF)
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text('GIFT VOUCHER', centerX, yPos, { align: 'center' });
      yPos += 18;
      
      // Tier badge
      const tierBadgeWidth = 50;
      const tierBadgeHeight = 10;
      doc.setFillColor(139, 92, 246); // Purple
      doc.roundedRect(centerX - tierBadgeWidth/2, yPos - 7, tierBadgeWidth, tierBadgeHeight, 5, 5, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(voucher.tierName.toUpperCase(), centerX, yPos, { align: 'center' });
      yPos += 18;
      
      // Price
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 24, 27);
      doc.text(voucher.price, centerX, yPos, { align: 'center' });
      yPos += 12;
      
      // Expiry
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(113, 113, 122);
      doc.text(`Valid until ${voucher.expiresAt}`, centerX, yPos, { align: 'center' });
      yPos += 18;
      
      // Voucher code box
      const codeBoxWidth = cardWidth - 40;
      const codeBoxHeight = 28;
      const codeBoxX = cardMargin + 20;
      doc.setFillColor(244, 244, 245);
      doc.roundedRect(codeBoxX, yPos - 5, codeBoxWidth, codeBoxHeight, 4, 4, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(113, 113, 122);
      doc.text('VOUCHER CODE', centerX, yPos + 3, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('courier', 'bold');
      doc.setTextColor(24, 24, 27);
      doc.text(voucher.code, centerX, yPos + 15, { align: 'center' });
      yPos += codeBoxHeight + 15;
      
      // Benefits section
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(113, 113, 122);
      doc.text("WHAT'S INCLUDED", cardMargin + 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(63, 63, 70);
      voucher.benefits.forEach((benefit: string) => {
        doc.setTextColor(139, 92, 246);
        doc.text('✓', cardMargin + 20, yPos);
        doc.setTextColor(63, 63, 70);
        doc.setFont('helvetica', 'normal');
        doc.text(benefit, cardMargin + 28, yPos);
        yPos += 7;
      });
      
      // Footer
      yPos = cardY + cardHeight - 15;
      doc.setFontSize(9);
      doc.setTextColor(161, 161, 170);
      doc.text(`Purchased on ${voucher.purchaseDate}`, centerX, yPos, { align: 'center' });
      yPos += 5;
      doc.text('Redeem at vitana-v1.lovable.app', centerX, yPos, { align: 'center' });
      
      // Convert PDF to blob with explicit MIME type for better compatibility
      const pdfArrayBuffer = doc.output('arraybuffer');
      const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      const fileName = `vitana-voucher-${voucher.code}.pdf`;
      
      // Detect mobile devices
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      toast.dismiss(loadingToast);
      
      if (isMobile) {
        // Mobile: Show in-app PDF preview instead of opening new tab
        const blobUrl = URL.createObjectURL(pdfBlob);
        setPdfBlob(pdfBlob);
        setPdfBlobUrl(blobUrl);
        setPdfFileName(fileName);
        setModalState("pdf-preview");
      } else {
        // On desktop: Force automatic download
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Voucher downloaded!");
        // Cleanup after download starts
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
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

          {/* Mobile PDF Preview - Full screen in-app preview */}
          {modalState === "pdf-preview" && pdfBlobUrl && (
            <motion.div
              key="pdf-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Your Voucher</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClosePdfPreview}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* PDF Preview - takes remaining space */}
              <div className="flex-1 bg-muted/50 overflow-auto min-h-0">
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-full border-0"
                  title="Voucher Preview"
                />
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t space-y-2">
                <Button
                  onClick={handleSharePdf}
                  className="w-full h-12"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Save / Share
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Save to Files, Drive, or send to someone
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
