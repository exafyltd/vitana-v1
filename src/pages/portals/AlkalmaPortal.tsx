import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Users, Stethoscope, Shield, Eye, EyeOff, MailCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { getEmailRedirectUrl, CONFIRMATION_PATHS } from '@/utils/redirectUrls';
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton';
import { useSupabaseOAuthSignIn } from "@/hooks/useSupabaseOAuthSignIn";
import { friendlyOAuthError } from "@/lib/oauthErrors";
import { toast } from "sonner";
import { t } from '@/lib/i18n-toast';

const AlkalmaPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, setTenantBySlug } = useTenant();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"community" | "patient" | "professional" | "admin">("community");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const oauthSignIn = useSupabaseOAuthSignIn();

  // Switch to alkalma tenant if already authenticated
  useEffect(() => {
    if (!authLoading && user && !loading) {
      // If user is already authenticated, switch to alkalma tenant and redirect
      setTenantBySlug('alkalma').then(() => {
        navigate('/comm/events-meetups?tab=hot');
      });
    }
  }, [user, authLoading, navigate, loading, setTenantBySlug]);

  // Set tenant theme
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-accent", "#3B82F6");
    root.style.setProperty("--brand-bg", "#EFF6FF");
    root.style.setProperty("--brand-fg", "#1A1A1A");
  }, []);

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
        return;
      }

      // CRITICAL: Switch tenant BEFORE allowing navigation
      console.log('Switching to alkalma tenant after successful login...');
      
      try {
        await supabase.rpc('switch_to_tenant_by_slug', {
          p_tenant_slug: 'alkalma'
        });
        console.log('Successfully switched to alkalma tenant');
        
        // Refresh session to get updated metadata
        await supabase.auth.refreshSession();
        console.log('Session refreshed with updated tenant context');
        
        // Now navigate to events
        navigate('/comm/events-meetups?tab=hot');
      } catch (switchError) {
        console.error('Error switching tenant after login:', switchError);
        setError("Login successful but failed to switch to Alkalma tenant. Please try refreshing the page.");
      }
    } catch (err) {
      console.error('Sign in error:', err);
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
          emailRedirectTo: getEmailRedirectUrl(CONFIRMATION_PATHS.alkalma),
          data: {
            full_name: fullName,
            tenant_slug: "alkalma",
            preferred_role: selectedRole
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setError("This email is already registered. Please sign in or try switching to this tenant if you're already logged in.");
        } else {
          setError(error.message);
        }
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
    try {
      await oauthSignIn.mutateAsync({
        provider,
        redirectTo: getEmailRedirectUrl('/home'),
        queryParams: { tenant_slug: 'alkalma' },
      });
    } catch (err: any) {
      const message = friendlyOAuthError(err, provider);
      setError(message);
      toast.error(message);
    }
  };

  // Show loading state while checking auth OR if user exists (redirect in progress)
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <SEO 
        title={t('screens.portals.alkalmaHealthPlatformVitana')} 
        description="Join AlKalma's innovative health and wellness community. Experience culturally-aware healthcare and wellness solutions." 
        canonical={window.location.href} 
      />
      
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <BookOpen className="h-12 w-12 text-[#3B82F6]" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">AlKalma</h1>
            <p className="text-muted-foreground mt-2">
              Culturally-aware health & wellness solutions
            </p>
          </div>

          {/* Auth Tabs */}
          <Card>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('screens.portals.sign')}</TabsTrigger>
                <TabsTrigger value="signup">{t('screens.portals.joinAlkalma')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <CardHeader>
                  <CardTitle>{t('screens.portals.welcomeBack')}</CardTitle>
                  <CardDescription>{t('screens.portals.signYourAlkalmaAccount')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
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
                        placeholder={t('screens.portals.yourEmailCom')}
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
                    
                    <Button type="submit" className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                    
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">{t('screens.portals.continueWith')}</span>
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
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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
                          <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11"/>
                        </svg>
                        Apple
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="signup">
                {signupSuccess && signupEmail ? (
                  <div className="px-6 py-8 text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-full bg-[#3B82F6]/10 flex items-center justify-center">
                      <MailCheck className="h-7 w-7 text-[#3B82F6]" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{t('screens.portals.checkYourEmail')}</h3>
                    <p className="text-sm text-muted-foreground">
                      We've sent a confirmation link to <span className="font-medium text-foreground">{signupEmail}</span>
                    </p>
                    <ResendConfirmationButton email={signupEmail} redirectUrl={getEmailRedirectUrl(CONFIRMATION_PATHS.alkalma)} />
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
                <CardHeader>
                  <CardTitle>{t('screens.portals.joinAlkalma')}</CardTitle>
                  <CardDescription>{t('screens.portals.createYourAccountChooseYourRole')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t('screens.portals.fullName')}</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder={t('screens.portals.yourFullName')}
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
                        placeholder={t('screens.portals.yourEmailCom')}
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-3">
                      <Label>{t('screens.portals.iAmJoiningAs')}</Label>
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
                          <BookOpen className="h-4 w-4 mb-1" />
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
                    
                    <Button type="submit" className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </CardContent>
                </>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Navigation Links */}
          <div className="flex justify-center space-x-6 text-sm">
            <Link to="/maxina" className="text-muted-foreground hover:text-primary">
              Maxina Portal
            </Link>
            <Link to="/earthlinks" className="text-muted-foreground hover:text-primary">
              Earthlinks Portal
            </Link>
            <Link to="/" className="text-muted-foreground hover:text-primary">
              Public Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlkalmaPortal;