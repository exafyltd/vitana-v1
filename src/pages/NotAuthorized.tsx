import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { t } from '@/lib/i18n-toast';

export default function NotAuthorized() {
  return (
    <AppLayout>
      <SEO 
        title={t('screens.notauthorized.accessDeniedVitana')}
        description="You don't have permission to access this resource."
      />
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-destructive/10 border border-destructive/20">
                <Shield className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">{t('screens.notauthorized.accessDenied')}</CardTitle>
            <CardDescription>
              {t('screens.notauthorized.youDonTHavePermissionAccess')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {t('screens.notauthorized.error403Forbidden')}
              </p>
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('screens.notauthorized.returnDashboard')}
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/settings">
                    {t('screens.notauthorized.contactSupport')}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}