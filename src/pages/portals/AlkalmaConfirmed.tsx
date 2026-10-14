import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Panel as Card, PanelContent as CardContent, PanelHeader as CardHeader, PanelTitle as CardTitle } from "@/components/layout/spotlight/Panel";
import { ArchetypeSkeleton, ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEmailConfirmation } from "@/hooks/useEmailConfirmation";
import { useTenant } from "@/hooks/useTenant";
import { useRoleBasedRedirect } from "@/hooks/useSmartRouting";
import SEO from "@/components/SEO";
import { t } from '@/lib/i18n-toast';

const PAGE_BG = "bg-gradient-to-br from-category-2/10 via-background to-category-3/10";

export default function AlkalmaConfirmed() {
  const navigate = useNavigate();
  const spotlight = useSpotlightEnabled();
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
      <Card className="w-full max-w-md border-category-2/30">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">{t('screens.portals.confirmationError')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/alkalma')} variant="outline" className="w-full">
            {t('screens.portals.backAlkalmaPortal')}
          </Button>
        </CardContent>
      </Card>,
    );
  }

  return (
    <>
      <SEO
        title="أهلاً بك في الكلمة! - تم تأكيد البريد الإلكتروني"
        description="تم تأكيد بريدك الإلكتروني. أهلاً بك في الكلمة - منصة الصحة باللغة العربية."
      />
      {frame(
        <Card className="w-full max-w-md border-category-2/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-category-2/15 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-category-2" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-category-2 to-category-3 bg-clip-text text-transparent">
              أهلاً بك في الكلمة!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                تم تأكيد بريدك الإلكتروني بنجاح
              </p>
              <p className="text-sm text-category-2 font-medium">
                رحلتك الصحية باللغة العربية تبدأ الآن
              </p>
              <p className="text-xs text-muted-foreground">
                سيتم توجيهك إلى لوحة التحكم خلال ثوانٍ قليلة...
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-category-2 to-category-3 text-primary-foreground hover:from-category-2/90 hover:to-category-3/90"
              >
                متابعة إلى لوحة التحكم
                <ArrowRight className="ms-2 h-4 w-4" />
              </Button>

              <div className="text-xs text-muted-foreground">
                منصة صحية شاملة باللغة العربية
              </div>
            </div>
          </CardContent>
        </Card>,
      )}
    </>
  );
}
