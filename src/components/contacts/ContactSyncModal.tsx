import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileUp, Loader2, Smartphone, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ContactConsentCard } from "./ContactConsentCard";
import { ContactSourcePicker, ContactSource } from "./ContactSourcePicker";
import { DedupePreviewList, MatchedContact, ImportedContact } from "./DedupePreviewList";
import { ContactSyncErrorState, type ContactSyncErrorType } from "./ContactSyncErrorState";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useContactSync, ConnectAppFirst, ContactFileError, phoneImportMode, type SyncResult } from "@/hooks/useContactSync";
import { fetchConnectedApps, MAX_DEVICE_CONTACTS, type ConnectedAppId } from "@/lib/connected-apps-client";
import { useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
import { t } from '@/lib/i18n-toast';

type SyncStep = "consent" | "import" | "syncing" | "results" | "error" | "connect";

interface ContactSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerContext?: "settings" | "invite" | "discovery" | "event";
  onComplete?: (result: { totalImported: number; matchesFound: number }) => void;
}

/**
 * VTID-05058 — "Find friends from my contacts", the messenger pattern:
 * consent once → one tap imports (native app, the phone's contact picker, or
 * a .vcf file where neither exists; Google / Outlook / iCloud below) →
 * "On Vitanaland" with Message, everyone else with Invite.
 */
