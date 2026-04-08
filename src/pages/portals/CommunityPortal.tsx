import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Heart, BookOpen, Leaf, Eye, EyeOff, MailCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { getEmailRedirectUrl, CONFIRMATION_PATHS } from '@/utils/redirectUrls';
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton';

const CommunityPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<"maxina" | "alkalma" | "earthlinks">("maxina");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/home");
    }
  }, [user, authLoading, navigate]);

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
          emailRedirectTo: getEmailRedirectUrl(CONFIRMATION_PATHS.community),
          data: {
            full_name: fullName,
            tenant_slug: selectedTenant,
            preferred_role: "community"
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
      localStorage.setItem('oauth_provider', provider);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getEmailRedirectUrl('/home'),
        }
      });
      if (error) throw error;
      // Don't reset loading — page will redirect
    } catch (err: any) {
      console.error('OAuth error:', err);
      setError(err.message || 'Social login failed. Please try again.');
      setLoading(false);
    }
  };

  const tenantInfo = {
    maxina: {
      name: "Maxina",
      description: "Comprehensive health & wellness platform",
      icon: Heart,
      color: "#FF7BAC"
    },
    alkalma: {
      name: "AlKalma", 
      description: "Culturally-aware health solutions",
      icon: BookOpen,
      color: "#3B82F6"
    },
    earthlinks: {
      name: "Earthlinks",
      description: "Sustainable & eco-friendly wellness",
      icon: Leaf,
      color: "#4ADE80"
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <SEO 
        title="Community Portal - VITANA" 
        description="Join the VITANA community. Choose your health platform and connect with like-minded individuals on your wellness journey." 
        canonical={window.location.href} 
      />
      
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">VITANA Community</h1>
            <p className="text-muted-foreground mt-2">
              Join our health & wellness community
            </p>
          </div>

          {/* Auth Tabs */}
          <Card>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Join Community</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Sign in to your VITANA account</CardDescription>
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
                        placeholder="your@email.com"
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
                    
                    <Button type="submit" className="w-full" disabled={loading}>
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
                {signupSuccess && signupEmail ? (
                  <div className="px-6 py-8 text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <MailCheck className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
                    <p className="text-sm text-muted-foreground">
                      We've sent a confirmation link to <span className="font-medium text-foreground">{signupEmail}</span>
                    </p>
                    <ResendConfirmationButton email={signupEmail} redirectUrl={getEmailRedirectUrl(CONFIRMATION_PATHS.community)} />
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
                  <CardTitle>Join the Community</CardTitle>
                  <CardDescription>Create your account and choose your platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
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
                        placeholder="your@email.com"
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

                    {/* Tenant Selection */}
                    <div className="space-y-3">
                      <Label>Choose your platform:</Label>
                      <Select value={selectedTenant} onValueChange={(value: "maxina" | "alkalma" | "earthlinks") => setSelectedTenant(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(tenantInfo).map(([key, info]) => {
                            const Icon = info.icon;
                            return (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center space-x-2">
                                  <Icon className="h-4 w-4" style={{ color: info.color }} />
                                  <div className="text-left">
                                    <div className="font-medium">{info.name}</div>
                                    <div className="text-xs text-muted-foreground">{info.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={loading}>
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

          {/* Tenant Portal Links */}
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">Or access specific platforms directly:</p>
            <div className="grid grid-cols-3 gap-2">
              <Link to="/maxina" className="p-3 rounded-lg border bg-white/50 hover:bg-white/80 transition-colors">
                <Heart className="h-5 w-5 mx-auto mb-1" style={{ color: "#FF7BAC" }} />
                <div className="text-xs font-medium">Maxina</div>
              </Link>
              <Link to="/alkalma" className="p-3 rounded-lg border bg-white/50 hover:bg-white/80 transition-colors">
                <BookOpen className="h-5 w-5 mx-auto mb-1" style={{ color: "#3B82F6" }} />
                <div className="text-xs font-medium">AlKalma</div>
              </Link>
              <Link to="/earthlinks" className="p-3 rounded-lg border bg-white/50 hover:bg-white/80 transition-colors">
                <Leaf className="h-5 w-5 mx-auto mb-1" style={{ color: "#4ADE80" }} />
                <div className="text-xs font-medium">Earthlinks</div>
              </Link>
            </div>
          </div>

          {/* Back to Main */}
          <div className="text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
              ← Back to Main Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPortal;