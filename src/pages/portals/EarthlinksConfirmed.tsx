import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Leaf } from "lucide-react";
import { useEmailConfirmation } from "@/hooks/useEmailConfirmation";
import { useTenant } from "@/hooks/useTenant";
import { useRoleBasedRedirect } from "@/hooks/useSmartRouting";
import SEO from "@/components/SEO";

export default function EarthlinksConfirmed() {
  const navigate = useNavigate();
  const { isLoading, user, error } = useEmailConfirmation();
  const { setTenantBySlug } = useTenant();
  const { getRedirectUrl } = useRoleBasedRedirect();

  // VTID-01985: Earthlinks is retired. Only Exafy admins may reach this
  // confirmation page. Anyone else gets redirected straight to '/'.
  const isExafyAdmin = user?.app_metadata?.exafy_admin === true;

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isExafyAdmin) {
      navigate('/', { replace: true });
      return;
    }
    // Admins: leave them on the page; auto-redirect to dashboard after 3s.
    const timer = setTimeout(() => {
      navigate(getRedirectUrl());
    }, 3000);
    return () => clearTimeout(timer);
  }, [user, isLoading, isExafyAdmin, navigate, getRedirectUrl]);

  const handleContinue = () => {
    navigate(getRedirectUrl());
  };

  // Loader covers: loading email confirmation, no user yet, or non-admin
  // user being redirected away.
  if (isLoading || !user || !isExafyAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500/10 via-background to-emerald-500/10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500/10 via-background to-emerald-500/10 p-4">
        <Card className="w-full max-w-md border-green-200">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Confirmation Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/earthlinks')} variant="outline" className="w-full">
              Back to Earthlinks Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Welcome to Earthlinks! - Email Confirmed"
        description="Your email has been confirmed. Welcome to Earthlinks - your sustainable wellness platform."
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500/10 via-background to-emerald-500/10 p-4">
        <Card className="w-full max-w-md border-green-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Leaf className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Welcome to Earthlinks!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Your email has been successfully confirmed.
              </p>
              <p className="text-sm text-green-600 font-medium">
                Your sustainable wellness journey begins now
              </p>
              <p className="text-xs text-muted-foreground">
                You'll be redirected to your dashboard in a few seconds...
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleContinue} 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <div className="text-xs text-muted-foreground">
                Connecting health with environmental sustainability
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}