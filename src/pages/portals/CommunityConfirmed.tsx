import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Users } from "lucide-react";
import { useEmailConfirmation } from "@/hooks/useEmailConfirmation";
import { useRoleBasedRedirect } from "@/hooks/useSmartRouting";
import SEO from "@/components/SEO";

export default function CommunityConfirmed() {
  const navigate = useNavigate();
  const { isLoading, user, error } = useEmailConfirmation();
  const { getRedirectUrl } = useRoleBasedRedirect();

  useEffect(() => {
    if (user && !isLoading) {
      // Auto-redirect after 3 seconds
      const timer = setTimeout(() => {
        navigate(getRedirectUrl());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [user, isLoading, navigate, getRedirectUrl]);

  const handleContinue = () => {
    navigate(getRedirectUrl());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500/10 via-background to-purple-500/10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500/10 via-background to-purple-500/10 p-4">
        <Card className="w-full max-w-md border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Confirmation Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/community')} variant="outline" className="w-full">
              Back to Community Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Welcome to VITANA Community! - Email Confirmed"
        description="Your email has been confirmed. Welcome to the VITANA Community - connecting health-conscious individuals."
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500/10 via-background to-purple-500/10 p-4">
        <Card className="w-full max-w-md border-blue-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome to VITANA Community!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Your email has been successfully confirmed.
              </p>
              <p className="text-sm text-blue-600 font-medium">
                Join a community of health-conscious individuals
              </p>
              <p className="text-xs text-muted-foreground">
                You'll be redirected to your dashboard in a few seconds...
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleContinue} 
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <div className="text-xs text-muted-foreground">
                Connect, share, and grow together in your wellness journey
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}