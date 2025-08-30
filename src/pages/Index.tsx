import { Link, useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/contexts/SupabaseSession";
import { useEffect } from "react";
import { Building2, Users } from "lucide-react";

const Index = () => {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  // Redirect logged in users to home
  useEffect(() => {
    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <SEO title="VITANA – Digital Solutions" description="Welcome to VITANA. Experience innovation and excellence with our cutting-edge platform." canonical={window.location.href} />
      
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-6xl font-bold text-foreground mb-4">VITANA</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Digital Solutions for Your Wellness Journey
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
            Experience innovation and excellence with our cutting-edge platform designed to transform your health and wellness experience.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  <CardTitle>Create New Workspace</CardTitle>
                </div>
                <CardDescription>
                  Start fresh with your own workspace and invite your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/register?action=create">Create Workspace</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle>Join Existing Workspace</CardTitle>
                </div>
                <CardDescription>
                  Connect with an existing team using an invite
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login?action=join">Join Workspace</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
