import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useVoucherByCode, useClaimVoucher } from "@/hooks/useRedeemVoucher";
import { RedemptionLanding } from "@/components/voucher/RedemptionLanding";
import { RedemptionConfirm } from "@/components/voucher/RedemptionConfirm";
import AppLayout from "@/components/AppLayout";
import { ArchetypeSkeleton, ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { Gift, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { t } from '@/lib/i18n-toast';

/**
 * Desktop Spotlight, signed-in member: the page sits in the app shell
 * (AppLayout sidebar) inside the `form` frame. Otherwise (phones, flag off,
 * signed-out visitors) the page looks exactly as before.
 */
function RedeemShell({ inApp, children }: { inApp: boolean; children: ReactNode }) {
  if (!inApp) return <>{children}</>;
  return (
    <AppLayout>
      <ScreenFrame archetype="form">{children}</ScreenFrame>
    </AppLayout>
  );
}

/** The centred state column; inside the frame it drops the full-screen page backdrop. */
function stateClass(inApp: boolean, padded = true) {
  if (inApp) return "flex items-center justify-center py-10";
  return `min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center${padded ? " p-4" : ""}`;
}

export default function RedeemVoucher() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const voucherCode = searchParams.get("voucher");
  const { user, loading: authLoading } = useAuth();
  const spotlight = useSpotlightEnabled();
  const inApp = spotlight && !!user;
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
      <RedeemShell inApp={inApp}>
      <div className={stateClass(inApp)}>
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
            {t('screens.redeemvoucher.thisRedemptionLinkMissingVoucherCode')}
          </p>
          <button
            onClick={() => navigate("/maxina")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            {t('screens.redeemvoucher.goMaxina')}
          </button>
        </motion.div>
      </div>
      </RedeemShell>
    );
  }

  // Loading state — the gift voucher is being fetched (authLoading || voucherLoading),
  // so this is a data load: show the form skeleton, never a page spinner (SR-20).
  if (authLoading || voucherLoading) {
    return (
      <RedeemShell inApp={inApp}>
      <div className={inApp ? "" : stateClass(inApp, false)}>
        <div className={inApp ? "" : "mx-auto w-full max-w-form px-4"}>
          <ArchetypeSkeleton archetype="form" />
          <p className="mt-4 text-center text-muted-foreground">{t('screens.redeemvoucher.loadingYourGiftVoucher')}</p>
        </div>
      </div>
      </RedeemShell>
    );
  }

  // Voucher not found or error
  if (voucherError || !voucherData?.voucher) {
    return (
      <RedeemShell inApp={inApp}>
      <div className={stateClass(inApp)}>
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
            {t('screens.redeemvoucher.weCouldnTFindVoucherWith')}
          </p>
          <button
            onClick={() => navigate("/maxina")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            {t('screens.redeemvoucher.goMaxina')}
          </button>
        </motion.div>
      </div>
      </RedeemShell>
    );
  }

  // Voucher already redeemed
  if (voucherData.voucher.status === "redeemed" && !redeemed) {
    return (
      <RedeemShell inApp={inApp}>
      <div className={stateClass(inApp)}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-status-warning/10 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-status-warning" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('screens.redeemvoucher.alreadyRedeemed')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('screens.redeemvoucher.thisVoucherHasAlreadyClaimedIf')}
          </p>
          <button
            onClick={() => navigate("/maxina")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            {t('screens.redeemvoucher.goMaxina')}
          </button>
        </motion.div>
      </div>
      </RedeemShell>
    );
  }

  // Voucher expired
  if (voucherData.voucher.expires_at && new Date(voucherData.voucher.expires_at) < new Date()) {
    return (
      <RedeemShell inApp={inApp}>
      <div className={stateClass(inApp)}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('screens.redeemvoucher.voucherExpired')}</h1>
          <p className="text-muted-foreground mb-6">{t('screens.redeemvoucher.thisVoucherHasExpiredCanNo')}
          </p>
          <button
            onClick={() => navigate("/maxina")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            {t('screens.redeemvoucher.goMaxina')}
          </button>
        </motion.div>
      </div>
      </RedeemShell>
    );
  }

  // Successfully redeemed state
  if (redeemed) {
    return (
      <RedeemShell inApp={inApp}>
      <div className={stateClass(inApp)}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-status-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-status-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('screens.redeemvoucher.voucherClaimed')}</h1>
          <p className="text-muted-foreground mb-6">{t('screens.redeemvoucher.yourValue0VoucherHasAddedYour', { value0: voucherData.order?.tierName || "wellness" })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/wallet")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
            >{t('screens.redeemvoucher.viewWallet')}
            </button>
            <button
              onClick={() => navigate("/comm/events-meetups")}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-medium hover:bg-secondary/80 transition-colors"
            >{t('screens.redeemvoucher.browseEvents')}
            </button>
          </div>
        </motion.div>
      </div>
      </RedeemShell>
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
    <RedeemShell inApp={inApp}>
      <RedemptionConfirm
        voucherData={voucherData}
        onClaim={handleClaim}
        isLoading={claimMutation.isPending}
        error={claimMutation.error?.message}
        embedded={inApp}
      />
    </RedeemShell>
  );
}
