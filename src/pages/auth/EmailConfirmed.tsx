import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useEmailConfirmation } from "@/hooks/useEmailConfirmation";
import { useRoleBasedRedirect } from "@/hooks/useSmartRouting";
import SEO from "@/components/SEO";
import { t } from '@/lib/i18n-toast';

export default function EmailConfirmed() {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">{t('screens.auth.confirmationError')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={t('screens.auth.emailConfirmedVitanaHealthPlatform')}
        description="Your email has been successfully confirmed. Welcome to VITANA!"
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              Thank you for joining VITANA!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Your email has been successfully confirmed.
              </p>
              <p className="text-sm text-muted-foreground">
                You'll be redirected to your dashboard in a few seconds...
              </p>
            </div>
            
            <div className="space-y-3">
              <Button onClick={handleContinue} className="w-full">
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <div className="text-xs text-muted-foreground">
                Welcome to your personalized health intelligence platform
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}