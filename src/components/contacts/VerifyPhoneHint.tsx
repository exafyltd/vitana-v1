/**
 * VTID-05096 — one line in Find friends: "Verify your number so friends can
 * find you". Shown only while the gateway switch is on and the member's
 * number is not verified yet.
 */
import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePhoneVerificationStatus } from "@/hooks/usePhoneVerificationStatus";
import { VerifyPhoneDialog } from "./VerifyPhoneDialog";
import { t } from "@/lib/i18n-toast";

export function VerifyPhoneHint() {
  const { status } = usePhoneVerificationStatus();
  const [open, setOpen] = useState(false);
  if (!status || status.verified) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground" data-testid="verify-phone-hint">
      <Smartphone className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span>{t("mailhub.findFriends.verifyPhone.hint")}</span>
      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setOpen(true)}>
        {t("mailhub.findFriends.verifyPhone.hintAction")}
      </Button>
      <VerifyPhoneDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export default VerifyPhoneHint;
