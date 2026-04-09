import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { getIntroVideoSrc } from "@/utils/introVideo";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Eye, EyeOff, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEmailRedirectUrl, CONFIRMATION_PATHS } from '@/utils/redirectUrls';
import { useSoundscape } from "@/context/SoundscapeContext";
import { Checkbox } from "@/components/ui/checkbox";

import { motion } from "framer-motion";
import { preloadDemoImages } from "@/lib/preloadDemoImages";
import { toast } from "sonner";
import { fetchCommunityEventsQueryFn } from "@/hooks/useCommunityEvents";
import { useTranslation } from "@/hooks/useTranslation";
import { ResendConfirmationButton } from "@/components/auth/ResendConfirmationButton";

const MaxinaPortal = () => {
  const { translate } = useTranslation();
  const { user, session, loading: authLoading } = useAuth();
  const hasRedirectedRef = useRef(false);
  const { tenant, setTenantBySlug } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // VitanaOrb widget handles voice overlay externally
  const { startFresh } = useSoundscape();
  // OAuth callback detection — recovery is handled exclusively by AuthProvider.
  // We only check URL params to decide whether to show a loading screen.
  const [isProcessingOAuth] = useState(
    () => window.location.hash.includes('access_token') ||
      window.location.hash.includes('code=') ||
      window.location.search.includes('code=')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"community" | "patient" | "professional" | "admin">("community");
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Helper to ensure soundscape starts playing (for user interaction)
  const ensureSoundscapePlaying = useCallback(() => {
    startFresh();
  }, [startFresh]);

  // OAuth callback: when AuthProvider finishes loading without a user, the
  // isProcessingOAuth flag becomes stale — no custom timeout/recovery needed.

  // Default post-login redirect to Events → Upcoming on mobile
  // Prefetch events BEFORE navigation for instant first paint
  // HARD DEADLINE: always navigate within 6s of detecting user, no dead paths
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (hasRedirectedRef.current) return;

    hasRedirectedRef.current = true;
    console.debug('[MaxinaPortal] Redirect started, user:', user.id);

    const redirectTo = searchParams.get('redirectTo');
    const target = redirectTo || '/comm/events-meetups?tab=hot';

    // Hard deadline: navigate no matter what after 6s
    const deadlineTimer = setTimeout(() => {
      console.debug('[MaxinaPortal] Hard deadline reached, navigating to', target);
      navigate(target);
    }, 6000);

    const run = async () => {
      try {
        // Wait for session if needed (mobile OAuth hydration)
        let activeSession = session;
        if (!activeSession) {
          for (let i = 0; i < 6; i++) {
            await new Promise(r => setTimeout(r, 500));
            const { data } = await supabase.auth.getSession();
            if (data.session) { activeSession = data.session; break; }
          }
        }

        // Tenant switch + prefetch with 4s timeout
        const prefetchPromise = window.innerWidth < 768 && activeSession ? (async () => {
          const queryClient = (window as any).queryClient;
          if (queryClient) {
            await queryClient.prefetchQuery({
              queryKey: ['global-community-events', activeSession.user.id],
              queryFn: fetchCommunityEventsQueryFn,
              staleTime: 2 * 60 * 1000,
            });
          }
        })() : Promise.resolve();

        const setup = Promise.all([
          prefetchPromise,
          setTenantBySlug('maxina')
        ]).catch(err => console.warn('[MaxinaPortal] Setup error:', err));

        await Promise.race([setup, new Promise(r => setTimeout(r, 4000))]);
      } catch (err) {
        console.warn('[MaxinaPortal] Redirect setup failed:', err);
      } finally {
        clearTimeout(deadlineTimer);
        console.debug('[MaxinaPortal] Navigating to', target);
        navigate(target);
      }
    };

    run();
  }, [user, authLoading, navigate, setTenantBySlug, searchParams, session, isProcessingOAuth]);

  // Set tenant theme
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-accent", "#FF7BAC");
    root.style.setProperty("--brand-bg", "#FFF5F8");
    root.style.setProperty("--brand-fg", "#1A1A1A");
  }, []);

  // Add body class for Maxina-specific orb positioning
  useEffect(() => {
    document.body.classList.add('maxina-signin-page');
    return () => {
      document.body.classList.remove('maxina-signin-page');
    };
  }, []);

  // Handle email confirmation success - show welcome toast and clean URL
  useEffect(() => {
    if (searchParams.get('confirmed') === 'true') {
      toast.success(translate('portals.maxina.emailConfirmed', "Email confirmed! Welcome to Maxina."), {
        duration: 4000,
      });
      
      // Clean URL after short delay
      setTimeout(() => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('confirmed');
        window.history.replaceState({}, '', 
          newParams.toString() ? `/maxina?${newParams}` : '/maxina'
        );
      }, 2000);
    }
  }, [searchParams, translate]);

  // Load daily-rotating video background
  useEffect(() => {
    getIntroVideoSrc('maxina').then(setVideoSrc);
  }, []);

  // NOTE: Do NOT auto-start soundscape on mount/video load
  // Soundscape should only start on explicit user gesture (click)
  // The ensureSoundscapePlaying callback handles this correctly


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        // Preload demo images in background while user waits
        preloadDemoImages().catch(console.error);
        
        // After successful sign-in, switch to the current tenant context
        // This ensures users can access different tenants after login
        try {
          await supabase.rpc('switch_to_tenant_by_slug', {
            p_tenant_slug: 'maxina'
          });
          // Refresh session to get updated metadata
          await supabase.auth.refreshSession();
        } catch (switchError) {
          console.error('Error switching tenant after login:', switchError);
          // Continue with login even if tenant switch fails
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getEmailRedirectUrl(CONFIRMATION_PATHS.maxina),
          data: {
            full_name: fullName,
            tenant_slug: "maxina",
            preferred_role: selectedRole
          }
        }
      });

      if (error) {
        setError(error.message);
      } else {
        setSignupEmail(email);
        setSignupSuccess(true);
        setError("");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError('');
    try {
      localStorage.setItem('tenant_slug', 'maxina');
      localStorage.setItem('oauth_provider', provider);
      const redirectPath = '/maxina';

      console.debug('[MaxinaPortal] Starting OAuth with provider:', provider);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getEmailRedirectUrl(redirectPath),
          queryParams: {
            tenant_slug: 'maxina'
          },
        }
      });
      if (error) throw error;

      // Standard Supabase redirect handles navigation — don't reset loading
    } catch (err: any) {
      console.error('OAuth error:', err);
      setError(err.message || 'Social login failed. Please try again.');
      setLoading(false);
    }
  };

  // Show loading state while checking auth OR if user exists (redirect in progress)
  // OR if OAuth hash is being processed (but not timed out yet)
  if (authLoading || user || (isProcessingOAuth && !oauthTimedOut)) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Video Background */}
        {videoSrc && (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="fixed inset-0 w-full h-full object-cover"
            src={videoSrc}
          />
        )}
        
        {/* Dark overlay */}
        <div className="fixed inset-0 bg-gradient-to-b from-black/25 via-black/5 to-transparent z-10" />
        
        {/* Content */}
        <div className="relative z-20 min-h-screen flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          {isProcessingOAuth && (
            <p className="text-white/70 text-sm animate-pulse">Signing you in…</p>
          )}
        </div>
      </div>
    );
  }

  // OAuth timed out — show retry + back to login
  if (oauthTimedOut) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {videoSrc && (
          <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover" src={videoSrc} />
        )}
        <div className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 z-10" />
        <div className="relative z-20 min-h-screen flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-white text-lg font-medium">Something went wrong</p>
          <p className="text-white/70 text-sm text-center">Sign-in is taking longer than expected.</p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              onClick={async () => {
                setOauthTimedOut(false);
                // Clear stale callback params
                window.history.replaceState(null, '', window.location.pathname);
                // Try one more session check before restarting OAuth
                const { data: { session: s } } = await supabase.auth.getSession();
                if (s) {
                  const target = searchParams.get('redirectTo') || '/comm/events-meetups?tab=hot';
                  setTenantBySlug('maxina').catch(console.warn);
                  navigate(target);
                } else {
                  // Restart OAuth with the original provider
                  const provider = (localStorage.getItem('oauth_provider') as 'apple' | 'google') || 'apple';
                  handleSocialLogin(provider);
                }
              }}
              className="w-full rounded-full bg-gradient-to-r from-[#FF6FB3] to-[#FF4FA0] hover:from-[#FF85BE] hover:to-[#FF5FAB] text-white px-8"
            >
              Try Sign-In again
            </Button>
            <Button
              onClick={() => {
                setOauthTimedOut(false);
                window.history.replaceState(null, '', '/maxina');
                hasRedirectedRef.current = false;
                navigate('/maxina');
              }}
              variant="ghost"
              className="w-full rounded-full text-white/80 hover:text-white hover:bg-white/10"
            >
              Back to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <SEO 
        title="Maxina Health Platform - VITANA" 
        description="Join Maxina's comprehensive health and wellness community. Connect with healthcare professionals and take control of your health journey." 
        canonical={window.location.href} 
      />
      
      {/* Video Background */}
      {videoSrc && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover"
          src={videoSrc}
        />
      )}
      
      {/* Premium multi-layer gradient overlay for readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 z-10" />
      <div className="fixed inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
      
      {/* Content layer - pulled up with safe bottom spacing */}
      <div className="relative z-20 flex flex-col items-center justify-start min-h-screen px-4 pt-16 md:pt-16 md:justify-center md:px-6 pb-32 md:pb-6 maxina-page-content maxina-signin-page" data-maxina-app="true">
        <div className="max-w-md w-full">
          {/* Auth Tabs - Compact card */}
          <Card 
            className="bg-white/75 backdrop-blur-xl rounded-2xl border border-white/30 shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
            onClick={ensureSoundscapePlaying}
          >
            <Tabs defaultValue="signin" className="w-full">
              {/* Compact tab bar */}
              <TabsList className="grid w-full grid-cols-2 h-10 md:h-11">
                <TabsTrigger value="signin" className="text-sm md:text-base py-1.5">{translate('authPage.signIn', 'Sign In')}</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm md:text-base py-1.5">{translate('portals.maxina.joinMaxina', 'Join Maxina')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                {/* Compact header */}
                <CardHeader className="pb-2 pt-4 md:pb-3 md:pt-5 px-4 md:px-6">
                  <CardTitle className="text-lg md:text-xl">{translate('portals.maxina.welcomeBack', 'Welcome back to Maxina.')}</CardTitle>
                  <CardDescription className="text-sm md:text-base mt-1">
                    {translate('portals.maxina.continueJourney', 'Sign in to continue your journey.')}
                  </CardDescription>
                </CardHeader>
                {/* Compact form content */}
                <CardContent className="px-4 md:px-6 pt-0 pb-4 md:pb-5">
                  <form onSubmit={handleSignIn} className="space-y-2.5 md:space-y-3">
                    {error && (
                      <Alert variant="destructive" className="py-2">
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm">{translate('authPage.email', 'Email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={ensureSoundscapePlaying}
                          required
                          disabled={loading}
                          className="h-10 md:h-11"
                        />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-sm">{translate('authPage.password', 'Password')}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder=""
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pr-10 h-10 md:h-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      </div>
                      
                      {/* Compact row: Keep me logged in + Forgot password */}
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-1.5">
                          <Checkbox
                            id="keep-logged-in"
                            checked={keepLoggedIn}
                            onCheckedChange={(checked) => setKeepLoggedIn(checked as boolean)}
                            className="h-3.5 w-3.5"
                          />
                          <Label
                            htmlFor="keep-logged-in"
                            className="text-xs font-normal cursor-pointer"
                          >
                            {translate('authPage.keepLoggedIn', 'Keep me logged in')}
                          </Label>
                        </div>
                        <Link
                          to="/reset-password" 
                          className="text-xs text-muted-foreground hover:text-[#FF7BAC] transition-colors"
                        >
                          {translate('portals.maxina.forgotPassword', 'Forgot password?')}
                        </Link>
                      </div>
                    
                      <Button 
                        type="submit" 
                        className="w-full rounded-full bg-gradient-to-r from-[#FF6FB3] to-[#FF4FA0] hover:from-[#FF85BE] hover:to-[#FF5FAB] hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300 h-10 md:h-11 text-sm md:text-base" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {translate('portals.maxina.signingIn', 'Signing in…')}
                          </>
                        ) : (
                          translate('authPage.signIn', 'Sign In')
                        )}
                      </Button>

                      {/* Compact social login divider */}
                      <div className="relative my-3 md:my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border/40" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-card px-2 text-[10px] md:text-xs uppercase text-muted-foreground tracking-wider">{translate('authPage.orContinueWith', 'Or continue with')}</span>
                        </div>
                      </div>

                      {/* Compact social buttons */}
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSocialLogin('google')}
                          disabled={loading}
                          className="w-full h-9 md:h-10 text-sm"
                        >
                          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M21.35 11.1h-9.17v2.98h5.44c-.24 1.38-1.65 4.04-5.44 4.04-3.28 0-5.96-2.71-5.96-6.05s2.68-6.05 5.96-6.05c1.87 0 3.12.79 3.84 1.47l2.62-2.53C17.51 3.26 15.35 2.4 13 2.4 7.98 2.4 3.94 6.46 3.94 11.5S7.98 20.6 13 20.6c7.47 0 8.94-6.05 8.34-9.5z"
                            />
                          </svg>
                          Google
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSocialLogin('apple')}
                          disabled={loading}
                          className="w-full h-9 md:h-10 text-sm"
                        >
                          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M16.365 1.43c0 1.14-.42 2.13-1.26 2.97-.96.96-2.06 1.52-3.3 1.47-.06-1.17.42-2.19 1.26-3.03.9-.9 2.1-1.47 3.3-1.41zm5.22 16.29c-.6 1.47-1.38 2.73-2.28 3.69-1.02 1.08-2.16 1.65-3.42 1.68-1.02.03-1.71-.3-2.49-.66-.6-.3-1.23-.6-2.04-.6-.84 0-1.47.3-2.1.6-.78.36-1.53.72-2.55.69-1.29-.03-2.4-.57-3.42-1.65-1.14-1.2-2.07-2.76-2.82-4.74-.96-2.49-1.44-4.89-1.44-7.17 0-2.1.48-3.93 1.47-5.46C1.965 3.9 3.315 3 4.845 2.97c.96-.03 1.86.33 2.67.78.6.33 1.17.63 1.77.63.57 0 1.11-.3 1.74-.63.84-.45 1.77-.93 2.94-.81 1.89.18 3.24 1.02 4.17 2.52-1.65 1.02-2.49 2.46-2.46 4.32.03 1.77.96 3.27 2.43 4.11.72.42 1.53.66 2.43.69-.21.66-.45 1.29-.78 1.95z"
                            />
                          </svg>
                          Apple
                        </Button>
                      </div>
                  </form>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="signup">
                {signupSuccess && signupEmail ? (
                  <div className="px-4 md:px-6 py-8 text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-full bg-[#FF7BAC]/10 flex items-center justify-center">
                      <MailCheck className="h-7 w-7 text-[#FF7BAC]" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
                    <p className="text-sm text-muted-foreground">
                      We've sent a confirmation link to <span className="font-medium text-foreground">{signupEmail}</span>
                    </p>
                    <ResendConfirmationButton email={signupEmail} redirectUrl={getEmailRedirectUrl(CONFIRMATION_PATHS.maxina)} />
                    <button
                      type="button"
                      onClick={() => { setSignupSuccess(false); setSignupEmail(null); setError(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ← Use a different email
                    </button>
                  </div>
                ) : (
                <>
                {/* Compact header */}
                <CardHeader className="pb-2 pt-4 md:pb-3 md:pt-5 px-4 md:px-6">
                  <CardTitle className="text-lg md:text-xl">{translate('portals.maxina.joinCommunity', 'Join the Maxina community.')}</CardTitle>
                  <CardDescription className="text-sm md:text-base mt-1">
                    {translate('portals.maxina.createAccount', 'Create your account and begin your journey.')}
                  </CardDescription>
                </CardHeader>
                {/* Compact form content */}
                <CardContent className="px-4 md:px-6 pt-0 pb-4 md:pb-5">
                  <form onSubmit={handleSignUp} className="space-y-2.5 md:space-y-3">
                    {error && (
                      <Alert variant="destructive" className="py-2">
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-sm">{translate('authPage.fullName', 'Full Name')}</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder={translate('portals.maxina.yourFullName', 'Your full name')}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10 md:h-11"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm">{translate('authPage.email', 'Email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10 md:h-11"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-sm">{translate('authPage.password', 'Password')}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder=""
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pr-10 h-10 md:h-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    
                      <Button 
                        type="submit" 
                        className="w-full rounded-full bg-gradient-to-r from-[#FF6FB3] to-[#FF4FA0] hover:from-[#FF85BE] hover:to-[#FF5FAB] hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300 h-10 md:h-11 text-sm md:text-base" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {translate('portals.maxina.creatingAccount', 'Creating account…')}
                          </>
                        ) : (
                          translate('authPage.createAccount', 'Create Account')
                        )}
                      </Button>

                      {/* Compact social login divider */}
                      <div className="relative my-3 md:my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border/40" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-card px-2 text-[10px] md:text-xs uppercase text-muted-foreground tracking-wider">{translate('authPage.orContinueWith', 'Or continue with')}</span>
                        </div>
                      </div>

                      {/* Compact social buttons */}
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSocialLogin('google')}
                          disabled={loading}
                          className="w-full h-9 md:h-10 text-sm"
                        >
                          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M21.35 11.1h-9.17v2.98h5.44c-.24 1.38-1.65 4.04-5.44 4.04-3.28 0-5.96-2.71-5.96-6.05s2.68-6.05 5.96-6.05c1.87 0 3.12.79 3.84 1.47l2.62-2.53C17.51 3.26 15.35 2.4 13 2.4 7.98 2.4 3.94 6.46 3.94 11.5S7.98 20.6 13 20.6c7.47 0 8.94-6.05 8.34-9.5z"
                            />
                          </svg>
                          Google
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSocialLogin('apple')}
                          disabled={loading}
                          className="w-full h-9 md:h-10 text-sm"
                        >
                          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              fill="currentColor"
                              d="M16.365 1.43c0 1.14-.42 2.13-1.26 2.97-.96.96-2.06 1.52-3.3 1.47-.06-1.17.42-2.19 1.26-3.03.9-.9 2.1-1.47 3.3-1.41zm5.22 16.29c-.6 1.47-1.38 2.73-2.28 3.69-1.02 1.08-2.16 1.65-3.42 1.68-1.02.03-1.71-.3-2.49-.66-.6-.3-1.23-.6-2.04-.6-.84 0-1.47.3-2.1.6-.78.36-1.53.72-2.55.69-1.29-.03-2.4-.57-3.42-1.65-1.14-1.2-2.07-2.76-2.82-4.74-.96-2.49-1.44-4.89-1.44-7.17 0-2.1.48-3.93 1.47-5.46C1.965 3.9 3.315 3 4.845 2.97c.96-.03 1.86.33 2.67.78.6.33 1.17.63 1.77.63.57 0 1.11-.3 1.74-.63.84-.45 1.77-.93 2.94-.81 1.89.18 3.24 1.02 4.17 2.52-1.65 1.02-2.49 2.46-2.46 4.32.03 1.77.96 3.27 2.43 4.11.72.42 1.53.66 2.43.69-.21.66-.45 1.29-.78 1.95z"
                            />
                          </svg>
                          Apple
                        </Button>
                      </div>
                  </form>
                </CardContent>
                </>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Compact Trust & Navigation Footer */}
          <div className="space-y-2 mt-3 md:mt-4" data-maxina-footer="true">
            <p className="text-center text-white/60 text-[10px] md:text-xs tracking-wide">
              {translate('portals.maxina.partOfVitana', 'Maxina is part of the VITANA ecosystem.')}
            </p>
            
            <div className="flex justify-center items-center space-x-3 text-xs md:text-sm">
              <Link to="/privacy" className="text-white/70 hover:text-white font-medium transition-colors tracking-wide">
                Privacy
              </Link>
              <span className="text-white/30">·</span>
              <Link to="/terms" className="text-white/70 hover:text-white font-medium transition-colors tracking-wide">
                Terms
              </Link>
              <span className="text-white/30">·</span>
              <Link to="/delete-account" className="text-white/70 hover:text-white font-medium transition-colors tracking-wide">
                Delete Account
              </Link>
              <span className="text-white/30">·</span>
              <a href="mailto:support@exafy.io" className="text-white/70 hover:text-white font-medium transition-colors tracking-wide">
                Help
              </a>
            </div>
            
          </div>
        </div>
        
        <div className="pb-6 md:pb-0" />


      </div>
    </div>
  );
};

export default MaxinaPortal;