import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ContactConsentCard } from "./ContactConsentCard";
import { ContactSourcePicker, ContactSource } from "./ContactSourcePicker";
import { DedupePreviewList, MatchedContact, ImportedContact } from "./DedupePreviewList";
import { InviteComposer } from "./InviteComposer";
import { SyncSuccessScreen } from "./SyncSuccessScreen";
import { ContactSyncErrorState, type ContactSyncErrorType } from "./ContactSyncErrorState";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useContactSync, ConnectAppFirst } from "@/hooks/useContactSync";
import { fetchConnectedApps, type ConnectedAppId } from "@/lib/connected-apps-client";
import { useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { Contact } from "@/hooks/useContacts";
import { t } from '@/lib/i18n-toast';

type SyncStep = "consent" | "sources" | "syncing" | "preview" | "invite" | "success" | "error" | "connect";

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
  // True totals: the match lists only preview the first rows of a large import.
  const [totals, setTotals] = useState({ imported: 0, matches: 0 });
  const [selectedForInvite, setSelectedForInvite] = useState<string[]>([]);
  const [errorType, setErrorType] = useState<ContactSyncErrorType>("unknown");
  const [connectApp, setConnectApp] = useState<ConnectedAppId | null>(null);
  const [connectedSources, setConnectedSources] = useState<ContactSource[]>([]);
  const navigate = useNavigate();

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
      setConnectApp(null);
      // Which of Google / Outlook / iCloud are already on in Connected Apps (VTID-04440, VTID-04449).
      fetchConnectedApps()
        .then((apps) => {
          const on = new Set(apps.filter((a) => a.status === "on").map((a) => a.id));
          setConnectedSources([
            ...(on.has("google-contacts") ? (["google"] as ContactSource[]) : []),
            ...(on.has("outlook-contacts") ? (["outlook"] as ContactSource[]) : []),
            ...(on.has("iphone-contacts") ? (["icloud"] as ContactSource[]) : []),
          ]);
        })
        .catch(() => setConnectedSources([]));
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
      const totalImported = result.totalImported ?? (result.matches?.length || 0) + (result.nonMatches?.length || 0);
      const totalMatches = result.totalMatches ?? (result.matches?.length || 0);
      setTotals({ imported: totalImported, matches: totalMatches });

      // Short delay before showing results
      setTimeout(() => {
        setStep("success");
        onComplete?.({
          totalImported,
          matchesFound: totalMatches,
        });
      }, 500);
    } catch (error) {
      console.error("Sync error:", error);
      if (error instanceof ConnectAppFirst) {
        setConnectApp(error.app);
        setStep("connect");
        return;
      }
      const msg = error instanceof Error ? error.message : "";
      let type: ContactSyncErrorType = "unknown";
      if (/cancelled/i.test(msg)) type = "cancelled";
      else if (/Contact Picker API not available/i.test(msg)) type = "api_unavailable";
      else if (/permission/i.test(msg)) type = "permission_denied";
      else if (/rate|429/i.test(msg)) type = "rate_limited";
      else if (/oauth|auth|not_connected/i.test(msg)) type = "oauth_failed";
      setErrorType(type);
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
              <p className="text-sm text-muted-foreground">{t('screens.contacts.selectWhereImportYourContactsFrom')}
              </p>
            </div>

            <ContactSourcePicker
              selectedSources={selectedSources}
              onSourceToggle={handleSourceToggle}
              connectedSources={connectedSources}
            />

            <Button
              data-testid="find-friends-start"
              onClick={handleStartSync}
              disabled={selectedSources.length === 0}
              className="w-full bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
            >
              <Users className="w-4 h-4 me-2" />
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
                {t(syncProgress < 50 ? "mailhub.findFriends.progress.reading" : "mailhub.findFriends.progress.matching")}
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
              >{t('screens.contacts.inviteLengthFriendValue1', { length: selectedForInvite.length, value1: selectedForInvite.length !== 1 ? "s" : "" })}</Button>
            )}
          </div>
        );

      case "invite": {
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
      }

      case "success":
        return (
          <SyncSuccessScreen
            totalImported={totals.imported}
            matchesFound={totals.matches}
            newContacts={Math.max(totals.imported - totals.matches, 0)}
            onViewMatches={handleViewMatches}
            onInviteFriends={handleInviteFriends}
            onClose={() => onOpenChange(false)}
          />
        );

      case "error":
        return (
          <ContactSyncErrorState
            errorType={errorType}
            onRetry={handleRetry}
            onBack={() => setStep("sources")}
          />
        );

      case "connect": {
        const app = connectApp ? t(`mailhub.apps.${connectApp}.name`) : "";
        return (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[hsl(var(--contact-sync-tint))] flex items-center justify-center">
              <Link2 className="w-8 h-8 text-[hsl(var(--contact-sync-accent))]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">{t("mailhub.findFriends.connect.title", { app })}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("mailhub.findFriends.connect.body", { app })}</p>
            </div>
            <div className="space-y-2">
              <Button
                data-testid="find-friends-open-connected-apps"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/connectors");
                }}
                className="w-full min-h-11 bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
              >
                {t("mailhub.findFriends.connect.open")}
              </Button>
              <Button variant="ghost" onClick={() => setStep("sources")} className="w-full min-h-11 text-muted-foreground">
                {t("screens.contacts.goBack")}
              </Button>
            </div>
          </div>
        );
      }

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
            </div>{t('screens.contacts.findFriendsFromYourContacts')}
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
