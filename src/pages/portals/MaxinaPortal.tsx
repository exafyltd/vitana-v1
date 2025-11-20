import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { Loader2, Heart, Users, Stethoscope, Shield } from "lucide-react";
import { VitanalandPortalSeed } from "@/components/audio/VitanalandPortalSeed";
import { VitanaGuideOrbIntro } from "@/components/vitanaland/VitanaGuideOrbIntro";
import { supabase } from "@/integrations/supabase/client";
import { getEmailRedirectUrl, CONFIRMATION_PATHS } from '@/utils/redirectUrls';
import { useVitanalandNavigation } from "@/context/VitanalandNavigationContext";
import { useStreamingState } from "@/context/StreamingStateContext";
import { playSound } from "@/lib/playSound";
import { motion } from "framer-motion";

const MaxinaPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, setTenantBySlug } = useTenant();
  const navigate = useNavigate();
  const { expandToFull } = useVitanalandNavigation();
  const { setAudioOverlayVisible } = useStreamingState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"community" | "patient" | "professional" | "admin">("community");
  const [videoSrc, setVideoSrc] = useState<string>("");

  // Switch to maxina tenant if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      // If user is already authenticated, switch to maxina tenant and redirect
      setTenantBySlug('maxina').then(() => {
        navigate("/home");
      });
    }
  }, [user, authLoading, navigate, setTenantBySlug]);

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
        <div className="max-w-md w-full space-y-4">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <Heart className="h-8 w-8 text-white" fill="white" fillOpacity={0.3} />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Maxina</h1>
            <p className="text-white/90 mt-2 text-base font-light">
              Your wellness journey starts here
            </p>
          </div>

          {/* Auth Tabs */}
          <Card className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl shadow-black/20">
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
                          required
                          disabled={loading}
                        />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                      
                      <div className="flex justify-end">
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
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
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