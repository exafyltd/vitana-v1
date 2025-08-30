import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

const AdminBootstrap = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleExistingUserBootstrap = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You need to be logged in to bootstrap admin privileges');
      }

      // Call the bootstrap function
      const { error: bootstrapError } = await supabase.functions.invoke('bootstrap-exafy-admin', {
        body: { 
          userId: user.id,
          email: user.email 
        }
      });

      if (bootstrapError) {
        throw bootstrapError;
      }

      setSuccess('Admin privileges granted successfully! Redirecting to admin dashboard...');
      
      // Redirect to admin dashboard after a delay
      setTimeout(() => {
        navigate('/admin-dashboard');
      }, 2000);

    } catch (err: any) {
      console.error('Bootstrap error:', err);
      setError(err.message || "An error occurred during bootstrap");
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First, sign up the admin user
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Wait a bit for the user to be created
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Now bootstrap the user as admin using the edge function
      const { error: bootstrapError } = await supabase.functions.invoke('bootstrap-exafy-admin', {
        body: { 
          userId: authData.user.id,
          email: authData.user.email 
        }
      });

      if (bootstrapError) {
        console.error('Bootstrap function error:', bootstrapError);
        // Continue anyway as the user was created successfully
      }

      setSuccess(`Admin account created successfully! Please check your email at ${email} to confirm your account, then sign in to access the admin dashboard.`);
      
      // Redirect to sign in after a delay
      setTimeout(() => {
        navigate('/auth-workspace?action=join');
      }, 3000);

    } catch (err: any) {
      console.error('Bootstrap error:', err);
      setError(err.message || "An error occurred during bootstrap");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
      <SEO 
        title="Admin Bootstrap - VITANA" 
        description="Bootstrap your VITANA admin account"
      />
      
      <Card className="w-full max-w-md border-orange-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-orange-900">
            Admin Bootstrap
          </CardTitle>
          <CardDescription className="text-orange-700">
            Create your system administrator account to manage Maxina, Alkalma, and Earthlings workspaces
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBootstrap} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-orange-900">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                className="border-orange-200 focus:border-orange-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-orange-900">Admin Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourcompany.com"
                required
                className="border-orange-200 focus:border-orange-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-orange-900">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="border-orange-200 focus:border-orange-400"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Bootstrap Admin Account
            </Button>
          </form>

          {error && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h4 className="font-semibold text-orange-900 mb-2">What this does:</h4>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>• Creates your system admin account</li>
              <li>• Pre-populates Maxina, Alkalma & Earthlings workspaces</li>
              <li>• Grants you admin access to all workspaces</li>
              <li>• Enables you to invite and manage users</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Already have an account?</h4>
            <p className="text-sm text-blue-800 mb-3">
              If you're already registered but don't have admin privileges, click below to grant yourself admin access.
            </p>
            <Button 
              onClick={handleExistingUserBootstrap}
              variant="outline"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Grant Admin Privileges
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBootstrap;