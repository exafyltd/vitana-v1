import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, Mail, ShoppingBag, Loader2, Gift, Sparkles, Crown, X, Send, Share2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContentNoAnimation,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCreateVoucherCheckout, useDownloadVoucherPdf, useSendVoucherEmail, VoucherData } from "@/hooks/useVouchers";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useTranslation } from "@/hooks/useTranslation";
// `t` from i18n-toast would shadow the local `const { t } = useTranslation()` below;
// using `lookup` (the same singleton, different name) avoids the conflict.
import { lookup } from '@/lib/i18n-toast';

type VoucherTier = "test" | "experience" | "exclusive";
type ModalState = "selection" | "loading" | "success" | "email-form" | "pdf-preview";

interface MaxinaVoucherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Static tier config (icons, colors, prices) - labels come from translations
const tierConfig = {
  test: {
    price: 0.49,
    icon: Gift,
    color: "from-green-500 to-emerald-600",
  },
  experience: {
    price: 99,
    icon: Sparkles,
    color: "from-violet-500 to-purple-600",
  },
  exclusive: {
    price: 199,
    icon: Crown,
    color: "from-amber-500 to-orange-600",
  }
};

export const MaxinaVoucherModal = ({ open, onOpenChange }: MaxinaVoucherModalProps) => {
  const { translate, t } = useTranslation();
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
  const [canShareUrl, setCanShareUrl] = useState(false);
  
  // Guard to prevent duplicate success handling
  const hasHandledSuccessRef = useRef(false);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const createCheckout = useCreateVoucherCheckout();
  const downloadPdf = useDownloadVoucherPdf();
  const sendEmail = useSendVoucherEmail();

  // Build localized tier data
  const tiers = useMemo(() => ({
    test: {
      ...tierConfig.test,
      name: translate('voucher.tiers.test.name'),
      benefits: t.voucher?.tiers?.test?.benefits || [],
    },
    experience: {
      ...tierConfig.experience,
      name: translate('voucher.tiers.experience.name'),
      benefits: t.voucher?.tiers?.experience?.benefits || [],
    },
    exclusive: {
      ...tierConfig.exclusive,
      name: translate('voucher.tiers.exclusive.name'),
      benefits: t.voucher?.tiers?.exclusive?.benefits || [],
    }
  }), [translate, t]);

  // Detect Web Share API capability on mount
  useEffect(() => {
    const hasShareApi = typeof navigator.share === "function";
    setCanShareUrl(hasShareApi);
  }, []);

  // Extra hardening for Appilix/WebView: lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Check for success return from Stripe - only handle once per navigation
  useEffect(() => {
    if (hasHandledSuccessRef.current) return;
    
    const voucherSuccess = searchParams.get("voucher_success");
    const orderId = searchParams.get("order_id");
    const tier = searchParams.get("tier") as VoucherTier | null;
    
    if (voucherSuccess === "true" && orderId) {
      hasHandledSuccessRef.current = true;
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

  // Reset guard when modal closes
  useEffect(() => {
    if (!open) {
      hasHandledSuccessRef.current = false;
    }
  }, [open]);

  const handleBuyVoucher = async () => {
    if (!selectedTier) return;
    
    setModalState("loading");
    
    // Capture current location BEFORE navigating to Stripe
    const originRoute = window.location.pathname + window.location.search;
    
    try {
      const result = await createCheckout.mutateAsync({ 
        tier: selectedTier,
        returnTo: originRoute
      });
      
      if (result.url) {
        // CRITICAL: Navigate in SAME window, not popup
        // This replaces the current page with Stripe Checkout
        // On return, user comes back to originRoute (not /home)
        window.location.href = result.url;
        // No need to reset state - page will navigate away
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(translate('voucher.toast.checkoutFailed'));
      setModalState("selection");
    }
  };

  // Immediately reset all state and close
  const resetAndClose = () => {
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
  
  // Handle share via Web Share API
  const handleShareUrl = async () => {
    if (!signedPdfUrl) return;
    
    try {
      await navigator.share({
        title: 'Vitana Gift Voucher',
        text: translate('voucher.preview.giftVoucher'),
        url: signedPdfUrl
      });
      toast.success(translate('voucher.toast.voucherShared'));
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        handleDownloadDirect();
      }
    }
  };
  
  // Direct download - pure action, NO navigation, modal stays open
  const handleDownloadDirect = () => {
    if (!signedPdfUrl) return;
    
    const url = signedPdfUrl;
    const filename = previewVoucher?.code 
      ? `vitana-voucher-${previewVoucher.code}.pdf`
      : `vitana-voucher-${completedOrderId || 'gift'}.pdf`;
    
    // DO NOT close the modal - just trigger download directly
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(translate('voucher.toast.downloadStarted'));
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(translate('voucher.toast.downloadFailedCopyLink'));
    }
  };
  
  // Open in external browser
  const handleOpenInBrowser = () => {
    if (!signedPdfUrl) return;
    
    const newWindow = window.open(signedPdfUrl, '_blank', 'noopener,noreferrer');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      handleCopyLink();
      toast.info(translate('voucher.toast.linkCopiedDesc'));
    }
  };
  
  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!signedPdfUrl) return;
    
    try {
      await navigator.clipboard.writeText(signedPdfUrl);
      toast.success(translate('voucher.toast.linkCopied'));
    } catch (error) {
      toast.error(translate('voucher.toast.downloadFailed'));
    }
  };
  
  // Close PDF preview and return to success state
  const handleClosePdfPreview = () => {
    setSignedPdfUrl(null);
    setModalState("success");
  };

  const handleDownloadPdf = async () => {
    if (!completedOrderId) {
      toast.error(translate('voucher.toast.failedToLoadVoucher'));
      return;
    }
    
    const loadingToast = toast.loading(translate('voucher.toast.generatingVoucher'));
    
    try {
      const result = await downloadPdf.mutateAsync(completedOrderId);
      
      if (!result?.voucher || !result?.signedPdfUrl) {
        toast.dismiss(loadingToast);
        toast.error(translate('voucher.toast.failedToLoadVoucher'));
        return;
      }
      
      toast.dismiss(loadingToast);
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        setPreviewVoucher(result.voucher);
        setSignedPdfUrl(result.signedPdfUrl);
        setModalState("pdf-preview");
      } else {
        // Desktop: trigger download directly via anchor, don't open new window
        const link = document.createElement('a');
        link.href = result.signedPdfUrl;
        link.download = `vitana-voucher-${result.voucher?.code || completedOrderId}.pdf`;
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(translate('voucher.toast.downloadStarted'));
        
        // AUTO-CLOSE after download initiated (desktop)
        setTimeout(() => resetAndClose(), 300);
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
      toast.error(translate('voucher.toast.enterRecipientEmail'));
      return;
    }

    const loadingToast = toast.loading(translate('voucher.toast.sendingVoucherEmail'));
    
    try {
      await sendEmail.mutateAsync({
        orderId: completedOrderId,
        recipientEmail,
        recipientName,
        message: personalMessage,
      });
      
      toast.dismiss(loadingToast);
      toast.success(translate('voucher.toast.voucherSent').replace('{email}', recipientEmail));
      
      // AUTO-CLOSE: Reset and close modal after successful send
      resetAndClose();
    } catch (error: any) {
      console.error("Email send error:", error);
      toast.dismiss(loadingToast);
      
      const errorMessage = error?.message || 
        error?.context?.body?.error || 
        error?.error || 
        translate('voucher.toast.downloadFailed');
      
      toast.error(errorMessage);
    }
  };

  const handleViewOrders = () => {
    // Close modal first, then navigate
    resetAndClose();
    setTimeout(() => {
      navigate("/discover/orders?tab=vouchers");
    }, 50);
  };

  const tierForDisplay = completedTier || selectedTier;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentNoAnimation
        overlayClassName="z-[99999]"
        className="z-[100000] w-[calc(100%-2rem)] max-w-md max-h-[100dvh] rounded-2xl p-0 gap-0 flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Hidden accessible title for screen readers */}
        <VisuallyHidden asChild>
          <DialogTitle>{translate('voucher.preview.giftVoucher')}</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden asChild>
          <DialogDescription>{translate('voucher.modal.subtitle')}</DialogDescription>
        </VisuallyHidden>

        <AnimatePresence mode="wait">
          {modalState === "selection" && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col h-full max-h-[85dvh]"
            >
              {/* Header - fixed height, doesn't scroll */}
              <div className="flex items-center justify-between p-6 pb-4 shrink-0">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <Gift className="h-5 w-5 text-primary" />
                    {translate('voucher.modal.title')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {translate('voucher.modal.subtitle')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Scrollable tier cards - takes remaining space */}
              <div 
                className="flex-1 overflow-y-auto overscroll-contain px-6 min-h-0"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="space-y-3 pb-4">
                  {(Object.entries(tiers) as [VoucherTier, typeof tiers.experience][]).map(([key, tier]) => {
                    const Icon = tier.icon;
                    const isSelected = selectedTier === key;
                    const benefits = Array.isArray(tier.benefits) ? tier.benefits : [];
                    
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
                              {benefits.map((benefit: string, i: number) => (
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
              </div>

              <div 
                className="shrink-0 px-6 pt-3 bg-background border-t border-border/50"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
              >
                <Button 
                  onClick={handleBuyVoucher}
                  disabled={!selectedTier}
                  className="w-full h-11"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  {translate('voucher.modal.buyVoucher')} {selectedTier && `· €${tiers[selectedTier].price}`}
                </Button>
              </div>
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
              <p className="text-sm text-muted-foreground">{translate('voucher.modal.openingCheckout')}</p>
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
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-1">{translate('voucher.success.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {translate('voucher.success.ready').replace('{tier}', tierForDisplay ? tiers[tierForDisplay].name : '')}
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
                  {translate('voucher.success.download')}
                </Button>
                
                <Button 
                  onClick={handleSendEmail}
                  variant="outline"
                  className="w-full justify-start h-12"
                >
                  <Mail className="h-4 w-4 mr-3" />
                  {translate('voucher.success.sendEmail')}
                </Button>
                
                <Button 
                  onClick={handleViewOrders}
                  variant="ghost"
                  className="w-full justify-start h-12 text-muted-foreground"
                >
                  <ShoppingBag className="h-4 w-4 mr-3" />
                  {translate('voucher.success.viewOrders')}
                </Button>
              </div>

              <Button 
                onClick={handleClose}
                className="w-full mt-4"
              >
                {translate('voucher.success.done')}
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <Mail className="h-5 w-5 text-primary" />
                    {translate('voucher.email.title')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {translate('voucher.email.subtitle')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipientEmail">{translate('voucher.email.recipientEmail')}</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder={lookup('screens.voucher.friendExampleCom')}
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="recipientName">{translate('voucher.email.recipientName')}</Label>
                  <Input
                    id="recipientName"
                    type="text"
                    placeholder={lookup('screens.voucher.jane')}
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="personalMessage">{translate('voucher.email.personalMessage')}</Label>
                  <Textarea
                    id="personalMessage"
                    placeholder={translate('voucher.email.messagePlaceholder')}
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
                  {translate('voucher.email.back')}
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
                  {translate('voucher.email.send')}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Mobile Voucher Preview */}
          {modalState === "pdf-preview" && previewVoucher && signedPdfUrl && (
            <motion.div
              key="pdf-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">{translate('voucher.preview.title')}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClosePdfPreview}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Voucher Card Preview */}
              <div className="flex-1 overflow-auto p-4 bg-gradient-to-b from-primary/5 to-background">
                <div className="bg-card rounded-2xl shadow-lg border p-6 max-w-sm mx-auto">
                  <div className="text-center mb-4">
                    <h1 className="text-2xl font-bold text-primary">VITANA</h1>
                    <div className="text-5xl my-4">🎁</div>
                    <p className="text-muted-foreground text-sm uppercase tracking-wider">{translate('voucher.preview.giftVoucher')}</p>
                  </div>
                  
                  <div className="flex justify-center mb-4">
                    <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold">
                      {previewVoucher.tierName?.toUpperCase() || previewVoucher.tier?.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-center mb-5">
                    <p className="text-4xl font-bold text-foreground">{previewVoucher.price}</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {translate('voucher.preview.validUntil').replace('{date}', previewVoucher.expiresAt)}
                    </p>
                  </div>
                  
                  <div className="bg-muted rounded-xl p-4 text-center mb-5">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{translate('voucher.preview.voucherCode')}</p>
                    <p className="font-mono font-bold text-lg tracking-widest text-foreground">
                      {previewVoucher.code}
                    </p>
                  </div>
                  
                  {previewVoucher.benefits && previewVoucher.benefits.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">{translate('voucher.preview.whatsIncluded')}</p>
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
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {translate('voucher.preview.share')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadDirect}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {translate('voucher.preview.downloadPdf')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleDownloadDirect}
                      className="w-full h-12"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {translate('voucher.preview.downloadPdf')}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleOpenInBrowser}
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {translate('voucher.preview.openInBrowser')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCopyLink}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {translate('voucher.preview.copyLink')}
                      </Button>
                    </div>
                  </>
                )}
                <p className="text-xs text-center text-muted-foreground">
                  {canShareUrl ? translate('voucher.preview.shareHint') : translate('voucher.preview.downloadHint')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContentNoAnimation>
    </Dialog>
  );
};
