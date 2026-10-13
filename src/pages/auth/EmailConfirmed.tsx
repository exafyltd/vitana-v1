import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Panel as Card, PanelContent as CardContent, PanelHeader as CardHeader, PanelTitle as CardTitle } from "@/components/layout/spotlight/Panel";
import { ArchetypeSkeleton, ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useEmailConfirmation } from "@/hooks/useEmailConfirmation";
import { useRoleBasedRedirect } from "@/hooks/useSmartRouting";
import SEO from "@/components/SEO";
import { t } from '@/lib/i18n-toast';

const PAGE_BG = "bg-gradient-to-br from-primary/10 via-background to-secondary/10";

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const spotlight = useSpotlightEnabled();
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

  // VTID-05117: Spotlight on → every state renders inside the `form` archetype
  // (single form column, no rail); off → today's centred card.
  const frame = (content: ReactNode) =>
    spotlight ? (
      <ScreenFrame archetype="form" className={`min-h-screen ${PAGE_BG}`}>
        {content}
      </ScreenFrame>
    ) : (
      <div className={`min-h-screen flex items-center justify-center ${PAGE_BG} p-4`}>{content}</div>
    );

  if (isLoading) {
    return frame(
      <div className="w-full max-w-md">
        <ArchetypeSkeleton archetype="form" />
      </div>,
    );
  }

  if (error) {
    return frame(
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">{t('screens.auth.confirmationError')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline" className="w-full">
            {t('screens.auth.backSign')}
          </Button>
        </CardContent>
      </Card>,
    );
  }

  return (
    <>
      <SEO
        title={t('screens.auth.emailConfirmedVitanaHealthPlatform')}
        description="Your email has been successfully confirmed. Welcome to VITANA!"
      />
      {frame(
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-status-success-subtle flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-status-success" />
            </div>
            <CardTitle className="text-2xl font-bold text-status-success">
              {t('screens.auth.thankYouForJoiningVitana')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                {t('screens.auth.yourEmailHasSuccessfullyConfirmed')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('screens.auth.youLlRedirectedYourDashboardFew')}
              </p>
            </div>

            <div className="space-y-3">
              <Button onClick={handleContinue} className="w-full">
                {t('screens.auth.continueDashboard')}
                <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
              </Button>

              <div className="text-xs text-muted-foreground">
                {t('screens.auth.welcomeYourPersonalizedHealthIntelligencePlatform')}
              </div>
            </div>
          </CardContent>
        </Card>,
      )}
    </>
  );
}
