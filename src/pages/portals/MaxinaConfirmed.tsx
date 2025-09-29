import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Heart } from "lucide-react";
import { useEmailConfirmation } from "@/hooks/useEmailConfirmation";
import { useTenant } from "@/hooks/useTenant";
import SEO from "@/components/SEO";

export default function MaxinaConfirmed() {
  const navigate = useNavigate();
  const { isLoading, user, error } = useEmailConfirmation();
  const { setTenantBySlug } = useTenant();

  useEffect(() => {
    // Set tenant context
    setTenantBySlug('maxina');
    
    if (user && !isLoading) {
      // Auto-redirect after 3 seconds
      const timer = setTimeout(() => {
        navigate('/home');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [user, isLoading, navigate, setTenantBySlug]);

  const handleContinue = () => {
    navigate('/home');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500/10 via-background to-rose-500/10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500/10 via-background to-rose-500/10 p-4">
        <Card className="w-full max-w-md border-pink-200">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Confirmation Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/maxina')} variant="outline" className="w-full">
              Back to Maxina Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Welcome to Maxina! - Email Confirmed"
        description="Your email has been confirmed. Welcome to Maxina - your women's health companion."
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-500/10 via-background to-rose-500/10 p-4">
        <Card className="w-full max-w-md border-pink-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-pink-100 flex items-center justify-center">
              <Heart className="h-8 w-8 text-pink-600" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              Welcome to Maxina!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Your email has been successfully confirmed.
              </p>
              <p className="text-sm text-pink-600 font-medium">
                Your women's health journey starts now
              </p>
              <p className="text-xs text-muted-foreground">
                You'll be redirected to your dashboard in a few seconds...
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleContinue} 
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
              >
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <div className="text-xs text-muted-foreground">
                Empowering women through personalized health insights
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}