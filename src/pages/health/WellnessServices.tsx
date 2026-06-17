import { useUrlTab } from "@/hooks/useUrlTab";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { ServicesMasterActionPopup } from "@/components/ServicesMasterActionPopup";
import { ServiceDetailSplitScreen } from "@/components/ui/split-screen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import ServiceDetailDrawer from "@/components/health/ServiceDetailDrawer";
import { healthNavigation } from "@/config/navigation";
import { Stethoscope, Users, Target, Shield, Heart, Activity, Calendar, TestTube, UserCheck, Phone, FileText, CreditCard, Clock, Star, MessageSquare, TestTube2, Microscope, Package, Plane, Apple, Dumbbell, Brain, Briefcase, BookOpen, Plus } from "lucide-react";
import { t } from '@/lib/i18n-toast';

const servicesData = {
  preventiveCare: [
    { id: "CT-301", titleKey: "screens.health.svc_annualPhysical_title", descKey: "screens.health.svc_annualPhysical_desc", icon: Stethoscope, color: "from-emerald-500/20 to-green-500/20", vitanaImpact: "+25 points" },
    { id: "CT-302", titleKey: "screens.health.svc_cancerScreening_title", descKey: "screens.health.svc_cancerScreening_desc", icon: Microscope, color: "from-blue-500/20 to-cyan-500/20", vitanaImpact: "+30 points" },
    { id: "CT-303", titleKey: "screens.health.svc_cardio_title", descKey: "screens.health.svc_cardio_desc", icon: Heart, color: "from-red-500/20 to-pink-500/20", vitanaImpact: "+35 points" },
    { id: "CT-304", titleKey: "screens.health.svc_metabolic_title", descKey: "screens.health.svc_metabolic_desc", icon: TestTube2, color: "from-purple-500/20 to-violet-500/20", vitanaImpact: "+30 points" }
  ],
  medicalServices: [
    { id: "CT-305", titleKey: "screens.health.svc_specialist_title", descKey: "screens.health.svc_specialist_desc", icon: UserCheck, color: "from-blue-500/20 to-indigo-500/20", vitanaImpact: "+20 points" },
    { id: "CT-306", titleKey: "screens.health.svc_telemedicine_title", descKey: "screens.health.svc_telemedicine_desc", icon: Phone, color: "from-green-500/20 to-emerald-500/20", vitanaImpact: "+15 points" },
    { id: "CT-307", titleKey: "screens.health.svc_labTests_title", descKey: "screens.health.svc_labTests_desc", icon: TestTube, color: "from-purple-500/20 to-violet-500/20", vitanaImpact: "+25 points" },
    { id: "CT-308", titleKey: "screens.health.svc_prescription_title", descKey: "screens.health.svc_prescription_desc", icon: Package, color: "from-orange-500/20 to-amber-500/20", vitanaImpact: "+20 points" }
  ],
  wellnessPrograms: [
    { id: "CT-309", titleKey: "screens.health.svc_nutritionCoaching_title", descKey: "screens.health.svc_nutritionCoaching_desc", icon: Apple, color: "from-orange-500/20 to-amber-500/20", vitanaImpact: "+20 points" },
    { id: "CT-310", titleKey: "screens.health.svc_fitnessTraining_title", descKey: "screens.health.svc_fitnessTraining_desc", icon: Dumbbell, color: "from-blue-500/20 to-indigo-500/20", vitanaImpact: "+30 points" },
    { id: "CT-311", titleKey: "screens.health.svc_mentalCoach_title", descKey: "screens.health.svc_mentalCoach_desc", icon: Brain, color: "from-purple-500/20 to-pink-500/20", vitanaImpact: "+25 points" },
    { id: "CT-312", titleKey: "screens.health.svc_wellnessChallenge_title", descKey: "screens.health.svc_wellnessChallenge_desc", icon: Target, color: "from-cyan-500/20 to-blue-500/20", suggestionKey: "screens.health.svc_wellnessChallenge_suggestion", vitanaImpact: "+40 points" }
  ],
  insuranceSupport: [
    { id: "CT-313", titleKey: "screens.health.svc_claimsProcessing_title", descKey: "screens.health.svc_claimsProcessing_desc", icon: FileText, color: "from-blue-500/20 to-cyan-500/20", vitanaImpact: "+10 points" },
    { id: "CT-314", titleKey: "screens.health.svc_coverageVerification_title", descKey: "screens.health.svc_coverageVerification_desc", icon: Shield, color: "from-green-500/20 to-emerald-500/20", vitanaImpact: "+5 points" },
    { id: "CT-315", titleKey: "screens.health.svc_preAuth_title", descKey: "screens.health.svc_preAuth_desc", icon: Briefcase, color: "from-purple-500/20 to-violet-500/20", vitanaImpact: "+15 points" },
    { id: "CT-316", titleKey: "screens.health.svc_paymentPlans_title", descKey: "screens.health.svc_paymentPlans_desc", icon: CreditCard, color: "from-orange-500/20 to-amber-500/20", vitanaImpact: "+5 points" }
  ],
  myServices: [
    { id: "CT-317", titleKey: "screens.health.svc_appointments_title", descKey: "screens.health.svc_appointments_desc", icon: Calendar, color: "from-green-500/20 to-emerald-500/20", countKey: "screens.health.svc_appointments_count" },
    { id: "CT-318", titleKey: "screens.health.svc_serviceHistory_title", descKey: "screens.health.svc_serviceHistory_desc", icon: Clock, color: "from-blue-500/20 to-cyan-500/20", countKey: "screens.health.svc_serviceHistory_count" },
    { id: "CT-319", titleKey: "screens.health.svc_myProviders_title", descKey: "screens.health.svc_myProviders_desc", icon: Users, color: "from-purple-500/20 to-violet-500/20", countKey: "screens.health.svc_myProviders_count" },
    { id: "CT-320", titleKey: "screens.health.svc_healthRecords_title", descKey: "screens.health.svc_healthRecords_desc", icon: BookOpen, color: "from-orange-500/20 to-amber-500/20" }
  ]
};

