import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Panel as Card, PanelContent as CardContent, PanelHeader as CardHeader, PanelTitle as CardTitle } from "@/components/layout/spotlight/Panel";
import { ArchetypeSkeleton, ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Gift } from "lucide-react";
import { useEmailConfirmation } from "@/hooks/useEmailConfirmation";
import { useDiscountCode } from "@/hooks/useDiscountCode";
import { useTenant } from "@/hooks/useTenant";
import { useTranslation } from "@/hooks/useTranslation";
import { useRoleBasedRedirect } from "@/hooks/useSmartRouting";
import SEO from "@/components/SEO";
import { t } from '@/lib/i18n-toast';

const PAGE_BG = "bg-gradient-to-br from-ruby/10 via-background to-ruby/5";

export default function MaxinaConfirmed() {
  const navigate = useNavigate();
  const spotlight = useSpotlightEnabled();
  const { isLoading, user, error } = useEmailConfirmation();
  const { setTenantBySlug } = useTenant();
  const { getRedirectUrl } = useRoleBasedRedirect();
  const { discountCode, loading: discountLoading } = useDiscountCode('maxina');
  const { translate } = useTranslation();

  useEffect(() => {
    setTenantBySlug('maxina');

    if (user && !isLoading) {
      const timer = setTimeout(() => {
        navigate(getRedirectUrl());
      }, 5000); // extended to 5s so user can see discount code

      return () => clearTimeout(timer);
    }
  }, [user, isLoading, navigate, setTenantBySlug]);

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
      <Card className="w-full max-w-md border-ruby/20">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">{t('screens.portals.confirmationError')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/maxina')} variant="outline" className="w-full">
            {t('screens.portals.backMaxinaPortal')}
          </Button>
        </CardContent>
      </Card>,
    );
  }

  return (
    <>
      <SEO
        title={t('screens.portals.welcomeMaxinaEmailConfirmed')}
        description="Your email has been confirmed. Welcome to Maxina - your women's health companion."
      />
      {frame(
        <Card className="w-full max-w-md border-ruby/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-ruby/10 flex items-center justify-center">
              <Heart className="h-8 w-8 text-ruby" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-ruby to-category-4 bg-clip-text text-transparent">
              {t('screens.portals.welcomeMaxina')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                {t('screens.portals.yourEmailHasSuccessfullyConfirmed')}
              </p>
              <p className="text-sm text-ruby font-medium">
                {t('screens.portals.yourWomenSHealthJourneyStarts')}
              </p>
            </div>

            {/* Discount Code Card */}
            {!discountLoading && discountCode && (
              <div className="rounded-xl border-2 border-dashed border-ruby/30 bg-gradient-to-br from-ruby/5 to-ruby/10 p-5 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Gift className="h-5 w-5 text-ruby" />
                  <span className="text-sm font-semibold text-ruby">
                    {translate('discount.welcomeTitle')}
                  </span>
                </div>
                <div className="font-mono text-2xl font-extrabold tracking-widest text-ruby">
                  {discountCode.code}
                </div>
                <p className="text-sm text-muted-foreground">
                  {translate('discount.welcomeMessage')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {translate('discount.validFor')}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t('screens.portals.youLlRedirectedYourDashboardFew')}
              </p>
              <Button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-category-4 to-ruby text-primary-foreground hover:from-category-4/90 hover:to-ruby/90"
              >
                {t('screens.portals.continueDashboard')}
                <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
              </Button>

              <div className="text-xs text-muted-foreground">
                {t('screens.portals.empoweringWomenThroughPersonalizedHealthInsights')}
              </div>
            </div>
          </CardContent>
        </Card>,
      )}
    </>
  );
}
