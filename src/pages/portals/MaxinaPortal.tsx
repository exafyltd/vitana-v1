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
import { Loader2, Heart, Users, Stethoscope, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEmailRedirectUrl, CONFIRMATION_PATHS } from '@/utils/redirectUrls';

const MaxinaPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, setTenantBySlug } = useTenant();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"community" | "patient" | "professional" | "admin">("community");

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF7BAC]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50">
      <SEO 
        title="Maxina Health Platform - VITANA" 
        description="Join Maxina's comprehensive health and wellness community. Connect with healthcare professionals and take control of your health journey." 
        canonical={window.location.href} 
      />
      
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Heart className="h-12 w-12 text-[#FF7BAC]" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">Maxina</h1>
            <p className="text-muted-foreground mt-2">
              Your comprehensive health & wellness platform
            </p>
          </div>

          {/* Auth Tabs */}
          <Card>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Join Maxina</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Sign in to your Maxina account</CardDescription>
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
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    
                    <Button type="submit" className="w-full bg-[#FF7BAC] hover:bg-[#FF7BAC]/90" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="signup">
                <CardHeader>
                  <CardTitle>Join Maxina</CardTitle>
                  <CardDescription>Create your account and choose your role</CardDescription>
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
                    
                    <Button type="submit" className="w-full bg-[#FF7BAC] hover:bg-[#FF7BAC]/90" disabled={loading}>
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
              </TabsContent>
            </Tabs>
          </Card>

          {/* Navigation Links */}
          <div className="flex justify-center space-x-6 text-sm">
            <Link to="/alkalma" className="text-muted-foreground hover:text-primary">
              AlKalma Portal
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

export default MaxinaPortal;