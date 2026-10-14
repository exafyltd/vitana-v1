import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Panel as Card, PanelContent as CardContent, PanelHeader as CardHeader, PanelTitle as CardTitle, PanelDescription as CardDescription } from "@/components/layout/spotlight/Panel";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MailCheck, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { t } from '@/lib/i18n-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const isRecovery = searchParams.get("type") === "recovery";

  // Also check hash fragment for recovery token (Supabase redirects with hash)
  const [hashRecovery, setHashRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setHashRecovery(true);
    }
  }, []);

  const showUpdateView = isRecovery || hashRecovery;
  const spotlight = useSpotlightEnabled();
  const view = showUpdateView ? <UpdatePasswordView /> : <RequestResetView />;

  // VTID-05117: Spotlight on → the `form` archetype (single form column, no rail).
  if (spotlight) {
    return (
      <ScreenFrame archetype="form" className="min-h-screen bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to">
        {view}
      </ScreenFrame>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to">
      <div className="w-full max-w-md">
        {view}
      </div>
    </div>
  );
}

function RequestResetView() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password?type=recovery`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="border-ruby/15 shadow-lg">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-ruby/10 flex items-center justify-center">
            <MailCheck className="h-7 w-7 text-ruby" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">{t('screens.auth.checkYourEmail')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('screens.auth.weVeSentPasswordResetLink')}<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {t('screens.auth.ifYouDonTSeeIt')}
          </p>
          <div className="pt-2">
            <Link
              to="/maxina"
              className="inline-flex items-center gap-1.5 text-sm text-ruby hover:text-ruby/80 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('screens.auth.backMaxina')}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-ruby/15 shadow-lg">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-ruby/10 flex items-center justify-center mb-2">
          <Lock className="h-7 w-7 text-ruby" />
        </div>
        <CardTitle className="text-xl">{t('screens.auth.resetYourPassword')}</CardTitle>
        <CardDescription>{t('screens.auth.enterYourEmailWeLlSend')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">{t('screens.auth.emailAddress')}</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder={t('screens.auth.youExampleCom')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="border-ruby/25 focus-visible:ring-ruby/60"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-ruby hover:bg-ruby/90 text-primary-foreground"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />{t('screens.auth.sending')}
              </>
            ) : (
              t('screens.auth.sendResetLink')
            )}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link
            to="/maxina"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('screens.auth.backMaxina')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function UpdatePasswordView() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const isValid = password.length >= 6 && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-ruby/15 shadow-lg">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-status-success-subtle flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-status-success" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">{t('screens.auth.passwordUpdated')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('screens.auth.yourPasswordHasSuccessfullyReset')}
          </p>
          <div className="pt-2">
            <Link to="/maxina">
              <Button className="bg-ruby hover:bg-ruby/90 text-primary-foreground">
                {t('screens.auth.continueMaxina')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-ruby/15 shadow-lg">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-ruby/10 flex items-center justify-center mb-2">
          <Lock className="h-7 w-7 text-ruby" />
        </div>
        <CardTitle className="text-xl">{t('screens.auth.setNewPassword')}</CardTitle>
        <CardDescription>{t('screens.auth.chooseStrongPasswordForYourAccount')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">{t('screens.auth.newPassword')}</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder={t('screens.auth.atLeast6Characters')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
                className="border-ruby/25 focus-visible:ring-ruby/60 pe-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('screens.auth.confirmPassword')}</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder={t('screens.auth.reenterYourPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`border-ruby/25 focus-visible:ring-ruby/60 ${
                confirmPassword && !passwordsMatch ? "border-destructive" : ""
              }`}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-destructive">{t('screens.auth.passwordsDonTMatch')}</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading || !isValid}
            className="w-full bg-ruby hover:bg-ruby/90 text-primary-foreground"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />{t('screens.auth.updating')}
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link
            to="/maxina"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('screens.auth.backMaxina')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
