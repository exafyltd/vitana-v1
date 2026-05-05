import { PartyPopper, Users, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { t } from '@/lib/i18n-toast';

interface SyncSuccessScreenProps {
  totalImported: number;
  matchesFound: number;
  newContacts: number;
  onViewMatches: () => void;
  onInviteFriends: () => void;
  onClose: () => void;
}

export function SyncSuccessScreen({
  totalImported,
  matchesFound,
  newContacts,
  onViewMatches,
  onInviteFriends,
  onClose,
}: SyncSuccessScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6 py-4"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
        className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] flex items-center justify-center"
      >
        <PartyPopper className="w-8 h-8 text-white" />
      </motion.div>

      {/* Title */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">
          {t('screens.contacts.contactsSynced')}
        </h3>
        <p className="text-sm text-muted-foreground">{t('screens.contacts.weFoundTotalimportedContactsMatchedThem', { totalImported })}
        </p>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-4">
        {matchesFound > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center p-4 rounded-xl bg-[hsl(var(--contact-success)/0.1)] border border-[hsl(var(--contact-success)/0.2)]"
          >
            <Users className="w-6 h-6 text-[hsl(var(--contact-success))] mb-1" />
            <span className="text-2xl font-bold text-[hsl(var(--contact-success))]">
              {matchesFound}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('screens.contacts.vitana2')}
            </span>
          </motion.div>
        )}

        {newContacts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center p-4 rounded-xl bg-[hsl(var(--contact-sync-tint))] border border-[hsl(var(--contact-sync-accent)/0.2)]"
          >
            <UserPlus className="w-6 h-6 text-[hsl(var(--contact-sync-accent))] mb-1" />
            <span className="text-2xl font-bold text-[hsl(var(--contact-sync-accent))]">
              {newContacts}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('screens.contacts.invite2')}
            </span>
          </motion.div>
        )}
      </div>

      {/* Message */}
      {matchesFound > 0 && (
        <p className="text-sm text-foreground bg-[hsl(var(--contact-success)/0.1)] rounded-lg p-3">{t('screens.contacts.matchesfoundYourFriendsAlreadyVitana', { matchesFound })}
        </p>
      )}

      {/* CTAs */}
      <div className="space-y-2 pt-2">
        {matchesFound > 0 && (
          <Button
            onClick={onViewMatches}
            className="w-full bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
          >
            {t('screens.contacts.viewMatches')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {newContacts > 0 && (
          <Button
            variant={matchesFound > 0 ? "outline" : "default"}
            onClick={onInviteFriends}
            className={matchesFound === 0 ? "w-full bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90" : "w-full"}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t('screens.contacts.inviteFriends')}
          </Button>
        )}

        <Button
          variant="ghost"
          onClick={onClose}
          className="w-full text-muted-foreground"
        >
          {t('screens.contacts.done')}
        </Button>
      </div>
    </motion.div>
  );
}

export default SyncSuccessScreen;
