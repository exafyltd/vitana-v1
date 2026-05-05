import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

interface ResendConfirmationButtonProps {
  email: string;
  redirectUrl: string;
}

export function ResendConfirmationButton({ email, redirectUrl }: ResendConfirmationButtonProps) {
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || sending || !email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      notifySuccess('toasts.auth.confirmationEmailSentPleaseCheckYour');
      setCooldown(60);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("rate limit") || msg.includes("too many")) {
        notifyError('toasts.auth.tooManyAttemptsPleaseWaitFew');
        setCooldown(120);
      } else {
        toast.error(msg || "Failed to resend email. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }, [email, redirectUrl, cooldown, sending]);

  if (!email) return null;

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={cooldown > 0 || sending}
      className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
    >
      {sending ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />{t('screens.auth.sending')}
        </>
      ) : cooldown > 0 ? (
        <>
          <MailCheck className="h-3 w-3" />{t('screens.auth.resendAvailableCooldownS', { cooldown })}
        </>
      ) : (
        "Didn't receive the email? Resend"
      )}
    </button>
  );
}
