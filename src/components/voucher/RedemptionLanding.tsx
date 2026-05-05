import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, Sparkles, Calendar, Users, Star } from "lucide-react";
import type { VoucherLookupData } from "@/hooks/useRedeemVoucher";
import { t } from '@/lib/i18n-toast';

interface RedemptionLandingProps {
  voucherData: VoucherLookupData;
  voucherCode: string;
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

export function RedemptionLanding({ voucherData, voucherCode }: RedemptionLandingProps) {
  const navigate = useNavigate();
  const tier = voucherData.voucher?.tier || "experience";
  const config = TIER_CONFIG[tier] || TIER_CONFIG.experience;
  const redirectTo = encodeURIComponent(`/redeem?voucher=${voucherCode}`);

  const handleLogin = () => {
    navigate(`/maxina?redirectTo=${redirectTo}`);
  };

  const handleRegister = () => {
    navigate(`/maxina?redirectTo=${redirectTo}&mode=register`);
  };

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
            {t('screens.voucher.youVeReceivedGift')}
          </h1>
          {voucherData.order?.buyer_name && (
            <p className="text-muted-foreground">
              From {voucherData.order.buyer_name}
            </p>
          )}
        </motion.div>

        {/* Voucher Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`bg-gradient-to-br from-${config.color}-500/10 to-${config.color}-500/5 
                     border border-${config.color}-500/20 rounded-2xl p-6 mb-6`}
          style={{
            background: `linear-gradient(135deg, 
              hsl(var(--${config.color === 'violet' ? 'primary' : config.color === 'amber' ? 'warning' : 'success'}) / 0.1) 0%, 
              hsl(var(--${config.color === 'violet' ? 'primary' : config.color === 'amber' ? 'warning' : 'success'}) / 0.05) 100%)`,
            borderColor: `hsl(var(--${config.color === 'violet' ? 'primary' : config.color === 'amber' ? 'warning' : 'success'}) / 0.2)`,
          }}
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

          {/* Code Display */}
          <div className="bg-background/50 rounded-xl p-4 text-center mb-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {t('screens.voucher.voucherCode')}
            </div>
            <div className="font-mono text-xl font-bold text-foreground tracking-widest">
              {voucherData.voucher?.code || voucherCode}
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {t('screens.voucher.whatSIncluded')}
            </div>
            {config.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-primary mt-0.5">✓</span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg hover:bg-primary/90 transition-colors"
          >
            {t('screens.voucher.signRedeem')}
          </button>
          <button
            onClick={handleRegister}
            className="w-full py-4 bg-secondary text-secondary-foreground rounded-2xl font-semibold text-lg hover:bg-secondary/80 transition-colors"
          >
            Create Account
          </button>
          <p className="text-center text-xs text-muted-foreground pt-2">
            {t('screens.voucher.signCreateAccountClaimYourWellness')}
          </p>
        </motion.div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-3 gap-4"
        >
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground">{t('screens.voucher.events')}</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground">{t('screens.voucher.community')}</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground">{t('screens.voucher.wellness')}</div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-muted-foreground">
        <p>{t('screens.voucher.poweredByMaxina')}</p>
      </footer>
    </div>
  );
}
