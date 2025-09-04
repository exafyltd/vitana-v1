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
import { Loader2, Users, Heart, BookOpen, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CommunityPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<"maxina" | "alkalma" | "earthlinks">("maxina");

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
          emailRedirectTo: `${window.location.origin}/`,
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
        setError("Please check your email to confirm your account.");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
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
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
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
                  </form>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="signup">
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