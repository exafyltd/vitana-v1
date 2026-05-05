import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { useEmailConfirmation } from "@/hooks/useEmailConfirmation";
import { useTenant } from "@/hooks/useTenant";
import { useRoleBasedRedirect } from "@/hooks/useSmartRouting";
import SEO from "@/components/SEO";
import { t } from '@/lib/i18n-toast';

export default function AlkalmaConfirmed() {
  const navigate = useNavigate();
  const { isLoading, user, error } = useEmailConfirmation();
  const { setTenantBySlug } = useTenant();
  const { getRedirectUrl } = useRoleBasedRedirect();

  useEffect(() => {
    // Set tenant context
    setTenantBySlug('alkalma');
    
    if (user && !isLoading) {
      // Auto-redirect after 3 seconds
      const timer = setTimeout(() => {
        navigate(getRedirectUrl());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [user, isLoading, navigate, setTenantBySlug]);

  const handleContinue = () => {
    navigate(getRedirectUrl());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500/10 via-background to-indigo-500/10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500/10 via-background to-indigo-500/10 p-4">
        <Card className="w-full max-w-md border-purple-200">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">{t('screens.portals.confirmationError')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/alkalma')} variant="outline" className="w-full">
              {t('screens.portals.backAlkalmaPortal')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="أهلاً بك في الكلمة! - تم تأكيد البريد الإلكتروني"
        description="تم تأكيد بريدك الإلكتروني. أهلاً بك في الكلمة - منصة الصحة باللغة العربية."
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500/10 via-background to-indigo-500/10 p-4">
        <Card className="w-full max-w-md border-purple-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              أهلاً بك في الكلمة!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                تم تأكيد بريدك الإلكتروني بنجاح
              </p>
              <p className="text-sm text-purple-600 font-medium">
                رحلتك الصحية باللغة العربية تبدأ الآن
              </p>
              <p className="text-xs text-muted-foreground">
                سيتم توجيهك إلى لوحة التحكم خلال ثوانٍ قليلة...
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleContinue} 
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
              >
                متابعة إلى لوحة التحكم
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <div className="text-xs text-muted-foreground">
                منصة صحية شاملة باللغة العربية
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}