/**
 * VTID-05096 — Settings → Privacy: "Your phone number". Shows the verified
 * number (masked) with Change / Remove, or a "Verify phone number" button.
 * Hidden entirely while the gateway switch (VTID-05095) is off.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
  ResponsiveConfirmDialogTrigger,
} from "@/components/ui/responsive-confirm-dialog";
import { VerifyPhoneDialog } from "@/components/contacts/VerifyPhoneDialog";
import { usePhoneVerificationStatus } from "@/hooks/usePhoneVerificationStatus";
import { useAuth } from "@/context/AuthProvider";
import { phoneStatusQueryKey, removeVerifiedPhone } from "@/lib/phone-verification-client";
import { notify, notifyError, t } from "@/lib/i18n-toast";

export function PhoneNumberCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { status } = usePhoneVerificationStatus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (!status) return null;

  const remove = async () => {
    setRemoving(true);
    try {
      await removeVerifiedPhone();
      await queryClient.invalidateQueries({ queryKey: phoneStatusQueryKey(user?.id) });
      notify("mailhub.findFriends.verifyPhone.removed");
    } catch {
      notifyError("mailhub.findFriends.verifyPhone.errors.unknown");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="phone-number-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium">{t("mailhub.findFriends.verifyPhone.title")}</h4>
          {status.verified && status.phone_masked ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5" data-testid="phone-number-verified">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" aria-hidden />
              {t("mailhub.findFriends.verifyPhone.verifiedLabel")}{" "}
              <bdi dir="ltr" className="font-medium text-foreground">{status.phone_masked}</bdi>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("mailhub.findFriends.verifyPhone.body")}</p>
          )}
        </div>
        {status.verified ? (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="min-h-10" onClick={() => setDialogOpen(true)}>
              {t("mailhub.findFriends.verifyPhone.change")}
            </Button>
            <ResponsiveConfirmDialog>
              <ResponsiveConfirmDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="min-h-10" disabled={removing} data-testid="phone-number-remove">
                  {t("mailhub.findFriends.verifyPhone.remove")}
                </Button>
              </ResponsiveConfirmDialogTrigger>
              <ResponsiveConfirmDialogContent>
                <ResponsiveConfirmDialogHeader>
                  <ResponsiveConfirmDialogTitle>{t("mailhub.findFriends.verifyPhone.removeTitle")}</ResponsiveConfirmDialogTitle>
                  <ResponsiveConfirmDialogDescription>{t("mailhub.findFriends.verifyPhone.removeBody")}</ResponsiveConfirmDialogDescription>
                </ResponsiveConfirmDialogHeader>
                <ResponsiveConfirmDialogFooter>
                  <ResponsiveConfirmDialogCancel>{t("screens.contacts.cancel")}</ResponsiveConfirmDialogCancel>
                  <ResponsiveConfirmDialogAction
                    onClick={() => void remove()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("mailhub.findFriends.verifyPhone.remove")}
                  </ResponsiveConfirmDialogAction>
                </ResponsiveConfirmDialogFooter>
              </ResponsiveConfirmDialogContent>
            </ResponsiveConfirmDialog>
          </div>
        ) : (
          <Button size="sm" className="min-h-10 shrink-0" onClick={() => setDialogOpen(true)} data-testid="phone-number-verify">
            <Smartphone className="w-4 h-4 me-1.5" aria-hidden />
            {t("mailhub.findFriends.verifyPhone.verify")}
          </Button>
        )}
      </div>
      <VerifyPhoneDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

export default PhoneNumberCard;
