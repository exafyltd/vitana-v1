import { motion } from "framer-motion";
import { Gift, Loader2, AlertCircle, Sparkles, Star } from "lucide-react";
import type { VoucherLookupData } from "@/hooks/useRedeemVoucher";
import { t } from '@/lib/i18n-toast';

interface RedemptionConfirmProps {
  voucherData: VoucherLookupData;
  onClaim: () => void;
  isLoading: boolean;
  error?: string;
}

const TIER_CONFIG: Record<string, { color: string; benefits: string[]; icon: React.ReactNode }> = {
  test: {
    color: "emerald",
    benefits: ["Payment flow test only", "Not a real voucher"],
    icon: <Gift className="w-6 h-6" />,
  },
  experience: {
    color: "violet",
    benefits: [
      "1 premium community event access",
      "Personalized wellness consultation",
      "30-day Vitana+ trial included",
      "Beautifully designed e-voucher",
    ],
    icon: <Sparkles className="w-6 h-6" />,
  },
  exclusive: {
    color: "amber",
    benefits: [
      "3 premium community events",
      "1-on-1 expert coaching session",
      "90-day Vitana+ subscription",
      "Priority booking + VIP perks",
    ],
    icon: <Star className="w-6 h-6" />,
  },
};

export function RedemptionConfirm({ voucherData, onClaim, isLoading, error }: RedemptionConfirmProps) {
  const tier = voucherData.voucher?.tier || "experience";
  const config = TIER_CONFIG[tier] || TIER_CONFIG.experience;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header with Logo */}
      <div className="safe-area-top" />
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-center py-4 px-4">
          <img 
            src="/images/maxina-logo.png" 
            alt="MAXINA" 
            className="h-8 w-auto"
          />
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Gift Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('screens.voucher.claimYourGift')}
          </h1>
          <p className="text-muted-foreground">
            {t('screens.voucher.youReAboutAddThisVoucher')}
          </p>
        </motion.div>

        {/* Voucher Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6"
        >
          {/* Tier Badge */}
          <div className="flex justify-center mb-4">
            <span 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
              style={{
                background: config.color === 'violet' 
                  ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' 
                  : config.color === 'amber'
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
              }}
            >
              {config.icon}
              {voucherData.order?.tierName || "Experience Voucher"}
            </span>
          </div>

          {/* Value */}
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-foreground">
              €{((voucherData.order?.amount_cents || 0) / 100).toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {t('screens.voucher.voucherValue')}
            </div>
          </div>

          {/* Sender Info */}
          {voucherData.order?.buyer_name && (
            <div className="text-center text-sm text-muted-foreground mb-4">
              Gift from <span className="font-medium text-foreground">{voucherData.order.buyer_name}</span>
            </div>
          )}

          {/* Code Display */}
          <div className="bg-muted/50 rounded-xl p-4 text-center mb-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {t('screens.voucher.voucherCode')}
            </div>
            <div className="font-mono text-xl font-bold text-foreground tracking-widest">
              {voucherData.voucher?.code}
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {t('screens.voucher.whatYouLlGet')}
            </div>
            {config.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-primary mt-0.5">✓</span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={onClaim}
            disabled={isLoading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg 
                     hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift className="w-5 h-5" />
                {t('screens.voucher.claimVoucher')}
              </>
            )}
          </button>
          <p className="text-center text-xs text-muted-foreground pt-3">
            {t('screens.voucher.voucherWillAddedYourWallet')}
          </p>
        </motion.div>
      </main>
    </div>
  );
}
