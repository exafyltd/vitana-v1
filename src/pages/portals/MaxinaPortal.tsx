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
import { Loader2, Heart, Users, Stethoscope, Shield, Eye, EyeOff } from "lucide-react";
import { VitanalandPortalSeed } from "@/components/audio/VitanalandPortalSeed";
import { VitanaGuideOrbIntro } from "@/components/vitanaland/VitanaGuideOrbIntro";
import { supabase } from "@/integrations/supabase/client";
import { getEmailRedirectUrl, CONFIRMATION_PATHS } from '@/utils/redirectUrls';
import { useVitanalandNavigation } from "@/context/VitanalandNavigationContext";
import { useStreamingState } from "@/context/StreamingStateContext";
import { useSoundscape } from "@/context/SoundscapeContext";
import { Checkbox } from "@/components/ui/checkbox";
import { playSound } from "@/lib/playSound";
import { motion } from "framer-motion";
import { preloadDemoImages } from "@/lib/preloadDemoImages";

const MaxinaPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, setTenantBySlug } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { expandToFull } = useVitanalandNavigation();
  const { setAudioOverlayVisible } = useStreamingState();
  const { startFresh } = useSoundscape();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"community" | "patient" | "professional" | "admin">("community");
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  // Helper to ensure soundscape starts playing (for user interaction)
  const ensureSoundscapePlaying = useCallback(() => {
    startFresh();
  }, [startFresh]);

  // Switch to maxina tenant if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      const redirectTo = searchParams.get('redirectTo');
      setTenantBySlug('maxina').then(() => {
        navigate(redirectTo || "/home");
      });
    }
  }, [user, authLoading, navigate, setTenantBySlug, searchParams]);

  // Set tenant theme
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-accent", "#FF7BAC");
    root.style.setProperty("--brand-bg", "#FFF5F8");
    root.style.setProperty("--brand-fg", "#1A1A1A");
  }, []);

  // Load daily-rotating video background
  useEffect(() => {
    getIntroVideoSrc('maxina').then(setVideoSrc);
  }, []);

  // Start soundscape when video loads
  useEffect(() => {
    if (videoSrc) {
      startFresh(0.05);
    }
  }, [videoSrc, startFresh]);

  const handleOrbClick = () => {
    playSound("/sounds/vitanaland/spark-chime.mp3", 0.12);
    expandToFull();
    setTimeout(() => {
      setAudioOverlayVisible(true);
    }, 100);
  };

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
        setError("Please check your email to confirm your account.");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getEmailRedirectUrl('/home'),
          queryParams: {
            tenant_slug: 'maxina'
          }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('OAuth error:', err);
      setError(err.message || 'Social login failed. Please try again.');
    }
  };

  if (authLoading) {
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
        <div className="relative z-20 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
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
      
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/25 via-black/5 to-transparent z-10" />
      
      {/* Content layer */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-6 py-4">
        <div className="max-w-md w-full">
          {/* Auth Tabs */}
          <Card 
            className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl shadow-black/20"
            onClick={ensureSoundscapePlaying}
          >
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Join Maxina</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Welcome back to Maxina.</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Sign in to continue your Vitanaland journey.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-3">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={ensureSoundscapePlaying}
                          required
                          disabled={loading}
                        />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder=""
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pr-10"
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
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="keep-logged-in"
                            checked={keepLoggedIn}
                            onCheckedChange={(checked) => setKeepLoggedIn(checked as boolean)}
                          />
                          <Label
                            htmlFor="keep-logged-in"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Keep me logged in
                          </Label>
                        </div>
                        <Link
                          to="/reset-password" 
                          className="text-sm text-muted-foreground hover:text-[#FF7BAC] transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      
                      <div>
                    </div>
                    
                      <Button 
                        type="submit" 
                        className="w-full rounded-full bg-gradient-to-r from-[#FF6FB3] to-[#FF4FA0] hover:from-[#FF85BE] hover:to-[#FF5FAB] hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in…
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>

                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border/50" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSocialLogin('google')}
                          disabled={loading}
                          className="w-full"
                        >
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                          className="w-full"
                        >
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Join the Maxina community.</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Create your account and begin your wellness journey.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-3">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder=""
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pr-10"
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

                    {/* Role Selection */}
                    <div className="space-y-3">
                      <Label>I am joining as:</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={selectedRole === "community" ? "default" : "outline"}
                          className="p-3 h-auto flex-col"
                          onClick={() => setSelectedRole("community")}
                        >
                          <Users className="h-4 w-4 mb-1" />
                          <span className="text-xs">Community</span>
                        </Button>
                        <Button
                          type="button"
                          variant={selectedRole === "patient" ? "default" : "outline"}
                          className="p-3 h-auto flex-col"
                          onClick={() => setSelectedRole("patient")}
                        >
                          <Heart className="h-4 w-4 mb-1" />
                          <span className="text-xs">Patient</span>
                        </Button>
                        <Button
                          type="button"
                          variant={selectedRole === "professional" ? "default" : "outline"}
                          className="p-3 h-auto flex-col"
                          onClick={() => setSelectedRole("professional")}
                        >
                          <Stethoscope className="h-4 w-4 mb-1" />
                          <span className="text-xs">Professional</span>
                        </Button>
                        <Button
                          type="button"
                          variant={selectedRole === "admin" ? "default" : "outline"}
                          className="p-3 h-auto flex-col"
                          onClick={() => setSelectedRole("admin")}
                        >
                          <Shield className="h-4 w-4 mb-1" />
                          <span className="text-xs">Admin</span>
                        </Button>
                      </div>
                    </div>
                    
                      <Button 
                        type="submit" 
                        className="w-full rounded-full bg-gradient-to-r from-[#FF6FB3] to-[#FF4FA0] hover:from-[#FF85BE] hover:to-[#FF5FAB] hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account…
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>

                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border/50" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSocialLogin('google')}
                          disabled={loading}
                          className="w-full"
                        >
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                          className="w-full"
                        >
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
            </Tabs>
          </Card>

          {/* Trust & Navigation Footer */}
          <div className="space-y-3">
            <p className="text-center text-white/70 text-xs">
              Maxina is part of the VITANA ecosystem.
            </p>
            
            <div className="flex justify-center items-center space-x-4 text-sm">
              <Link to="/privacy" className="text-white/80 hover:text-white font-medium transition-colors">
                Privacy
              </Link>
              <span className="text-white/40">·</span>
              <Link to="/terms" className="text-white/80 hover:text-white font-medium transition-colors">
                Terms
              </Link>
              <span className="text-white/40">·</span>
              <Link to="/help" className="text-white/80 hover:text-white font-medium transition-colors">
                Help
              </Link>
            </div>
            
            <div className="w-16 h-px bg-white/30 mx-auto" />
            
            {/* Secondary navigation */}
            <div className="flex justify-center space-x-6 text-sm pt-1">
              <Link to="/alkalma" className="text-white/90 hover:text-white font-medium underline-offset-4 hover:underline transition-all">
                AlKalma Portal
              </Link>
              <Link to="/earthlinks" className="text-white/90 hover:text-white font-medium underline-offset-4 hover:underline transition-all">
                Earthlinks Portal
              </Link>
              <Link to="/" className="text-white/90 hover:text-white font-medium underline-offset-4 hover:underline transition-all">
                ← Back to All Portals
              </Link>
            </div>
          </div>
        </div>

        {/* Mini VITANA Orb - Bottom Right Corner Assistant */}
        <VitanaGuideOrbIntro onOrbClick={handleOrbClick} initialDelay={0.8} />
      </div>
    </div>
  );
};

export default MaxinaPortal;