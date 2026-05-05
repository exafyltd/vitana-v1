import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useVoucherByCode, useClaimVoucher } from "@/hooks/useRedeemVoucher";
import { RedemptionLanding } from "@/components/voucher/RedemptionLanding";
import { RedemptionConfirm } from "@/components/voucher/RedemptionConfirm";
import { Loader2, Gift, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { t } from '@/lib/i18n-toast';

export default function RedeemVoucher() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const voucherCode = searchParams.get("voucher");
  const { user, loading: authLoading } = useAuth();
  const [redeemed, setRedeemed] = useState(false);

  const { data: voucherData, isLoading: voucherLoading, error: voucherError } = useVoucherByCode(voucherCode || "");
  const claimMutation = useClaimVoucher();

  // Handle successful redemption
  const handleRedemptionSuccess = () => {
    setRedeemed(true);
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#8b5cf6", "#f59e0b", "#10b981"],
    });
  };

  const handleClaim = async () => {
    if (!voucherData?.voucher?.id || !user?.id) return;
    
    try {
      await claimMutation.mutateAsync({
        voucherId: voucherData.voucher.id,
        userId: user.id,
      });
      handleRedemptionSuccess();
    } catch (error) {
      console.error("Claim failed:", error);
    }
  };

  // No voucher code in URL
  if (!voucherCode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('screens.redeemvoucher.invalidLink')}</h1>
          <p className="text-muted-foreground mb-6">
            This redemption link is missing the voucher code. Please check your email for the correct link.
          </p>
          <button
            onClick={() => navigate("/maxina")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Go to MAXINA
          </button>
        </motion.div>
      </div>
    );
  }

  // Loading states
  if (authLoading || voucherLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('screens.redeemvoucher.loadingYourGiftVoucher')}</p>
        </motion.div>
      </div>
    );
  }

  // Voucher not found or error
  if (voucherError || !voucherData?.voucher) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('screens.redeemvoucher.voucherNotFound')}</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find a voucher with this code. It may have been redeemed already or the link is incorrect.
          </p>
          <button
            onClick={() => navigate("/maxina")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Go to MAXINA
          </button>
        </motion.div>
      </div>
    );
  }

  // Voucher already redeemed
  if (voucherData.voucher.status === "redeemed" && !redeemed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('screens.redeemvoucher.alreadyRedeemed')}</h1>
          <p className="text-muted-foreground mb-6">
            This voucher has already been claimed. If you believe this is an error, please contact support.
          </p>
          <button
            onClick={() => navigate("/maxina")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Go to MAXINA
          </button>
        </motion.div>
      </div>
    );
  }

  // Voucher expired
  if (voucherData.voucher.expires_at && new Date(voucherData.voucher.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('screens.redeemvoucher.voucherExpired')}</h1>
          <p className="text-muted-foreground mb-6">
            This voucher has expired and can no longer be redeemed. Contact support if you need assistance.
          </p>
          <button
            onClick={() => navigate("/maxina")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            Go to MAXINA
          </button>
        </motion.div>
      </div>
    );
  }

  // Successfully redeemed state
  if (redeemed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('screens.redeemvoucher.voucherClaimed')}</h1>
          <p className="text-muted-foreground mb-6">
            Your {voucherData.order?.tierName || "wellness"} voucher has been added to your account. 
            Explore events and experiences to use your benefits.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/wallet")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              View Wallet
            </button>
            <button
              onClick={() => navigate("/comm/events-meetups")}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-medium hover:bg-secondary/80 transition-colors"
            >
              Browse Events
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // User not logged in - show landing page
  if (!user) {
    return (
      <RedemptionLanding 
        voucherData={voucherData} 
        voucherCode={voucherCode} 
      />
    );
  }

  // User logged in - show confirmation
  return (
    <RedemptionConfirm
      voucherData={voucherData}
      onClaim={handleClaim}
      isLoading={claimMutation.isPending}
      error={claimMutation.error?.message}
    />
  );
}
