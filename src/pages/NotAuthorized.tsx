import { Button } from "@/components/ui/button";
import { Panel as Card, PanelContent as CardContent, PanelDescription as CardDescription, PanelHeader as CardHeader, PanelTitle as CardTitle } from "@/components/layout/spotlight/Panel";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { t } from '@/lib/i18n-toast';

export default function NotAuthorized() {
  const spotlight = useSpotlightEnabled();

  const panel = (
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
                    <ArrowLeft className="h-4 w-4 me-2" />
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
  );

  return (
    <AppLayout>
      <SEO 
        title={t('screens.notauthorized.accessDeniedVitana')}
        description="You don't have permission to access this resource."
      />
      {spotlight ? (
        // Desktop Spotlight: the 403 panel in the `form` frame (one centred column).
        <ScreenFrame archetype="form">
          <div className="flex justify-center py-10">{panel}</div>
        </ScreenFrame>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-6">
          {panel}
        </div>
      )}
    </AppLayout>
  );
}
