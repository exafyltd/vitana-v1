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
import { ArchetypeSkeleton, ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";

// VTID-05117: the portal keeps its dark look through the app's own dark theme
// tokens (a `dark` scope) instead of raw slate literals.
const PAGE = "dark min-h-screen bg-background text-foreground";

const CommercePortalLogin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const spotlight = useSpotlightEnabled();
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
      <div className={`${PAGE} flex items-center justify-center p-6`}>
        <div className="w-full max-w-md">
          <ArchetypeSkeleton archetype="form" />
        </div>
      </div>
    );
  }

  const card = (
        <div className="w-full max-w-md rounded-xl border border-primary/15 bg-card p-8 shadow-2xl">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <ShoppingBag className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-primary">VITANALAND</h1>
            <p className="text-muted-foreground">{t('screens.commerceportal.loginSubtitle')}</p>
          </div>

          <div className="my-6 border-t border-border" />

          <p className="text-center text-sm text-muted-foreground mb-6">
            {t('screens.commerceportal.loginIntro')}
          </p>

          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-status-error-subtle border-status-error/40 text-status-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="commerce-email" className="text-foreground/80">
                {t('screens.portals.email')}
              </Label>
              <Input
                id="commerce-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-background border-primary/20 text-foreground focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commerce-password" className="text-foreground/80">
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
                  className="bg-background border-primary/20 text-foreground focus-visible:ring-ring pe-10"
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('screens.portals.signing')}
                </>
              ) : (
                t('screens.commerceportal.loginButton')
              )}
            </Button>
          </form>

          <div className="text-center mt-6">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
              {t('screens.portals.backPublicPortal')}
            </Link>
          </div>
        </div>
  );

  const seo = (
    <SEO
      title={t('screens.index.commercePortal')}
      description="Vitanaland Commerce Portal — merchant self-service sign-in."
      canonical={window.location.href}
    />
  );

  // VTID-05117: Spotlight on → the `form` archetype (single form column, no rail).
  if (spotlight) {
    return (
      <ScreenFrame archetype="form" className={PAGE}>
        {seo}
        <div className="flex justify-center py-8">{card}</div>
      </ScreenFrame>
    );
  }

  return (
    <div className={PAGE}>
      {seo}
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        {card}
      </div>
    </div>
  );
};

export default CommercePortalLogin;