export default function WellnessServices() {
  const [activeSection, setActiveSection] = useUrlTab("tab", "preventiveCare");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [servicesActionsOpen, setServicesActionsOpen] = useState(false);
  const { translate } = useTranslation();

  const handleServiceClick = (service: any) => {
    setSelectedService(service);
    setDrawerOpen(true);
  };

  const renderServiceCards = (services: any[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card 
            key={service.id} 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => handleServiceClick(service)}
          >
            <CardHeader className="pb-4">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-4`}>
                <service.icon className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{t(service.titleKey)}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {t(service.descKey)}
                  </CardDescription>
                </div>
                {service.vitanaImpact && (
                  <Badge variant="secondary" className="ml-2 text-xs bg-emerald-100 text-emerald-700">
                    {service.vitanaImpact}
                  </Badge>
                )}
                {service.countKey && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {t(service.countKey)}
                  </Badge>
                )}
              </div>
              {service.suggestionKey && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">{t(service.suggestionKey)}</p>
                </div>
              )}
              <div className="flex gap-2 pt-3">
                <Button size="sm" className="flex-1" onClick={(e) => e.stopPropagation()}>
                  {t('screens.health.book')}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={(e) => e.stopPropagation()}>
                  {t('screens.health.addPlan')}
                </Button>
                <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                  {t('screens.health.askAi')}
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <SEO title={t('screens.health.servicesHubHealth')} description="Access comprehensive healthcare and wellness services" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.health.servicesHub')}
            description="Book appointments, screenings, and wellness programs tailored to your needs."
            emoji="🏥"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={translate('wellnessServices.searchPlaceholder', 'Search services, providers, or programs...')} />
            <UniversalCalendarButton />
            <Button
              variant="default"
              size="sm"
              onClick={() => setServicesActionsOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('screens.health.serviceActions')}
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeSection} onValueChange={setActiveSection} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="preventiveCare">{t('screens.health.preventiveCare')}</SplitBarTrigger>
              <SplitBarTrigger value="medicalServices">{t('screens.health.medicalServices')}</SplitBarTrigger>
              <SplitBarTrigger value="wellnessPrograms">{t('screens.health.wellnessPrograms')}</SplitBarTrigger>
              <SplitBarTrigger value="insuranceSupport">{t('screens.health.insuranceSupport')}</SplitBarTrigger>
              <SplitBarTrigger value="myServices">{t('screens.health.myServices')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="preventiveCare">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{t('screens.health.earlyDetectionPreventionServicesMaintainOptimal')}</p>
                </div>
                {renderServiceCards(servicesData.preventiveCare)}
              </div>
            </SplitBarContent>

            <SplitBarContent value="medicalServices">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{t('screens.health.professionalMedicalServicesConsultations')}</p>
                </div>
                {renderServiceCards(servicesData.medicalServices)}
              </div>
            </SplitBarContent>

            <SplitBarContent value="wellnessPrograms">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{t('screens.health.personalizedWellnessProgramsForLastingLifestyle')}</p>
                </div>
                {renderServiceCards(servicesData.wellnessPrograms)}
              </div>
            </SplitBarContent>

            <SplitBarContent value="insuranceSupport">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{t('screens.health.insuranceBillingSupportServices')}</p>
                </div>
                {renderServiceCards(servicesData.insuranceSupport)}
              </div>
            </SplitBarContent>

            <SplitBarContent value="myServices">
              <div className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{t('screens.health.manageYourPersonalServicesAppointments')}</p>
                </div>
                {renderServiceCards(servicesData.myServices)}
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <ServiceDetailDrawer
        service={selectedService}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
      
      <ServicesMasterActionPopup
        open={servicesActionsOpen}
        onOpenChange={setServicesActionsOpen}
      />
    </AppLayout>
  );
}