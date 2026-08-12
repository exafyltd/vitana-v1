/**
 * Commerce Portal — entry login screen (VTID-03555 follow-up).
 *
 * Deliberately styled after the Command Hub login (dark theme, centered
 * card) but in a distinct accent color, so the Commerce Portal reads as its
 * own destination rather than a re-skin of the dev tool. This screen is a
 * placeholder-with-real-auth: it signs the merchant in via the same
 * Supabase Auth every portal uses, then hands off to /commerce. The visual
 * design here is intentionally minimal — it will be redesigned into the
 * actual Commerce Portal landing page once the merchant flow is further
 * along; today it is the auth gate for it.
 */
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShoppingBag, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { t } from "@/lib/i18n-toast";

const CommercePortalLogin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Send an authenticated visitor straight into the merchant portal.
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/commerce");
    }
  }, [user, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      // Success: the useEffect above navigates once `user` settles.
    } catch {
      setError(t('screens.commerceportal.loginError'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <SEO
        title={t('screens.index.commercePortal')}
        description="Vitanaland Commerce Portal — merchant self-service sign-in."
        canonical={window.location.href}
      />

      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md rounded-xl border border-amber-500/30 bg-slate-900/80 p-8 shadow-2xl">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <ShoppingBag className="h-10 w-10 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-amber-400">VITANALAND</h1>
            <p className="text-slate-400">{t('screens.commerceportal.loginSubtitle')}</p>
          </div>

          <div className="my-6 border-t border-slate-700" />

          <p className="text-center text-sm text-slate-400 mb-6">
            {t('screens.commerceportal.loginIntro')}
          </p>

          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-950/50 border-red-900 text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="commerce-email" className="text-slate-300">
                {t('screens.portals.email')}
              </Label>
              <Input
                id="commerce-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-slate-950 border-amber-500/40 text-slate-100 focus-visible:ring-amber-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commerce-password" className="text-slate-300">
                {t('screens.portals.password')}
              </Label>
              <div className="relative">
                <Input
                  id="commerce-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-slate-950 border-amber-500/40 text-slate-100 focus-visible:ring-amber-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('screens.portals.signing')}
                </>
              ) : (
                t('screens.commerceportal.loginButton')
              )}
            </Button>
          </form>

          <div className="text-center mt-6">
            <Link to="/" className="text-sm text-slate-500 hover:text-amber-400">
              {t('screens.portals.backPublicPortal')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommercePortalLogin;
