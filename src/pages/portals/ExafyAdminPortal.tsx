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
import { Loader2, Shield, Users, Settings, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useRoleBasedRedirect } from "@/hooks/useSmartRouting";

const ExafyAdminPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const { isExafyAdmin, tenant } = useTenant();
  const { getRedirectUrl } = useRoleBasedRedirect();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  // Redirect authenticated Exafy admins to tenant management
  useEffect(() => {
    if (!authLoading && user && isExafyAdmin) {
      navigate(getRedirectUrl());
    }
  }, [user, isExafyAdmin, authLoading, navigate]);

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/exafy-admin`,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('OAuth error:', err);
      setError(err.message || 'Social login failed. Please try again.');
    }
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
        // Navigation will be handled by useEffect after auth state updates
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth OR if user exists (redirect in progress)
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <SEO 
        title="Exafy Administration Portal - VITANA" 
        description="Secure access portal for Exafy administrators to manage tenant environments and system operations." 
        canonical={window.location.href} 
      />
      
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Exafy Administration</h1>
            <p className="text-muted-foreground mt-2">
              Secure access portal for system administrators
            </p>
          </div>

          {/* Admin Login Form */}
          <Card>
            <CardHeader>
              <CardTitle>Administrator Sign In</CardTitle>
              <CardDescription>
                Access the tenant management dashboard
              </CardDescription>
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
                    placeholder="admin@exafy.com"
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
          </Card>

          {/* Back to Public Portal */}
          <div className="text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
              ← Back to Public Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExafyAdminPortal;