/**
 * VTID-05096 — verify your phone number: number → 6-digit SMS code → done.
 * The code field uses autocomplete="one-time-code", so iPhone and Android
 * offer the code from the SMS. A modal, not a route (no screen registry
 * entry). Every gateway error has its own message.
 */
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import {
  PhoneVerifyRequestError,
  confirmPhoneCode,
  phoneStatusQueryKey,
  sendPhoneCode,
  type PhoneVerifyErrorCode,
} from "@/lib/phone-verification-client";
import { t } from "@/lib/i18n-toast";

type Step = "number" | "code" | "done";

interface VerifyPhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function codeOf(err: unknown): PhoneVerifyErrorCode {
  return err instanceof PhoneVerifyRequestError ? err.code : "unknown";
}

export function VerifyPhoneDialog({ open, onOpenChange }: VerifyPhoneDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("number");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PhoneVerifyErrorCode | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const prefilled = useRef(false);

  // Fresh start every time the dialog opens; prefill the number the member
  // typed into their profile (it is only a suggestion — never trusted).
  useEffect(() => {
    if (!open) return;
    setStep("number");
    setCode("");
    setError(null);
    setSentTo(null);
    if (prefilled.current || !user?.id) return;
    prefilled.current = true;
    void supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const typed = (data as { phone?: string | null } | null)?.phone;
        if (typed) setPhone((current) => current || typed);
      });
  }, [open, user?.id]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const send = async () => {
    if (busy || !phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const out = await sendPhoneCode(phone.trim());
      setSentTo(out.phone_masked);
      setResendIn(out.resend_after_seconds);
      setCode("");
      setStep("code");
    } catch (err) {
      setError(codeOf(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError(null);
    try {
      await confirmPhoneCode(code);
      setStep("done");
      await queryClient.invalidateQueries({ queryKey: phoneStatusQueryKey(user?.id) });
      await queryClient.invalidateQueries({ queryKey: ["phone-discoverability", user?.id ?? null] });
    } catch (err) {
      setError(codeOf(err));
    } finally {
      setBusy(false);
    }
  };

  const errorLine = error ? (
    <p role="alert" className="text-sm text-destructive" data-testid="verify-phone-error">
      {t(`mailhub.findFriends.verifyPhone.errors.${error}`)}
    </p>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* design-allow-next-line: calc against viewport gutter */}
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md overflow-x-hidden" data-testid="verify-phone-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 shrink-0" aria-hidden />
            {t("mailhub.findFriends.verifyPhone.dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {step === "code" && sentTo ? (
              <>
                {t("mailhub.findFriends.verifyPhone.codeHelp")}{" "}
                <bdi dir="ltr" className="font-medium">{sentTo}</bdi>
              </>
            ) : step === "done" ? (
              t("mailhub.findFriends.verifyPhone.done")
            ) : (
              t("mailhub.findFriends.verifyPhone.numberHelp")
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "number" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="verify-phone-number">{t("mailhub.findFriends.verifyPhone.numberLabel")}</Label>
              <Input
                id="verify-phone-number"
                data-testid="verify-phone-number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                className="text-start"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {errorLine}
            <Button type="submit" className="w-full min-h-11" disabled={busy || !phone.trim()} data-testid="verify-phone-send">
              {busy && <Loader2 className="w-4 h-4 me-2 animate-spin" aria-hidden />}
              {t("mailhub.findFriends.verifyPhone.sendCode")}
            </Button>
          </form>
        )}

        {step === "code" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="verify-phone-code">{t("mailhub.findFriends.verifyPhone.codeLabel")}</Label>
              <Input
                id="verify-phone-code"
                data-testid="verify-phone-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                dir="ltr"
                className="text-center text-lg tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            {errorLine}
            <Button type="submit" className="w-full min-h-11" disabled={busy || code.length !== 6} data-testid="verify-phone-confirm">
              {busy && <Loader2 className="w-4 h-4 me-2 animate-spin" aria-hidden />}
              {t("mailhub.findFriends.verifyPhone.confirm")}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-10"
                onClick={() => {
                  setError(null);
                  setStep("number");
                }}
              >
                {t("mailhub.findFriends.verifyPhone.changeNumber")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-10"
                disabled={busy || resendIn > 0}
                onClick={() => void send()}
                data-testid="verify-phone-resend"
              >
                {resendIn > 0
                  ? t("mailhub.findFriends.verifyPhone.resendIn", { seconds: resendIn })
                  : t("mailhub.findFriends.verifyPhone.resend")}
              </Button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-primary" aria-hidden />
            <Button className="w-full min-h-11" onClick={() => onOpenChange(false)} data-testid="verify-phone-close">
              {t("mailhub.findFriends.results.done")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default VerifyPhoneDialog;