export function ContactSyncModal({
  open,
  onOpenChange,
  onComplete,
}: ContactSyncModalProps) {
  const [step, setStep] = useState<SyncStep>("consent");
  const [syncProgress, setSyncProgress] = useState(0);
  const [matches, setMatches] = useState<MatchedContact[]>([]);
  const [nonMatches, setNonMatches] = useState<ImportedContact[]>([]);
  // True totals: the match lists only preview the first rows of a large import.
  const [totals, setTotals] = useState({ imported: 0, matches: 0, overLimit: 0 });
  const [errorType, setErrorType] = useState<ContactSyncErrorType>("unknown");
  const [connectApp, setConnectApp] = useState<ConnectedAppId | null>(null);
  const [connectedSources, setConnectedSources] = useState<ContactSource[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const mode = phoneImportMode();

  const { hasConsented, recordConsent, syncContacts, importContactFile } = useContactSync();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep(hasConsented ? "import" : "consent");
      setSyncProgress(0);
      setMatches([]);
      setNonMatches([]);
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
    setStep("import");
  };

  const run = async (work: () => Promise<SyncResult>) => {
    setStep("syncing");
    setSyncProgress(0);
    // Progress is shown for feel. Cleared in `finally` so a failed sync (e.g.
    // ConnectAppFirst) cannot leave it ticking state updates forever.
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => Math.min(prev + 10, 90));
    }, 300);

    try {
      const result = await work();
      setSyncProgress(100);
      setMatches(result.matches || []);
      setNonMatches(result.nonMatches || []);
      const totalImported = result.totalImported ?? (result.matches?.length || 0) + (result.nonMatches?.length || 0);
      const totalMatches = result.totalMatches ?? (result.matches?.length || 0);
      setTotals({ imported: totalImported, matches: totalMatches, overLimit: result.overLimit ?? 0 });
      setStep("results");
      onComplete?.({ totalImported, matchesFound: totalMatches });
    } catch (error) {
      console.error("Sync error:", error);
      if (error instanceof ConnectAppFirst) {
        setConnectApp(error.app);
        setStep("connect");
        return;
      }
      let type: ContactSyncErrorType = "unknown";
      if (error instanceof ContactFileError) {
        type = error.code === "too_large" ? "file_too_large" : "file_empty";
      } else {
        const msg = error instanceof Error ? error.message : "";
        if (/cancelled/i.test(msg)) type = "cancelled";
        else if (/Contact Picker API not available|native_contacts_unavailable/i.test(msg)) type = "api_unavailable";
        else if (/permission/i.test(msg)) type = "permission_denied";
        else if (/rate|429/i.test(msg)) type = "rate_limited";
        else if (/oauth|auth|not_connected/i.test(msg)) type = "oauth_failed";
      }
      setErrorType(type);
      setStep("error");
    } finally {
      clearInterval(progressInterval);
    }
  };

  const importFrom = (sources: ContactSource[]) => run(() => syncContacts(sources));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInput.current) fileInput.current.value = "";
    if (file) void run(() => importContactFile(file));
  };

  const handleMessage = (userId: string) => {
    onOpenChange(false);
    navigate(`/inbox/u/${userId}`);
  };

  const renderStep = () => {
    switch (step) {
      case "consent":
        return (
          <ContactConsentCard
            onConsent={handleConsent}
            onDecline={() => onOpenChange(false)}
          />
        );

      case "import":
        return (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-foreground">{t('mailhub.findFriends.import.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('mailhub.findFriends.import.subtitle')}</p>
            </div>

            {mode === "file" ? (
              <div className="space-y-3">
                <input
                  ref={fileInput}
                  type="file"
                  accept=".vcf,text/vcard,text/x-vcard"
                  className="hidden"
                  data-testid="find-friends-file-input"
                  onChange={handleFile}
                />
                <Button
                  data-testid="find-friends-file"
                  onClick={() => fileInput.current?.click()}
                  className="w-full min-h-12 bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
                >
                  <FileUp className="w-5 h-5 me-2" aria-hidden />
                  {t('mailhub.findFriends.import.file')}
                </Button>
                <div className="rounded-xl bg-muted/50 p-3 space-y-1 text-start" data-testid="find-friends-file-help">
                  <p className="text-xs font-medium text-foreground">{t('mailhub.findFriends.import.fileHowTitle')}</p>
                  <p className="text-xs text-muted-foreground" data-testid="find-friends-file-help-iphone">{t('mailhub.findFriends.import.fileHowIphone')}</p>
                  <p className="text-xs text-muted-foreground" data-testid="find-friends-file-help-android">{t('mailhub.findFriends.import.fileHowAndroid')}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  data-testid="find-friends-phone"
                  onClick={() => void importFrom(["phonebook"])}
                  className="w-full min-h-12 bg-gradient-to-r from-[hsl(var(--contact-sync-accent))] to-[hsl(330,70%,50%)] text-white hover:opacity-90"
                >
                  <Smartphone className="w-5 h-5 me-2" aria-hidden />
                  {t('mailhub.findFriends.import.phone')}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t(mode === "native" ? 'mailhub.findFriends.import.phoneHintNative' : 'mailhub.findFriends.import.phoneHintPicker')}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground text-start">{t('mailhub.findFriends.import.accounts')}</p>
              <ContactSourcePicker
                hidePhone
                selectedSources={[]}
                onSourceToggle={(source) => void importFrom([source])}
                connectedSources={connectedSources}
              />
            </div>
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

      case "results":
        return (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground" data-testid="find-friends-summary">
                {t('mailhub.findFriends.results.summary', { total: totals.imported, members: totals.matches })}
              </p>
              {totals.overLimit > 0 && (
                <p className="text-xs text-muted-foreground">{t('mailhub.findFriends.results.overLimit', { limit: MAX_DEVICE_CONTACTS })}</p>
              )}
            </div>
            <div className="max-h-[55vh] overflow-y-auto overflow-x-hidden pe-1 min-w-0">
              <DedupePreviewList matches={matches} nonMatches={nonMatches} onMessage={handleMessage} />
            </div>
            <p className="text-xs text-muted-foreground text-center">{t('mailhub.findFriends.results.later')}</p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full min-h-11">
              {t('mailhub.findFriends.results.done')}
            </Button>
          </div>
        );

      case "error":
        return (
          <ContactSyncErrorState
            errorType={errorType}
            onRetry={() => setStep("import")}
            onBack={() => setStep("import")}
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
              <Button variant="ghost" onClick={() => setStep("import")} className="w-full min-h-11 text-muted-foreground">
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
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto overflow-x-hidden [&>*]:min-w-0">
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
            className="min-w-0 w-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default ContactSyncModal;
