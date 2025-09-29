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
import { Loader2, Leaf, Users, Stethoscope, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEmailRedirectUrl, CONFIRMATION_PATHS } from '@/utils/redirectUrls';

const EarthlinksPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const { tenant, setTenantBySlug } = useTenant();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"community" | "patient" | "professional" | "admin">("community");

  // Switch to earthlinks tenant if already authenticated
  useEffect(() => {
    if (!authLoading && user && !loading) {
      // If user is already authenticated, switch to earthlinks tenant and redirect
      setTenantBySlug('earthlinks').then(() => {
        navigate("/home");
      });
    }
  }, [user, authLoading, navigate, loading, setTenantBySlug]);

  // Set tenant theme
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-accent", "#4ADE80");
    root.style.setProperty("--brand-bg", "#F0FDF4");
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
      console.log('Switching to earthlinks tenant after successful login...');
      
      try {
        await supabase.rpc('switch_to_tenant_by_slug', {
          p_tenant_slug: 'earthlinks'
        });
        console.log('Successfully switched to earthlinks tenant');
        
        // Refresh session to get updated metadata
        await supabase.auth.refreshSession();
        console.log('Session refreshed with updated tenant context');
        
        // Now navigate to home
        navigate("/home");
      } catch (switchError) {
        console.error('Error switching tenant after login:', switchError);
        setError("Login successful but failed to switch to Earthlinks tenant. Please try refreshing the page.");
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
          emailRedirectTo: getEmailRedirectUrl(CONFIRMATION_PATHS.earthlinks),
          data: {
            full_name: fullName,
            tenant_slug: "earthlinks",
            preferred_role: selectedRole
          }
        }
      });

      if (error) {
        // Handle case where user already exists but tries to sign up again
        if (error.message.includes('already registered')) {
          setError("This email is already registered. Please sign in or try switching to this tenant if you're already logged in.");
        } else {
          setError(error.message);
        }
      } else {
        setError("Please check your email to confirm your account. After confirmation, you'll be redirected to the Earthlinks portal.");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#4ADE80]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <SEO 
        title="Earthlinks Health Platform - VITANA" 
        description="Join Earthlinks' sustainable health and wellness community. Connect with nature-focused healthcare and eco-friendly wellness solutions."
        canonical={window.location.href} 
      />
      
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Leaf className="h-12 w-12 text-[#4ADE80]" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">Earthlinks</h1>
            <p className="text-muted-foreground mt-2">
              Sustainable health & eco-friendly wellness
            </p>
          </div>

          {/* Auth Tabs */}
          <Card>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Join Earthlinks</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Sign in to your Earthlinks account</CardDescription>
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
                    
                    <Button type="submit" className="w-full bg-[#4ADE80] hover:bg-[#4ADE80]/90" disabled={loading}>
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
                  <CardTitle>Join Earthlinks</CardTitle>
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
                          <Leaf className="h-4 w-4 mb-1" />
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
                    
                    <Button type="submit" className="w-full bg-[#4ADE80] hover:bg-[#4ADE80]/90" disabled={loading}>
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
            <Link to="/maxina" className="text-muted-foreground hover:text-primary">
              Maxina Portal
            </Link>
            <Link to="/alkalma" className="text-muted-foreground hover:text-primary">
              AlKalma Portal
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

export default EarthlinksPortal;