import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ContactConsentCard } from "./ContactConsentCard";
import { ContactSourcePicker, ContactSource } from "./ContactSourcePicker";
import { DedupePreviewList, MatchedContact, ImportedContact } from "./DedupePreviewList";
import { InviteComposer } from "./InviteComposer";
import { SyncSuccessScreen } from "./SyncSuccessScreen";
import { ContactSyncErrorState } from "./ContactSyncErrorState";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useContactSync } from "@/hooks/useContactSync";
import { Contact } from "@/hooks/useContacts";
import { t } from '@/lib/i18n-toast';

type SyncStep = "consent" | "sources" | "syncing" | "preview" | "invite" | "success" | "error";

interface ContactSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerContext?: "settings" | "invite" | "discovery" | "event";
  onComplete?: (result: { totalImported: number; matchesFound: number }) => void;
}

export function ContactSyncModal({
  open,
  onOpenChange,
  triggerContext = "settings",
  onComplete,
}: ContactSyncModalProps) {
  const [step, setStep] = useState<SyncStep>("consent");
  const [selectedSources, setSelectedSources] = useState<ContactSource[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);
  const [matches, setMatches] = useState<MatchedContact[]>([]);
  const [nonMatches, setNonMatches] = useState<ImportedContact[]>([]);
  const [selectedForInvite, setSelectedForInvite] = useState<string[]>([]);
  const [errorType, setErrorType] = useState<"oauth_failed" | "api_unavailable" | "permission_denied" | "rate_limited" | "unknown">("unknown");
  const [errorMessage, setErrorMessage] = useState<string>();

  const { hasConsented, recordConsent, syncContacts, isSyncing } = useContactSync();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep(hasConsented ? "sources" : "consent");
      setSelectedSources([]);
      setSyncProgress(0);
      setMatches([]);
      setNonMatches([]);
      setSelectedForInvite([]);
    }
  }, [open, hasConsented]);

  const handleConsent = () => {
    recordConsent();
    setStep("sources");
  };

  const handleDecline = () => {
    onOpenChange(false);
  };

  const handleSourceToggle = (source: ContactSource) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const handleStartSync = async () => {
    if (selectedSources.length === 0) return;

    setStep("syncing");
    setSyncProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const result = await syncContacts(selectedSources);

      clearInterval(progressInterval);
      setSyncProgress(100);

      // Transform results
      setMatches(result.matches || []);
      setNonMatches(result.nonMatches || []);

      // Short delay before showing results
      setTimeout(() => {
        setStep("success");
        onComplete?.({
          totalImported: (result.matches?.length || 0) + (result.nonMatches?.length || 0),
          matchesFound: result.matches?.length || 0,
        });
      }, 500);
    } catch (error) {
      console.error("Sync error:", error);
      
      // Determine error type
      if (error instanceof Error) {
        if (error.message.includes("permission")) {
          setErrorType("permission_denied");
        } else if (error.message.includes("rate")) {
          setErrorType("rate_limited");
        } else if (error.message.includes("oauth") || error.message.includes("auth")) {
          setErrorType("oauth_failed");
        } else {
          setErrorType("unknown");
        }
        setErrorMessage(error.message);
      }
      
      setStep("error");
    }
  };

  const handleViewMatches = () => {
    setStep("preview");
  };

  const handleInviteFriends = () => {
    setStep("invite");
  };

  const handleSendInvites = async (message: string, channel: "sms" | "email" | "whatsapp" | "share") => {
    // TODO: Implement actual invite sending
    console.log("Sending invites:", { message, channel, contacts: selectedForInvite });
    onOpenChange(false);
  };

  const handleConnect = (userId: string) => {
    // TODO: Navigate to chat or profile
    console.log("Connect with user:", userId);
  };

  const handleRetry = () => {
    setStep("sources");
    setErrorType("unknown");
    setErrorMessage(undefined);
  };

  const renderStep = () => {
    switch (step) {
      case "consent":
        return (
          <ContactConsentCard
            onConsent={handleConsent}
            onDecline={handleDecline}
          />
        );

      case "sources":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {t('screens.contacts.chooseContactSources')}
              </h3>
              <p className="text-sm text-muted-foreground">
                Select where to import your contacts from
              </p>
            </div>

            <ContactSourcePicker
              selectedSources={selectedSources}
              onSourceToggle={handleSourceToggle}
            />

            <Button
              onClick={handleStartSync}
              disabled={selectedSources.length === 0}
              className="w-full bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
            >
              <Users className="w-4 h-4 mr-2" />
              {t('screens.contacts.findFriends')}
            </Button>
          </div>
        );

      case "syncing":
        return (
          <div className="text-center space-y-6 py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] flex items-center justify-center"
            >
              <Loader2 className="w-8 h-8 text-white" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {t('screens.contacts.findingYourFriends')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('screens.contacts.securelyMatchingYourContacts')}
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-2">
              <Progress value={syncProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {syncProgress < 50 ? "Hashing contacts locally..." : "Checking for matches..."}
              </p>
            </div>
          </div>
        );

      case "preview":
        return (
          <div className="space-y-4">
            <DedupePreviewList
              matches={matches}
              nonMatches={nonMatches}
              onConnect={handleConnect}
              onSelectForInvite={setSelectedForInvite}
              selectedForInvite={selectedForInvite}
            />

            {selectedForInvite.length > 0 && (
              <Button
                onClick={handleInviteFriends}
                className="w-full bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
              >
                Invite {selectedForInvite.length} Friend{selectedForInvite.length !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        );

      case "invite":
        const contactsToInvite = nonMatches
          .filter(c => selectedForInvite.includes(c.id))
          .map(c => ({
            id: c.id,
            user_id: "",
            contact_name: c.name,
            contact_phone: c.phone,
            contact_email: c.email,
            is_on_platform: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })) as Contact[];

        return (
          <InviteComposer
            selectedContacts={contactsToInvite}
            onSend={handleSendInvites}
            onCancel={() => setStep("preview")}
          />
        );

      case "success":
        return (
          <SyncSuccessScreen
            totalImported={matches.length + nonMatches.length}
            matchesFound={matches.length}
            newContacts={nonMatches.length}
            onViewMatches={handleViewMatches}
            onInviteFriends={handleInviteFriends}
            onClose={() => onOpenChange(false)}
          />
        );

      case "error":
        return (
          <ContactSyncErrorState
            errorType={errorType}
            message={errorMessage}
            onRetry={handleRetry}
            onBack={() => setStep("sources")}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            Find friends from your contacts
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default ContactSyncModal;
