import { Shield, Lock, UserCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { t } from "@/lib/i18n-toast";

interface ContactConsentCardProps {
  onConsent: () => void;
  onDecline: () => void;
  source?: "google" | "icloud" | "phonebook" | "whatsapp" | "all";
}

export function ContactConsentCard({ onConsent, onDecline, source = "all" }: ContactConsentCardProps) {
  const privacyBullets = [
    {
      icon: Lock,
      title: t('mailhub.findFriends.consent.noAutoTitle'),
      description: t('mailhub.findFriends.consent.noAutoBody'),
    },
    {
      icon: Eye, // VTID-04440: contacts are stored in the member's account (server-side), visible only to them
      title: t('mailhub.findFriends.consent.privateTitle'),
      description: t('mailhub.findFriends.consent.privateBody'),
    },
    {
      icon: UserCheck,
      title: t('mailhub.findFriends.consent.removeTitle'),
      description: t('mailhub.findFriends.consent.removeBody'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="contact-glass-card p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[hsl(var(--contact-sync-tint))] flex items-center justify-center">
          <Shield className="w-6 h-6 text-[hsl(var(--contact-sync-accent))]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('mailhub.findFriends.consent.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('mailhub.findFriends.consent.subtitle')}
          </p>
        </div>
      </div>

      {/* Privacy bullets */}
      <div className="space-y-4">
        {privacyBullets.map((bullet, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1) }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--contact-sync-accent)/0.1)] flex items-center justify-center flex-shrink-0">
              <bullet.icon className="w-4 h-4 text-[hsl(var(--contact-sync-accent))]" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{bullet.title}</p>
              <p className="text-xs text-muted-foreground">{bullet.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        {t('mailhub.findFriends.consent.helper')}
      </p>

      {/* CTAs */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onDecline}
          className="flex-1"
        >
          {t('mailhub.findFriends.consent.notNow')}
        </Button>
        <Button
          data-testid="find-friends-consent-continue"
          onClick={onConsent}
          className="flex-1 bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
        >
          {t('mailhub.findFriends.consent.continue')}
        </Button>
      </div>
    </motion.div>
  );
}

export default ContactConsentCard;
