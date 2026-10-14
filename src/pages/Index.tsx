import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useSmartRouting } from "@/hooks/useSmartRouting";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Panel as Card, PanelContent as CardContent, PanelDescription as CardDescription, PanelHeader as CardHeader, PanelTitle as CardTitle } from "@/components/layout/spotlight/Panel";
import { FrameWhen } from "@/components/layout/spotlight/FrameWhen";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { Heart, BookOpen, Shield, Terminal, ExternalLink, ShoppingBag } from "lucide-react";
import { getCommandHubUrl } from "@/config/devHub.config";
import { toast } from "sonner";
import { lookup, t } from '@/lib/i18n-toast';
import DelayedLoader from "@/components/ui/DelayedLoader";


const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { isExafyAdmin } = useTenant();
  const navigate = useNavigate();
  const spotlight = useSpotlightEnabled();
  const [searchParams] = useSearchParams();

  // Use smart routing to redirect authenticated users
  useSmartRouting();

  const handleMaxinaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Always show intro - users can skip if they want
    navigate(`/_intro/maxina${window.location.search || ''}`);
  };

  // Never paint the multi-tenant platform grid while auth is still resolving,
  // or for a signed-in user: useSmartRouting always redirects an authenticated
  // user away from "/" (currentRole defaults to 'community', so the redirect
  // cannot stall on role resolution). Painting the grid in that window was the
  // post-login "wrong screen flashes before the first MAXINA screen" bug —
  // loading must look like loading (spinner), never like a different screen.
  if (authLoading || user) {
    return <DelayedLoader fullscreen source="index" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to">
      <SEO title={t('screens.index.vitanaDigitalSolutions')} description="Welcome to VITANA. Choose your health platform and experience innovation in wellness." canonical={window.location.href} />
      
      {/* VTID-05117: Spotlight on → the portal choice in the `form` archetype column. */}
      <FrameWhen on={spotlight} archetype="form">
      <div className={spotlight ? "py-6" : "flex flex-col items-center justify-center min-h-screen p-6"}>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-6xl font-bold text-foreground mb-4">VITANA</h1>
          <p className="text-xl text-muted-foreground mb-8">
            {t('screens.index.digitalSolutionsForYourWellnessJourney')}
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
            {t('screens.index.chooseYourHealthPlatformExperienceInnovation')}
          </p>
          
          {/* Platform Selection */}
          <div className={spotlight ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"}>
            {/* Maxina Portal */}
            <div onClick={handleMaxinaClick}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Heart className="h-12 w-12 text-category-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-xl">Maxina</CardTitle>
                  <CardDescription>{t('screens.index.comprehensiveHealthWellnessPlatform')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.index.completeHealthcareSolutionsWithPatientprofessional')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AlKalma Portal */}
            <Link to="/alkalma">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <BookOpen className="h-12 w-12 text-category-3 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-xl">{t('screens.index.alkalma')}</CardTitle>
                  <CardDescription>{t('screens.index.culturallyawareHealthSolutions')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.index.healthWellnessServicesDesignedWithCultural')}
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Exafy Admin Portal */}
            <Link to="/exafy-admin">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group border-border">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Shield className="h-12 w-12 text-muted-foreground group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-xl text-foreground/80">{t('screens.index.exafyAdmin')}</CardTitle>
                  <CardDescription>{t('screens.index.systemAdministrationPortal')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.index.secureAccessForExafyAdministratorsManage')}
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Vitana DEV Portal - External Gateway Command Hub */}
            <a 
              href={getCommandHubUrl() || "#"}
              onClick={(e) => {
                const url = getCommandHubUrl();
                if (!url) {
                  e.preventDefault();
                  toast.error(lookup('toasts.index.vitanaDevGatewayUrlNotConfigured'), {
                    description: "VITE_GATEWAY_BASE must point to the Gateway Cloud Run service.",
                  });
                }
              }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group border-category-7/30 bg-gradient-to-br from-category-7/5 to-muted/50">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Terminal className="h-12 w-12 text-category-7 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-xl text-category-7 flex items-center justify-center gap-2">
                    {t('screens.index.vitanaDev')}
                    <ExternalLink className="h-4 w-4 opacity-50" />
                  </CardTitle>
                  <CardDescription>{t('screens.index.developerCommandHub')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.index.operateVitanaPlatformObserveEventsIssue')}
                  </p>
                </CardContent>
              </Card>
            </a>

            {/* Commerce Portal - Merchant self-service (VTID-03555) */}
            <Link to="/commerce-login">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group border-category-5/30 bg-gradient-to-br from-category-5/5 to-category-5/10">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <ShoppingBag className="h-12 w-12 text-category-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-xl text-category-5">{t('screens.index.commercePortal')}</CardTitle>
                  <CardDescription>{t('screens.index.merchantSelfServiceMarketplace')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.index.connectYourBusinessToDiscoverYourself')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Footer Info */}
          <div className="mt-12 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground">{t('screens.index.vitanaComprehensiveDigitalHealthPlatformOffering')}
            </p>
          </div>
        </div>
      </div>
      </FrameWhen>
    </div>
  );
};

export default Index;
