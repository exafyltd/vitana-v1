import { Shield, Lock, UserCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ContactConsentCardProps {
  onConsent: () => void;
  onDecline: () => void;
  source?: "google" | "icloud" | "phonebook" | "whatsapp" | "all";
}

const privacyBullets = [
  {
    icon: Lock,
    title: "We never message automatically",
    description: "You choose who to contact and when",
  },
  {
    icon: Eye,
    title: "Contacts are hashed locally",
    description: "We only use encrypted identifiers for matching",
  },
  {
    icon: UserCheck,
    title: "You choose who to invite",
    description: "Full control over every invitation sent",
  },
];

export function ContactConsentCard({ onConsent, onDecline, source = "all" }: ContactConsentCardProps) {
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
          <h3 className="text-lg font-semibold text-foreground">Your privacy is protected</h3>
          <p className="text-sm text-muted-foreground">
            Here's how we handle your contacts
          </p>
        </div>
      </div>

      {/* Privacy bullets */}
      <div className="space-y-4">
        {privacyBullets.map((bullet, index) => (
          <motion.div
            key={bullet.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
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
        Matches are generated from hashed contact data stored securely. Your raw contact information never leaves your device.
      </p>

      {/* CTAs */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onDecline}
          className="flex-1"
        >
          Not now
        </Button>
        <Button
          onClick={onConsent}
          className="flex-1 bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );
}

export default ContactConsentCard;
