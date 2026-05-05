import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useSmartRouting } from "@/hooks/useSmartRouting";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, BookOpen, Leaf, Shield, Terminal, ExternalLink } from "lucide-react";
import { getCommandHubUrl } from "@/config/devHub.config";
import { toast } from "sonner";
import { lookup, t } from '@/lib/i18n-toast';


const Index = () => {
  const { user } = useAuth();
  const { isExafyAdmin } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Use smart routing to redirect authenticated users
  useSmartRouting();

  const handleMaxinaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Always show intro - users can skip if they want
    navigate(`/_intro/maxina${window.location.search || ''}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <SEO title={t('screens.index.vitanaDigitalSolutions')} description="Welcome to VITANA. Choose your health platform and experience innovation in wellness." canonical={window.location.href} />
      
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-6xl font-bold text-foreground mb-4">VITANA</h1>
          <p className="text-xl text-muted-foreground mb-8">
            {t('screens.index.digitalSolutionsForYourWellnessJourney')}
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
            {t('screens.index.chooseYourHealthPlatformExperienceInnovation')}
          </p>
          
          {/* Platform Selection */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {/* Maxina Portal */}
            <div onClick={handleMaxinaClick}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Heart className="h-12 w-12 text-[#FF7BAC] group-hover:scale-110 transition-transform" />
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
                    <BookOpen className="h-12 w-12 text-[#3B82F6] group-hover:scale-110 transition-transform" />
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

            {/* Earthlinks Portal */}
            <Link to="/earthlinks">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Leaf className="h-12 w-12 text-[#4ADE80] group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-xl">{t('screens.index.earthlinks')}</CardTitle>
                  <CardDescription>{t('screens.index.sustainableEcofriendlyWellness')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.index.naturefocusedHealthcareSustainableWellnessSolution')}
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* Exafy Admin Portal */}
            <Link to="/exafy-admin">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group border-slate-200">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Shield className="h-12 w-12 text-slate-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-xl text-slate-700">{t('screens.index.exafyAdmin')}</CardTitle>
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
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group border-blue-200 bg-gradient-to-br from-blue-50/50 to-slate-50/50">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Terminal className="h-12 w-12 text-blue-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-xl text-blue-700 flex items-center justify-center gap-2">
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
          </div>

          {/* Footer Info */}
          <div className="mt-12 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground">{t('screens.index.vitanaComprehensiveDigitalHealthPlatformOffering')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
