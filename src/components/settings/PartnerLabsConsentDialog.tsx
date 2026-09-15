/**
 * VTID-03885 — Partner Health Test Integration: "Connect DoctorBox" consent dialog.
 *
 * Settings -> Connected Apps' "Partner Labs" entry used to be a static
 * comingSoon:true mock with no backend behind it. This is the real
 * consent flow the spec asks for: granting here lets the gateway's
 * partner-health ingestion pipeline (services/partner-health/ingestion.ts,
 * exafyltd/vitana-platform) actually project a DoctorBox result into this
 * user's lab reports; revoking stops future ingestion only (it never
 * retroactively touches results already received — the same
 * future-ingestion-only semantics as any other health data the user
 * already owns).
 *
 * Talks to gateway routes/partner-health-consent.ts
 * (GET/POST /api/v1/partner-health/consent/*), reusing adminFetch purely
 * as a generic authenticated-fetch helper (Bearer token from the current
 * Supabase session) — no admin role is required by that route.
 */

import { useEffect, useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-api";
import { notify, notifyError, t } from "@/lib/i18n-toast";

const PARTNER_KEY = "doctorbox";
const SCOPE = "result_ingestion";

interface PartnerLabsConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectedChange?: (connected: boolean) => void;
}

export function PartnerLabsConsentDialog({ open, onOpenChange, onConnectedChange }: PartnerLabsConsentDialogProps) {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setChecking(true);
    adminFetch(`/api/v1/partner-health/consent?partner_key=${PARTNER_KEY}&scope=${SCOPE}`)
      .then((res: { granted?: boolean }) => {
        if (!cancelled) setConnected(Boolean(res?.granted));
      })
      .catch(() => {
        // Fail closed on the check itself — assume not connected rather than
        // guessing; the grant/revoke buttons stay usable either way.
        if (!cancelled) setConnected(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleGrant = async () => {
    setSubmitting(true);
    try {
      await adminFetch("/api/v1/partner-health/consent/grant", {
        method: "POST",
        body: JSON.stringify({ partner_key: PARTNER_KEY, scope: SCOPE }),
      });
      setConnected(true);
      onConnectedChange?.(true);
      notify("screens.settings.partnerLabsGrantSuccess");
    } catch {
      notifyError("screens.settings.partnerLabsError");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    setSubmitting(true);
    try {
      await adminFetch("/api/v1/partner-health/consent/revoke", {
        method: "POST",
        body: JSON.stringify({ partner_key: PARTNER_KEY, scope: SCOPE }),
      });
      setConnected(false);
      onConnectedChange?.(false);
      notify("screens.settings.partnerLabsRevokeSuccess");
    } catch {
      notifyError("screens.settings.partnerLabsError");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[480px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("screens.settings.partnerLabsConnectTitle")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t("screens.settings.partnerLabsConnectDescription")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {connected && !checking && (
            <p className="text-sm text-muted-foreground">{t("screens.settings.partnerLabsRevokeConfirm")}</p>
          )}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("screens.settings.cancel")}
          </Button>
          {connected ? (
            <Button type="button" variant="destructive" disabled={checking || submitting} onClick={handleRevoke}>
              {t("screens.settings.partnerLabsRevokeAccess")}
            </Button>
          ) : (
            <Button type="button" disabled={checking || submitting} onClick={handleGrant}>
              {t("screens.settings.partnerLabsGrantAccess")}
            </Button>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
